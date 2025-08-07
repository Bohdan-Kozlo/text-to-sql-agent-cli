import mysql from 'mysql'
import {DbAdapter, DbConnectionConfig, TableInfo, QueryResult, TableColumn} from '../types.js'

export class MySQLAdapter implements DbAdapter {
  private connection: mysql.Connection | null = null
  private connected = false

  async connect(config: DbConnectionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection = mysql.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? {rejectUnauthorized: false} : undefined,
      })

      this.connection.connect((error) => {
        if (error) {
          this.connected = false
          reject(new Error(`Failed to connect to MySQL: ${error.message}`))
        } else {
          this.connected = true
          resolve()
        }
      })
    })
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.connection) {
        this.connection.end(() => {
          this.connection = null
          this.connected = false
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  isConnected(): boolean {
    return this.connected && this.connection !== null
  }

  async getSchema(): Promise<TableInfo[]> {
    if (!this.connection) {
      throw new Error('Database not connected')
    }

    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `

    const tables = await this.query(tablesQuery)
    const result: TableInfo[] = []

    for (const table of tables.rows) {
      const tableName = table.TABLE_NAME

      const columnsQuery = `
        SELECT 
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT,
          c.COLUMN_KEY,
          kcu.REFERENCED_TABLE_NAME,
          kcu.REFERENCED_COLUMN_NAME
        FROM information_schema.COLUMNS c
        LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu 
          ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA 
          AND c.TABLE_NAME = kcu.TABLE_NAME 
          AND c.COLUMN_NAME = kcu.COLUMN_NAME
          AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
        WHERE c.TABLE_SCHEMA = DATABASE() 
        AND c.TABLE_NAME = ?
        ORDER BY c.ORDINAL_POSITION
      `

      const columnsResult = await this.query(columnsQuery, [tableName])
      const columns: TableColumn[] = columnsResult.rows.map((row) => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        nullable: row.IS_NULLABLE === 'YES',
        default: row.COLUMN_DEFAULT || undefined,
        primaryKey: row.COLUMN_KEY === 'PRI',
        foreignKey: row.REFERENCED_TABLE_NAME
          ? {
              table: row.REFERENCED_TABLE_NAME,
              column: row.REFERENCED_COLUMN_NAME,
            }
          : undefined,
      }))

      result.push({
        name: tableName,
        columns,
      })
    }

    return result
  }

  async runQuery(query: string): Promise<QueryResult> {
    return this.query(query)
  }

  private async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Database not connected')
    }

    return new Promise((resolve, reject) => {
      this.connection!.query(sql, params, (error, results, fields) => {
        if (error) {
          reject(new Error(`Query execution failed: ${error.message}`))
        } else {
          resolve({
            rows: Array.isArray(results) ? results : [results],
            rowCount: Array.isArray(results) ? results.length : 1,
            fields,
          })
        }
      })
    })
  }
}
