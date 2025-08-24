import {ChatGoogleGenerativeAI} from '@langchain/google-genai'

import {getGeminiApiKey} from '../utils/config.js'

export function getGeminiModel(modelName = 'gemini-2.5-flash'): ChatGoogleGenerativeAI {
  const key = getGeminiApiKey()

  if (!process.env.GOOGLE_API_KEY) {
    process.env.GOOGLE_API_KEY = key
  }

  return new ChatGoogleGenerativeAI({model: modelName, temperature: 0})
}
