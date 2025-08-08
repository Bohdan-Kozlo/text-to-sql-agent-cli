import {Command, Flags} from '@oclif/core'
import pkg from 'enquirer'
const {prompt} = pkg
import {getDbUrl} from '../utils/config.js'
import {connectToDatabase, getDatabaseTypeFromUrl} from '../database/index.js'
import {getGeminiModel} from '../llm/client.js'
import {generateSql} from '../llm/sql.js'
import {generateAnswer} from '../llm/answer.js'
import {formatTable} from '../utils/table.js'

export default class Ask extends Command {
  static override description = 'Ask a question about your database; LLM generates SQL, executes it, and answers.'
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --q "How many users signed up last week?"',
  ]
  static override flags = {
    q: Flags.string({char: 'q', description: 'Natural language question', required: false}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Ask)
    let question = flags.q?.trim()

    if (!question) {
      const response = await prompt<{question: string}>({
        type: 'input',
        name: 'question',
        message: 'What would you like to know about your database?',
        validate: (value: string) => {
          if (!value.trim()) {
            return 'Question cannot be empty'
          }
          return true
        },
      })

      question = response.question.trim()
    }

    if (!question) {
      this.error('Question is required')
    }

    let sql: string | undefined
    const dbUrl = getDbUrl()
    const dbType = getDatabaseTypeFromUrl(dbUrl)
    const adapter = await connectToDatabase(dbUrl)

    try {
      this.log('Fetching schema...')
      const schema = await adapter.getSchema()

      if (!schema || schema.length === 0) {
        throw new Error(
          'No tables found in database schema. Ensure your database has tables and the user has access to them.',
        )
      }

      const model = getGeminiModel()
      this.log('Generating SQL with LLM...')
      sql = await generateSql(model, question, schema, dbType)

      if (!sql) {
        this.error('LLM did not return SQL query')
      }
      this.log('SQL generated:')
      this.log(sql)

      const start = Date.now()
      const result = await adapter.runQuery(sql)
      const elapsed = Date.now() - start

      this.log('\nResult preview:')
      this.log(formatTable(result.rows.slice(0, 20)))

      this.log('\nGenerating final answer...')
      const answer = await generateAnswer(model, question, sql, result.rows, result.rowCount)

      this.log('\nAnswer:')
      this.log(answer)
      this.log(`\n(rows: ${result.rowCount}, time: ${elapsed}ms)`)
    } finally {
      await adapter.disconnect()
    }
  }
}
