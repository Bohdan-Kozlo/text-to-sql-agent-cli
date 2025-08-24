import {ChatGoogleGenerativeAI} from '@langchain/google-genai'
import {z} from 'zod'

export interface FixResult {
  explanation: string
  fixedSql?: string
}

export async function explainAndFixSql(
  model: ChatGoogleGenerativeAI,
  sql: string,
  errorMessage: string,
  dialect: 'postgresql' | 'mysql' | 'mssql',
): Promise<FixResult> {
  const outputSchema = z
    .object({
      explanation: z
        .string()
        .describe('Short root cause explanation (2-4 sentences) of the SQL error and how to fix it.'),
      fixedSql: z.string().optional().describe('A corrected single-statement SQL query if a safe fix is possible.'),
      unsafe: z.boolean().optional().describe('True if the fix would require DML/DDL changes that might be unsafe.'),
    })
    .describe('SQL fix result')

  const structured = model.withStructuredOutput(outputSchema, {name: 'SqlFix'})

  const prompt = `Dialect: ${dialect}\nOriginal SQL:\n${sql}\n\nError: ${errorMessage}\nReturn explanation and a fixedSql if you can correct it safely.`
  const result: any = await structured.invoke([{role: 'user', content: prompt}])
  return {explanation: result.explanation, fixedSql: result.fixedSql}
}
