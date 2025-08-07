import {DbAdapter, DatabaseType, DbConnectionConfig} from './types.js'
import {PostgresAdapter} from './adapters/postgres.js'
import {MySQLAdapter} from './adapters/mysql.js'
import {MSSQLAdapter} from './adapters/mssql.js'

export function createDatabaseAdapter(databaseUrl: string): DbAdapter {
  const dbType = getDatabaseTypeFromUrl(databaseUrl)

  switch (dbType) {
    case 'postgresql':
      return new PostgresAdapter()
    case 'mysql':
      return new MySQLAdapter()
    case 'mssql':
      return new MSSQLAdapter()
    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

export function getDatabaseTypeFromUrl(url: string): DatabaseType {
  const protocol = url.split('://')[0].toLowerCase()

  switch (protocol) {
    case 'postgresql':
    case 'postgres':
      return 'postgresql'
    case 'mysql':
      return 'mysql'
    case 'mssql':
    case 'sqlserver':
      return 'mssql'
    default:
      throw new Error(`Cannot determine database type from URL: ${url}`)
  }
}

export function parseDatabaseUrl(url: string): DbConnectionConfig {
  try {
    const urlObj = new URL(url)

    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || getDefaultPort(getDatabaseTypeFromUrl(url)),
      database: urlObj.pathname.slice(1),
      user: urlObj.username,
      password: urlObj.password,
      ssl: urlObj.searchParams.get('ssl') === 'true' || urlObj.searchParams.get('sslmode') === 'require',
    }
  } catch (error) {
    throw new Error(`Invalid database URL format: ${url}`)
  }
}

function getDefaultPort(dbType: DatabaseType): number {
  switch (dbType) {
    case 'postgresql':
      return 5432
    case 'mysql':
      return 3306
    case 'mssql':
      return 1433
    default:
      throw new Error(`Unknown database type: ${dbType}`)
  }
}

export async function connectToDatabase(databaseUrl: string): Promise<DbAdapter> {
  const adapter = createDatabaseAdapter(databaseUrl)
  const config = parseDatabaseUrl(databaseUrl)

  await adapter.connect(config)
  return adapter
}
