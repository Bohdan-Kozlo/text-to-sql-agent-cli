import mysql from 'mysql'

import {DbAdapter, DbConnectionConfig, QueryResult, TableColumn, TableInfo} from '../types.js'

interface MySQLColumnRow {
  COLUMN_DEFAULT?: string
  COLUMN_KEY: string
  COLUMN_NAME: string
  DATA_TYPE: string
  IS_NULLABLE: string
  REFERENCED_COLUMN_NAME?: string
  REFERENCED_TABLE_NAME?: string
}

export class MySQLAdapter implements DbAdapter {
  private connected = false
  private connection: mysql.Connection | null = null

  async connect(config: DbConnectionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection = mysql.createConnection({
        database: config.database,
        host: config.host,
        password: config.password,
        port: config.port,
        ssl: config.ssl ? {rejectUnauthorized: false} : undefined,
        user: config.user,
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

    const tablePromises = tables.rows.map(async (table) => {
      const tableName = table.TABLE_NAME as string

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
      const columns: TableColumn[] = columnsResult.rows.map((row) => {
        const mysqlRow = row as unknown as MySQLColumnRow
        return {
          default: mysqlRow.COLUMN_DEFAULT || undefined,
          foreignKey: mysqlRow.REFERENCED_TABLE_NAME
            ? {
                column: String(mysqlRow.REFERENCED_COLUMN_NAME),
                table: String(mysqlRow.REFERENCED_TABLE_NAME),
              }
            : undefined,
          name: String(mysqlRow.COLUMN_NAME),
          nullable: mysqlRow.IS_NULLABLE === 'YES',
          primaryKey: mysqlRow.COLUMN_KEY === 'PRI',
          type: String(mysqlRow.DATA_TYPE),
        }
      })

      return {
        columns,
        name: String(tableName),
      }
    })

    return Promise.all(tablePromises)
  }

  isConnected(): boolean {
    return this.connected && this.connection !== null
  }

  async runQuery(query: string): Promise<QueryResult> {
    return this.query(query)
  }

  private async query(sql: string, params?: string[]): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Database not connected')
    }

    return new Promise((resolve, reject) => {
      this.connection!.query(sql, params, (error, results, fields) => {
        if (error) {
          reject(new Error(`Query execution failed: ${error.message}`))
        } else {
          resolve({
            fields: fields as Record<string, unknown>[] | undefined,
            rowCount: Array.isArray(results) ? results.length : 1,
            rows: Array.isArray(results) ? results as Record<string, unknown>[] : [results as Record<string, unknown>],
          })
        }
      })
    })
  }
}
