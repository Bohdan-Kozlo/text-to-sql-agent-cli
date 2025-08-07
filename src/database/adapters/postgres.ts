import {Client} from 'pg'
import {DbAdapter, DbConnectionConfig, TableInfo, QueryResult, TableColumn} from '../types.js'

export class PostgresAdapter implements DbAdapter {
  private client: Client | null = null
  private connected = false

  async connect(config: DbConnectionConfig): Promise<void> {
    try {
      this.client = new Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? {rejectUnauthorized: false} : false,
      })

      await this.client.connect()
      this.connected = true
    } catch (error) {
      this.connected = false
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end()
      this.client = null
      this.connected = false
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  async getSchema(): Promise<TableInfo[]> {
    if (!this.client) {
      throw new Error('Database not connected')
    }

    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    const tablesResult = await this.client.query(tablesQuery)
    const tables: TableInfo[] = []

    for (const table of tablesResult.rows) {
      const tableName = table.table_name

      const columnsQuery = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          fk.foreign_table_name,
          fk.foreign_column_name
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        LEFT JOIN (
          SELECT 
            ku.table_name,
            ku.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name
          JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
        WHERE c.table_name = $1
        ORDER BY c.ordinal_position
      `

      const columnsResult = await this.client.query(columnsQuery, [tableName])
      const columns: TableColumn[] = columnsResult.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default || undefined,
        primaryKey: row.is_primary_key,
        foreignKey: row.foreign_table_name
          ? {
              table: row.foreign_table_name,
              column: row.foreign_column_name,
            }
          : undefined,
      }))

      tables.push({
        name: tableName,
        columns,
      })
    }

    return tables
  }

  async runQuery(query: string): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Database not connected')
    }

    try {
      const result = await this.client.query(query)
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields,
      }
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
