import {Command, Flags} from '@oclif/core'
import pkg from 'enquirer'

import {loadConfig, saveConfig} from '../utils/config.js'

const {prompt} = pkg

export default class Connect extends Command {
  static override description = 'Set your database connection URL'
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --url "postgresql://user:password@localhost:5432/mydb"',
  ]
  static override flags = {
    url: Flags.string({char: 'u', description: 'Database URL'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Connect)
    let databaseUrl = flags.url

    if (!databaseUrl) {
      const currentConfig = loadConfig()
      if (currentConfig.DATABASE_URL) {
        this.log(`Current database URL: ${currentConfig.DATABASE_URL}`)
      }

      const response = await prompt<{url: string}>({
        initial: currentConfig.DATABASE_URL || '',
        message: 'Enter your database URL:',
        name: 'url',
        type: 'input',
        validate(value: string) {
          if (!value.trim()) {
            return 'Database URL cannot be empty'
          }

          if (!value.includes('://')) {
            return 'Please enter a valid database URL (e.g., postgresql://user:password@localhost:5432/mydb)'
          }

          return true
        },
      })

      databaseUrl = response.url
    }

    if (!databaseUrl) {
      this.error('Database URL is required')
    }

    try {
      const config = loadConfig()
      config.DATABASE_URL = databaseUrl.trim()
      saveConfig(config)

      this.log('Database URL saved successfully!')
      this.log(`Database URL: ${databaseUrl}`)
    } catch {
      this.error('Failed to save database URL', {exit: 1})
    }
  }
}
