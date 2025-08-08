import {ChatGoogleGenerativeAI} from '@langchain/google-genai'

export async function generateAnswer(
  model: ChatGoogleGenerativeAI,
  question: string,
  sql: string,
  rows: any[],
  rowCount: number,
): Promise<string> {
  const sampleRows = rows.slice(0, 20)
  const tablePreview = JSON.stringify(sampleRows, null, 2)
  const prompt = `User question: ${question}\n\nSQL used to retrieve data:\n${sql}\n\nFirst ${sampleRows.length} rows (JSON):\n${tablePreview}\n\nProvide a concise, user-friendly answer. If the result looks like an aggregation, summarize the key numbers. If it's tabular, describe the highlights.`
  const resp = await model.invoke([{role: 'user', content: prompt}])
  return resp?.content?.toString?.() ?? ''
}
