import sql from 'mssql'

import {DbAdapter, DbConnectionConfig, QueryResult, TableColumn, TableInfo} from '../types.js'

export class MSSQLAdapter implements DbAdapter {
  private connected = false
  private pool: null | sql.ConnectionPool = null

  async connect(config: DbConnectionConfig): Promise<void> {
    try {
      const sqlConfig: sql.config = {
        database: config.database,
        options: {
          encrypt: config.ssl || false,
          trustServerCertificate: true,
        },
        password: config.password,
        port: config.port,
        server: config.host,
        user: config.user,
      }

      this.pool = new sql.ConnectionPool(sqlConfig)
      await this.pool.connect()
      this.connected = true
    } catch (error) {
      this.connected = false
      throw new Error(`Failed to connect to MSSQL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close()
      this.pool = null
      this.connected = false
    }
  }

  async getSchema(): Promise<TableInfo[]> {
    if (!this.pool) {
      throw new Error('Database not connected')
    }

    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `

    const tablesResult = await this.pool.request().query(tablesQuery)

    const tablePromises = tablesResult.recordset.map(async (table) => {
      const tableName = table.TABLE_NAME as string

      const columnsQuery = `
        SELECT 
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT,
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY,
          fk.REFERENCED_TABLE_NAME,
          fk.REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN (
          SELECT ku.TABLE_NAME, ku.COLUMN_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
            ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
        LEFT JOIN (
          SELECT 
            ku.TABLE_NAME,
            ku.COLUMN_NAME,
            ccu.TABLE_NAME AS REFERENCED_TABLE_NAME,
            ccu.COLUMN_NAME AS REFERENCED_COLUMN_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
            ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
            ON ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
          WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
        ) fk ON c.TABLE_NAME = fk.TABLE_NAME AND c.COLUMN_NAME = fk.COLUMN_NAME
        WHERE c.TABLE_NAME = @tableName
        ORDER BY c.ORDINAL_POSITION
      `

      const request = this.pool!.request()
      request.input('tableName', sql.VarChar, tableName)
      const columnsResult = await request.query(columnsQuery)

      const columns: TableColumn[] = columnsResult.recordset.map((row) => ({
        default: row.COLUMN_DEFAULT || undefined,
        foreignKey: row.REFERENCED_TABLE_NAME
          ? {
              column: row.REFERENCED_COLUMN_NAME,
              table: row.REFERENCED_TABLE_NAME,
            }
          : undefined,
        name: row.COLUMN_NAME,
        nullable: row.IS_NULLABLE === 'YES',
        primaryKey: row.IS_PRIMARY_KEY === 1,
        type: row.DATA_TYPE,
      }))

      return {
        columns,
        name: tableName,
      }
    })

    return Promise.all(tablePromises)
  }

  isConnected(): boolean {
    return this.connected && this.pool !== null
  }

  async runQuery(query: string): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database not connected')
    }

    try {
      const result = await this.pool.request().query(query)
      return {
        fields: Object.keys(result.recordset[0] || {}).map((name) => ({name})),
        rowCount: result.recordset.length > 0 ? (result.rowsAffected[0] > 0 ? result.rowsAffected[0] : result.recordset.length) : 0,
        rows: result.recordset,
      }
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
