import type { ScriptInfo } from './types'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseScriptInfo(name: string, source: string): ScriptInfo {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/)
  const header = lines.slice(0, 12).map((line) =>
    line.match(/^\s*\/\/\/\s*(.*)$/)?.[1]?.trim() ?? ''
  )
  const signatureLine = header.find((line) =>
    new RegExp(`^${escapeRegExp(name)}\\s*\\(`, 'i').test(line)
  )
  const signatureMatch = signatureLine?.match(/^[a-zA-Z_]\w*\s*\(([^)]*)\)/)
  let args = signatureMatch?.[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? []

  if (!signatureMatch) {
    let highest = -1
    for (const match of source.matchAll(/\bargument(\d+)\b/g)) {
      highest = Math.max(highest, Number.parseInt(match[1], 10))
    }
    args = Array.from({ length: Math.min(32, highest + 1) }, (_value, index) => `argument${index}`)
  }

  const description = header.find((line) =>
    line && line !== signatureLine && !/^argument\d+\b/i.test(line)
  )?.replace(/^@description\s*/i, '') ?? ''

  return {
    signature: `${name}(${args.join(', ')})`,
    description
  }
}
