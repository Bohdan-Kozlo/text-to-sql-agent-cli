export interface TableColumn {
  name: string
  type: string
  nullable: boolean
  default?: string
  primaryKey?: boolean
  foreignKey?: {
    table: string
    column: string
  }
}

export interface TableInfo {
  name: string
  columns: TableColumn[]
}

export interface QueryResult {
  rows: any[]
  rowCount: number
  fields?: any[]
}

export interface DbConnectionConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

export type DatabaseType = 'postgresql' | 'mysql' | 'mssql'

export interface DbAdapter {
  connect(config: DbConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  getSchema(): Promise<TableInfo[]>
  runQuery(query: string): Promise<QueryResult>
  isConnected(): boolean
}
