export interface TableColumn {
  default?: string
  foreignKey?: {
    column: string
    table: string
  }
  name: string
  nullable: boolean
  primaryKey?: boolean
  type: string
}

export interface TableInfo {
  columns: TableColumn[]
  name: string
}

export interface QueryResult {
  fields?: Record<string, unknown>[]
  rowCount: number
  rows: Record<string, unknown>[]
}

export interface DbConnectionConfig {
  database: string
  host: string
  password: string
  port: number
  ssl?: boolean
  user: string
}

export type DatabaseType = 'mssql' | 'mysql' | 'postgresql'

export interface DbAdapter {
  connect(config: DbConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  getSchema(): Promise<TableInfo[]>
  isConnected(): boolean
  runQuery(query: string): Promise<QueryResult>
}
