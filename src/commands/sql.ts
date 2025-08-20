import {Command, Flags} from '@oclif/core'
import pkg from 'enquirer'
const {prompt} = pkg
import {getDbUrl} from '../utils/config.js'
import {connectToDatabase, getDatabaseTypeFromUrl} from '../database/index.js'
import {getGeminiModel} from '../llm/client.js'
import {explainAndFixSql} from '../llm/fix.js'
import {formatTable} from '../utils/table.js'

export default class Sql extends Command {
  static override description = 'Execute a SQL script against the configured database.'
  static override examples = [
    '<%= config.bin %> <%= command.id %> --sql "SELECT 1"',
    '<%= config.bin %> <%= command.id %>',
  ]
  static override flags = {
    sql: Flags.string({description: 'SQL to execute'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Sql)
    let sql = flags.sql?.trim()

    if (!sql) {
      const response = await prompt<{sql: string}>({
        type: 'input',
        name: 'sql',
        message: 'Enter SQL to execute:',
        validate: (value: string) => (value.trim() ? true : 'SQL cannot be empty'),
      })
      sql = response.sql.trim()
    }

    const dbUrl = getDbUrl()
    const dbType = getDatabaseTypeFromUrl(dbUrl)
    const adapter = await connectToDatabase(dbUrl)

    try {
      const start = Date.now()
      const result = await adapter.runQuery(sql)
      const elapsed = Date.now() - start

      this.log('\nResult:')
      this.log(formatTable(result.rows.slice(0, 50)))
      this.log(`\nRows: ${result.rowCount}  Time: ${elapsed}ms`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.handleSqlErrorWithLlm(sql, message, dbType)

      this.exit(1)
    } finally {
      await adapter.disconnect()
    }
  }

  private async handleSqlErrorWithLlm(
    sql: string,
    message: string,
    dbType: 'postgresql' | 'mysql' | 'mssql',
  ): Promise<void> {
    this.log('SQL execution failed:')
    this.log(message)

    const model = getGeminiModel()
    this.log('\nAsking LLM to explain and fix the SQL...')
    try {
      const {explanation, fixedSql} = await explainAndFixSql(model, sql, message, dbType)
      if (explanation) {
        this.log('\nLLM Explanation:')
        this.log(explanation)
      }
      if (fixedSql) {
        this.log('\nSuggested fixed SQL:')
        this.log(fixedSql)
      }
    } catch (llmErr) {
      const llmMsg = llmErr instanceof Error ? llmErr.message : String(llmErr)
      this.log('\nLLM assistance failed:')
      this.log(llmMsg)
    }
  }
}
