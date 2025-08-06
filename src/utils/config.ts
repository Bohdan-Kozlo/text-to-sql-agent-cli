import path from 'path'
import os from 'os'
import fs from 'fs'

interface Config {
  GEMINI_API_KEY?: string
  DATABASE_URL?: string
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.llmclirc')
}

export function loadConfig(): Config {
  const configPath = getConfigPath()

  if (!fs.existsSync(configPath)) {
    return {}
  }

  const content = fs.readFileSync(configPath, 'utf-8')
  const config: Config = {}

  const geminiMatch = content.match(/GEMINI_API_KEY=(.*)/)
  if (geminiMatch && geminiMatch[1]) {
    config.GEMINI_API_KEY = geminiMatch[1].trim()
  }

  const dbMatch = content.match(/DATABASE_URL=(.*)/)
  if (dbMatch && dbMatch[1]) {
    config.DATABASE_URL = dbMatch[1].trim()
  }

  return config
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath()

  let content = ''

  if (config.GEMINI_API_KEY) {
    content += `GEMINI_API_KEY=${config.GEMINI_API_KEY}\n`
  }

  if (config.DATABASE_URL) {
    content += `DATABASE_URL=${config.DATABASE_URL}\n`
  }

  try {
    fs.writeFileSync(configPath, content)
  } catch (error) {
    throw new Error('Failed to save configuration file')
  }
}

export function getDbUrl(): string {
  const config = loadConfig()

  if (!config.DATABASE_URL) {
    throw new Error('Database URL not found in config file. Please set it first using the connect command.')
  }

  return config.DATABASE_URL
}

export function getGeminiApiKey(): string {
  const config = loadConfig()

  if (!config.GEMINI_API_KEY) {
    throw new Error('Gemini API key not found in config file. Please set it first using the set-llm-key command.')
  }

  return config.GEMINI_API_KEY
}
