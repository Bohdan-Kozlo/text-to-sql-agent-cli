import {ChatGoogleGenerativeAI} from '@langchain/google-genai'
import {TableInfo} from '../database/types.js'

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
  const prompt = `You are an expert SQL generator. Produce a single ${dialect} SQL query answering the user's question based ONLY on the provided schema. Do not include explanations, only the SQL.\n\nSchema:\n${schemaText}\n\nQuestion: ${question}`
  const resp = await model.invoke([{role: 'user', content: prompt}])
  const text = resp?.content?.toString?.() ?? ''
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim()
}
