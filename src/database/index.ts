import {MSSQLAdapter} from './adapters/mssql.js'
import {MySQLAdapter} from './adapters/mysql.js'
import {PostgresAdapter} from './adapters/postgres.js'
import {DatabaseType, DbAdapter, DbConnectionConfig} from './types.js'

export function createDatabaseAdapter(databaseUrl: string): DbAdapter {
  const dbType = getDatabaseTypeFromUrl(databaseUrl)

  switch (dbType) {
    case 'mssql': {
      return new MSSQLAdapter()
    }

    case 'mysql': {
      return new MySQLAdapter()
    }

    case 'postgresql': {
      return new PostgresAdapter()
    }

    default: {
      throw new Error(`Unsupported database type: ${dbType}`)
    }
  }
}

export function getDatabaseTypeFromUrl(url: string): DatabaseType {
  const protocol = url.split('://')[0].toLowerCase()

  switch (protocol) {
    case 'mssql':
    case 'sqlserver': {
      return 'mssql'
    }

    case 'mysql': {
      return 'mysql'
    }

    case 'postgres':
    case 'postgresql': {
      return 'postgresql'
    }

    default: {
      throw new Error(`Cannot determine database type from URL: ${url}`)
    }
  }
}

export function parseDatabaseUrl(url: string): DbConnectionConfig {
  try {
    const urlObj = new URL(url)

    return {
      database: urlObj.pathname.slice(1),
      host: urlObj.hostname,
      password: urlObj.password,
      port: Number.parseInt(urlObj.port, 10) || getDefaultPort(getDatabaseTypeFromUrl(url)),
      ssl: urlObj.searchParams.get('ssl') === 'true' || urlObj.searchParams.get('sslmode') === 'require',
      user: urlObj.username,
    }
  } catch {
    throw new Error(`Invalid database URL format: ${url}`)
  }
}

function getDefaultPort(dbType: DatabaseType): number {
  switch (dbType) {
    case 'mssql': {
      return 1433
    }

    case 'mysql': {
      return 3306
    }

    case 'postgresql': {
      return 5432
    }

    default: {
      throw new Error(`Unknown database type: ${dbType}`)
    }
  }
}

export async function connectToDatabase(databaseUrl: string): Promise<DbAdapter> {
  const adapter = createDatabaseAdapter(databaseUrl)
  const config = parseDatabaseUrl(databaseUrl)

  await adapter.connect(config)
  return adapter
}
