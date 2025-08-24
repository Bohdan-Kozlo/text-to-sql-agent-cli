import {ChatGoogleGenerativeAI} from '@langchain/google-genai'
import {TableInfo} from '../database/types.js'
import {z} from 'zod'

export async function generateSql(
  model: ChatGoogleGenerativeAI,
  question: string,
  schema: TableInfo[],
  dialect: 'postgresql' | 'mysql' | 'mssql',
): Promise<string> {
  const schemaText = schema
    .map(
      (t) =>
        `TABLE ${t.name}\n` +
        t.columns
          .map((c) => `  - ${c.name}: ${c.type}${c.primaryKey ? ' PK' : ''}${c.nullable ? '' : ' NOT NULL'}`)
          .join('\n'),
    )
    .join('\n')

  const outputSchema = z
    .object({
      sql: z
        .string()
        .describe('A single valid SQL statement for the target dialect answering the user question. No comments.'),
    })
    .describe('SQL generation result')

  const structured = model.withStructuredOutput(outputSchema, {
    name: 'SqlGeneration',
  })

  const instructions = `Generate exactly one ${dialect} SQL SELECT statement (read-only) answering the question. Use only provided schema. No data modification. Avoid guessing nonexistent tables/columns.`
  const prompt = `${instructions}\n\nSchema:\n${schemaText}\n\nQuestion: ${question}`
  const result: any = await structured.invoke([{role: 'user', content: prompt}])
  return result.sql.trim()
}
