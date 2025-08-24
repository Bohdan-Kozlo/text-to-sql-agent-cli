import {ChatGoogleGenerativeAI} from '@langchain/google-genai'
import {z} from 'zod'

export interface GenerateAnswerOptions {
  model: ChatGoogleGenerativeAI
  question: string
  rowCount: number
  rows: Record<string, unknown>[]
  sql: string
}

export async function generateAnswer({model, question, rowCount, rows, sql}: GenerateAnswerOptions): Promise<string> {
  const sampleRows = rows.slice(0, 20)
  const tablePreview = JSON.stringify(sampleRows, null, 2)

  const outputSchema = z
    .object({
      answer: z.string().describe('Concise natural language answer to user question.'),
    })
    .describe('Final answer summary')

  const structured = model.withStructuredOutput(outputSchema, {name: 'AnswerSummary'})

  const prompt = `User question: ${question}\nRows returned: ${rowCount}\nSQL used:\n${sql}\n\nSample rows JSON (first ${sampleRows.length}):\n${tablePreview}\n\nProvide answer.`
  const result = (await structured.invoke([{content: prompt, role: 'user'}])) as {answer: string; highlights?: string[]}
  return result.answer + (result.highlights ? '\n' + result.highlights.map((h: string) => '- ' + h).join('\n') : '')
}
