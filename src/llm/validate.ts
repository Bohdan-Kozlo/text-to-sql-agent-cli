import {ChatGoogleGenerativeAI} from '@langchain/google-genai'
import {z} from 'zod'

export interface ValidationResult {
  reason?: string
  safeSql?: string
  valid: boolean
}

export async function validateSql(
  model: ChatGoogleGenerativeAI,
  question: string,
  sql: string,
  dialect: 'mssql' | 'mysql' | 'postgresql',
): Promise<ValidationResult> {
  const outputSchema = z
    .object({
      reason: z.string().optional().describe('Explanation when invalid or adjustments made.'),
      safeSql: z.string().optional().describe('Cleaned SQL when valid.'),
      valid: z.boolean().describe('Whether the SQL is safe, single-statement, and appropriate.'),
    })
    .describe('SQL validation result')

  const structured = model.withStructuredOutput(outputSchema, {name: 'SqlValidation'})

  const prompt = `Validate the following ${dialect} SQL for the user question. Enforce: single statement, read-only unless write is explicitly required (rare), no DDL. Return whether valid and a cleaned safeSql if valid.\nQuestion: ${question}\nSQL:\n${sql}`
  const result = await structured.invoke([{content: prompt, role: 'user'}]) as ValidationResult
  return {reason: result.reason, safeSql: result.safeSql?.trim(), valid: Boolean(result.valid)}
}
