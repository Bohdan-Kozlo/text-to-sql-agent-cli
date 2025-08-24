import {Command, Flags} from '@oclif/core'

import type {TableInfo} from '../database/types.js'

import {connectToDatabase} from '../database/index.js'
import {getDbUrl} from '../utils/config.js'

export default class Schema extends Command {
  static override description = 'Print database schema (tables and columns) and list relationships between tables.'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    json: Flags.boolean({description: 'Output schema as JSON'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Schema)

    const dbUrl = getDbUrl()
    const adapter = await connectToDatabase(dbUrl)

    try {
      this.log('Fetching schema...')
      const schema = await adapter.getSchema()

      if (!schema || schema.length === 0) {
        this.log('No tables found.')
        return
      }

      if (flags.json) {
        this.log(JSON.stringify(schema, null, 2))
      } else {
        this.printSchema(schema)
        this.printRelationships(schema)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.log('Failed to load schema:')
      this.log(msg)
      this.exit(1)
    } finally {
      await adapter.disconnect()
    }
  }

  private printRelationships(schema: TableInfo[]): void {
    const rels: {fromCol: string; fromTable: string; toCol: string; toTable: string}[] = []

    for (const table of schema) {
      for (const col of table.columns) {
        if (col.foreignKey) {
          rels.push({
            fromCol: col.name,
            fromTable: table.name,
            toCol: col.foreignKey.column,
            toTable: col.foreignKey.table,
          })
        }
      }
    }

    if (rels.length === 0) {
      this.log('\nRelationships: (none found)')
      return
    }

    this.log('\nRelationships:')
    for (const r of rels) {
      this.log(` - ${r.fromTable}.${r.fromCol} -> ${r.toTable}.${r.toCol}`)
    }
  }

  private printSchema(schema: TableInfo[]): void {
    for (const table of schema) {
      this.log(`\nTable: ${table.name}`)
      for (const col of table.columns) {
        const parts: string[] = []
        parts.push(`${col.name}`, `${col.type}`)

        if (col.primaryKey) parts.push('PK')

        if (!col.nullable) parts.push('NOT NULL')

        if (col.default !== undefined) parts.push(`DEFAULT ${col.default}`)

        if (col.foreignKey) parts.push(`FK -> ${col.foreignKey.table}.${col.foreignKey.column}`)

        this.log(`  - ${parts.join(' | ')}`)
      }
    }
  }
}
