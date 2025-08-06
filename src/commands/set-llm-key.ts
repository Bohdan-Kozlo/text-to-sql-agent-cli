import {Args, Command, Flags} from '@oclif/core'
import pkg from 'enquirer'
const {prompt} = pkg
import {loadConfig, saveConfig} from '../utils/config.js'

export default class SetLlmKey extends Command {
  static override description = 'Set your Gemini API key for LLM access'
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --key "your-gemini-api-key"',
  ]

  static override flags = {
    key: Flags.string({char: 'k', description: 'Your Gemini API key'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(SetLlmKey)
    let apiKey = flags.key

    if (!apiKey) {
      const currentConfig = loadConfig()
      if (currentConfig.GEMINI_API_KEY) {
        const maskedKey = currentConfig.GEMINI_API_KEY.substring(0, 8) + '***'
        this.log(`Current API key: ${maskedKey}`)
      }

      const response = await prompt<{key: string}>({
        type: 'password',
        name: 'key',
        message: 'Enter your Gemini API key:',
        validate: (value: string) => {
          if (!value.trim()) {
            return 'API key cannot be empty'
          }
          if (value.trim().length < 10) {
            return 'API key seems too short. Please enter a valid Gemini API key'
          }
          return true
        },
      })

      apiKey = response.key
    }

    if (!apiKey) {
      this.error('Please provide a Gemini API key.')
    }

    try {
      const config = loadConfig()
      config.GEMINI_API_KEY = apiKey.trim()
      saveConfig(config)

      this.log('✅ Gemini API key saved successfully!')
    } catch (error) {
      this.error('❌ Failed to save API key', {exit: 1})
    }
  }
}
