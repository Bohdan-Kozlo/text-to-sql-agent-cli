export function formatTable(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return '(no rows)'
  const columns = Object.keys(rows[0])
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => (r[col] === null || r[col] === undefined ? 4 : String(r[col]).length))),
  )
  const sep = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+'
  const header = '|' + columns.map((c, i) => ' ' + c.padEnd(widths[i]) + ' ').join('|') + '|'
  const lines = rows.map(
    (r) =>
      '|' +
      columns
        .map((c, i) => {
          const v = r[c]
          const s = v === null || v === undefined ? 'null' : String(v)
          return ' ' + s.padEnd(widths[i]) + ' '
        })
        .join('|') +
      '|',
  )
  return [sep, header, sep, ...lines, sep].join('\n')
}
