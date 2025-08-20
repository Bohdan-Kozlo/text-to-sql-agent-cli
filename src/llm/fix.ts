import {ChatGoogleGenerativeAI} from '@langchain/google-genai'

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
  const prompt = `You are an expert ${dialect} SQL assistant.
Given the SQL and the error message, first explain the likely root cause in 2-4 sentences.
Then propose a corrected SQL. Output the corrected SQL in a single fenced code block marked with sql.

SQL:
${sql}

Error:
${errorMessage}
`

  const resp = await model.invoke([{role: 'user', content: prompt}])
  const text = resp?.content?.toString?.() ?? ''

  const codeMatch = text.match(/```sql\s*([\s\S]*?)```/i) || text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/)
  const fixedSql = codeMatch ? codeMatch[1].trim() : undefined
  const explanation = codeMatch ? text.replace(codeMatch[0], '').trim() : text.trim()

  return {explanation, fixedSql}
}
