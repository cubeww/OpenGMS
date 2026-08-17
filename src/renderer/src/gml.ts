import type * as Monaco from 'monaco-editor/editor/editor.api'
import type { Project, ProjectItem, ResourceType } from '../../shared/types'
import { gmlFunctions, type GmlFunction } from './gmlBuiltins'
import { useApp } from './store'

type MonacoApi = typeof Monaco

type ProjectSymbol = {
  name: string
  detail: string
  type: 'function' | 'resource' | 'constant'
  signature?: string
  description?: string
}

type Call = {
  name: string
  argument: number
}

const keywords = [
  'begin', 'break', 'case', 'continue', 'default', 'do', 'else', 'end', 'exit',
  'for', 'globalvar', 'if', 'repeat', 'return', 'switch', 'then', 'until', 'var',
  'while', 'with'
]

const wordOperators = ['and', 'div', 'mod', 'not', 'or', 'xor']

const constants = [
  'all', 'false', 'noone', 'other', 'pi', 'pointer_null', 'self', 'true', 'undefined',
  'c_aqua', 'c_black', 'c_blue', 'c_dkgray', 'c_fuchsia', 'c_gray', 'c_green',
  'c_lime', 'c_ltgray', 'c_maroon', 'c_navy', 'c_olive', 'c_orange', 'c_purple',
  'c_red', 'c_silver', 'c_teal', 'c_white', 'c_yellow',
  'vk_nokey', 'vk_anykey', 'vk_enter', 'vk_return', 'vk_shift', 'vk_control',
  'vk_alt', 'vk_escape', 'vk_space', 'vk_backspace', 'vk_tab', 'vk_pause',
  'vk_printscreen', 'vk_left', 'vk_right', 'vk_up', 'vk_down', 'vk_home', 'vk_end',
  'vk_delete', 'vk_insert', 'vk_pageup', 'vk_pagedown', 'vk_f1', 'vk_f2', 'vk_f3',
  'vk_f4', 'vk_f5', 'vk_f6', 'vk_f7', 'vk_f8', 'vk_f9', 'vk_f10', 'vk_f11',
  'vk_f12', 'vk_numpad0', 'vk_numpad1', 'vk_numpad2', 'vk_numpad3', 'vk_numpad4',
  'vk_numpad5', 'vk_numpad6', 'vk_numpad7', 'vk_numpad8', 'vk_numpad9',
  'vk_multiply', 'vk_add', 'vk_subtract', 'vk_decimal', 'vk_divide',
  'mb_none', 'mb_any', 'mb_left', 'mb_middle', 'mb_right',
  'fa_left', 'fa_center', 'fa_right', 'fa_top', 'fa_middle', 'fa_bottom',
  'bm_normal', 'bm_add', 'bm_max', 'bm_subtract', 'bm_zero', 'bm_one',
  'bm_src_colour', 'bm_inv_src_colour', 'bm_src_alpha', 'bm_inv_src_alpha',
  'bm_dest_alpha', 'bm_inv_dest_alpha', 'bm_dest_colour', 'bm_inv_dest_colour',
  'pr_pointlist', 'pr_linelist', 'pr_linestrip', 'pr_trianglelist', 'pr_trianglestrip',
  'pr_trianglefan', 'cr_default', 'cr_none', 'cr_arrow', 'cr_cross', 'cr_beam',
  'cr_size_nesw', 'cr_size_ns', 'cr_size_nwse', 'cr_size_we', 'cr_uparrow',
  'cr_hourglass', 'cr_drag', 'cr_nodrop', 'cr_hsplit', 'cr_vsplit', 'cr_multidrag',
  'cr_sqlwait', 'cr_no', 'cr_appstart', 'cr_help', 'cr_handpoint', 'cr_size_all',
  'path_action_stop', 'path_action_restart', 'path_action_continue', 'path_action_reverse',
  'buffer_fixed', 'buffer_grow', 'buffer_wrap', 'buffer_fast', 'buffer_vbuffer',
  'buffer_u8', 'buffer_s8', 'buffer_u16', 'buffer_s16', 'buffer_u32', 'buffer_s32',
  'buffer_f16', 'buffer_f32', 'buffer_f64', 'buffer_bool', 'buffer_string', 'buffer_text',
  'buffer_seek_start', 'buffer_seek_relative', 'buffer_seek_end',
  'ds_type_map', 'ds_type_list', 'ds_type_stack', 'ds_type_grid', 'ds_type_queue',
  'ds_type_priority', 'audio_falloff_none', 'audio_falloff_inverse_distance',
  'audio_falloff_inverse_distance_clamped', 'audio_falloff_linear_distance',
  'audio_falloff_linear_distance_clamped', 'audio_falloff_exponent_distance',
  'audio_falloff_exponent_distance_clamped', 'os_windows', 'os_macosx', 'os_ios',
  'os_android', 'os_linux', 'os_win8native', 'os_tizen', 'browser_not_a_browser',
  'browser_unknown', 'browser_ie', 'browser_firefox', 'browser_chrome', 'browser_safari',
  'browser_opera', 'device_ios_unknown', 'device_ios_iphone', 'device_ios_iphone_retina',
  'device_ios_ipad', 'device_ios_ipad_retina', 'device_ios_iphone5',
  'network_socket_tcp', 'network_socket_udp', 'network_socket_bluetooth',
  'network_type_none', 'network_type_unknown', 'network_type_ethernet',
  'network_type_wifi', 'network_type_wimax', 'network_type_bluetooth',
  'network_type_2g', 'network_type_3g', 'network_type_4g'
]

const builtInVariables = [
  'global', 'id', 'object_index', 'x', 'y', 'xprevious', 'yprevious', 'xstart', 'ystart',
  'hspeed', 'vspeed', 'direction', 'speed', 'friction', 'gravity', 'gravity_direction',
  'solid', 'visible', 'persistent', 'depth', 'bbox_left', 'bbox_right', 'bbox_top',
  'bbox_bottom', 'sprite_index', 'image_index', 'image_number', 'image_speed',
  'image_xscale', 'image_yscale', 'image_angle', 'image_alpha', 'image_blend', 'mask_index',
  'alarm', 'timeline_index', 'timeline_position', 'timeline_speed', 'path_index',
  'path_position', 'path_positionprevious', 'path_speed', 'path_scale', 'path_orientation',
  'path_endaction', 'room', 'room_first', 'room_last', 'room_width', 'room_height',
  'room_speed', 'room_caption', 'background_color', 'background_showcolor', 'view_enabled',
  'view_current', 'mouse_x', 'mouse_y', 'keyboard_key', 'keyboard_lastkey',
  'keyboard_lastchar', 'score', 'lives', 'health', 'show_score', 'show_lives', 'show_health',
  'caption_score', 'caption_lives', 'caption_health', 'fps', 'fps_real', 'current_time',
  'current_year', 'current_month', 'current_day', 'current_weekday', 'current_hour',
  'current_minute', 'current_second', 'event_type', 'event_number', 'event_object',
  'event_action', 'secure_mode', 'debug_mode', 'async_load', 'application_surface',
  'os_type', 'os_device', 'os_version', 'browser_type', 'device_mouse_x', 'device_mouse_y',
  'argument', 'argument_count', 'argument_relative',
  ...Array.from({ length: 16 }, (_item, index) => `argument${index}`)
]

const snippets = [
  { label: 'if', detail: 'If statement', text: 'if (${1:condition}) {\n\t$0\n}' },
  { label: 'ifelse', detail: 'If / else statement', text: 'if (${1:condition}) {\n\t${2}\n} else {\n\t$0\n}' },
  { label: 'for', detail: 'For loop', text: 'for (var ${1:i} = ${2:0}; $1 < ${3:count}; $1 += 1) {\n\t$0\n}' },
  { label: 'while', detail: 'While loop', text: 'while (${1:condition}) {\n\t$0\n}' },
  { label: 'do', detail: 'Do / until loop', text: 'do {\n\t$0\n} until (${1:condition});' },
  { label: 'repeat', detail: 'Repeat loop', text: 'repeat (${1:count}) {\n\t$0\n}' },
  { label: 'with', detail: 'With block', text: 'with (${1:object}) {\n\t$0\n}' },
  { label: 'switch', detail: 'Switch statement', text: 'switch (${1:value}) {\n\tcase ${2:value}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}' },
  { label: 'description', detail: 'Script description', text: '/// @description ${1:Description}\n$0' }
]

const functionByName = new Map(gmlFunctions.map((item) => [item.name, item]))
const projectCache = new WeakMap<Project, ProjectSymbol[]>()

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parameters(name: string, signature: string): string[] {
  const match = signature.match(new RegExp(`(?:^|\\s)${escapeRegex(name)}\\s*\\(([^)]*)\\)`))
  if (!match || !match[1].trim()) return []
  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && item !== '...')
}

function placeholder(value: string, index: number): string {
  const clean = value
    .replace(/[\[\]]/g, '')
    .replace(/[^a-zA-Z0-9_ .]/g, '')
    .trim() || `argument${index}`
  return `\${${index}:${clean}}`
}

function functionSnippet(item: GmlFunction): string {
  const args = parameters(item.name, item.signature)
  return `${item.name}(${args.map((arg, index) => placeholder(arg, index + 1)).join(', ')})`
}

function resourceDetail(type: ResourceType): string {
  const names: Record<ResourceType, string> = {
    sprite: 'Sprite resource',
    sound: 'Sound resource',
    background: 'Background resource',
    path: 'Path resource',
    script: 'Project script',
    shader: 'Shader resource',
    font: 'Font resource',
    timeline: 'Timeline resource',
    object: 'Object resource',
    room: 'Room resource',
    file: 'Included file',
    extension: 'Extension resource',
    macro: 'Macro configuration'
  }
  return names[type]
}

function projectSymbols(project: Project | null): ProjectSymbol[] {
  if (!project) return []
  const cached = projectCache.get(project)
  if (cached) return cached

  const symbols = new Map<string, ProjectSymbol>()
  const add = (symbol: ProjectSymbol): void => {
    if (!symbols.has(symbol.name)) symbols.set(symbol.name, symbol)
  }

  function visit(item: ProjectItem): void {
    if (item.kind === 'group') {
      item.items.forEach(visit)
      return
    }

    if (item.type === 'macro') {
      item.macro?.entries.forEach((entry) => add({
        name: entry.name,
        detail: `Project macro · ${item.name}`,
        type: 'constant',
        description: entry.value
      }))
      return
    }

    add({
      name: item.name,
      detail: resourceDetail(item.type),
      type: item.type === 'script' ? 'function' : 'resource',
      signature: item.type === 'script' ? item.script?.signature ?? `${item.name}()` : undefined,
      description: item.type === 'script'
        ? item.script?.description || item.path
        : item.path
    })

    if (item.type === 'extension') {
      item.extension?.files.forEach((file) => file.functions.forEach((fn) => {
        const args = Array.from({ length: Math.max(0, fn.argCount) }, (_value, index) =>
          `argument${index}`
        )
        add({
          name: fn.name,
          detail: `Extension function · ${item.name}`,
          type: 'function',
          signature: `${fn.name}(${args.join(', ')})`,
          description: fn.help || fn.externalName
        })
      }))
    }
  }

  project.groups.forEach((group) => group.items.forEach(visit))
  const result = [...symbols.values()]
  projectCache.set(project, result)
  return result
}

function localNames(model: Monaco.editor.ITextModel): Array<{ name: string; detail: string }> {
  const source = model.getValue()
  const names = new Map<string, string>()
  const declaration = /\b(var|globalvar)\s+([^;\r\n]+)/g
  let match: RegExpExecArray | null

  while ((match = declaration.exec(source))) {
    const detail = match[1] === 'globalvar' ? 'Global variable' : 'Local variable'
    for (const part of match[2].split(',')) {
      const name = part.match(/^\s*([a-zA-Z_]\w*)/)?.[1]
      if (name) names.set(name, detail)
    }
  }

  const globalVariable = /\bglobal\.([a-zA-Z_]\w*)/g
  while ((match = globalVariable.exec(source))) names.set(match[1], 'Global variable')

  return [...names].map(([name, detail]) => ({ name, detail }))
}

function activeCall(model: Monaco.editor.ITextModel, position: Monaco.Position): Call | null {
  const offset = model.getOffsetAt(position)
  const source = model.getValue().slice(Math.max(0, offset - 20000), offset)
  const stack: Array<{ token: '(' | '[' | '{'; name: string; argument: number }> = []
  let quote = ''
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = ''
      continue
    }
    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === '(') {
      const before = source.slice(0, index).match(/([a-zA-Z_]\w*)\s*$/)?.[1] ?? ''
      stack.push({ token: '(', name: before, argument: 0 })
    } else if (char === '[') stack.push({ token: '[', name: '', argument: 0 })
    else if (char === '{') stack.push({ token: '{', name: '', argument: 0 })
    else if (char === ')' || char === ']' || char === '}') stack.pop()
    else if (char === ',' && stack.at(-1)?.token === '(') stack[stack.length - 1].argument += 1
  }

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].token === '(' && stack[index].name) {
      return { name: stack[index].name, argument: stack[index].argument }
    }
  }
  return null
}

function projectFunction(name: string): GmlFunction | null {
  const symbol = projectSymbols(useApp.getState().project).find((item) =>
    item.type === 'function' && item.name === name
  )
  if (!symbol?.signature) return null
  return {
    name,
    signature: symbol.signature,
    description: symbol.description || symbol.detail,
    category: symbol.detail
  }
}

function completionKind(api: MonacoApi, symbol: ProjectSymbol): Monaco.languages.CompletionItemKind {
  if (symbol.type === 'function') return api.languages.CompletionItemKind.Function
  if (symbol.type === 'constant') return api.languages.CompletionItemKind.Constant
  if (symbol.detail.startsWith('Object')) return api.languages.CompletionItemKind.Class
  if (symbol.detail.startsWith('Room')) return api.languages.CompletionItemKind.Module
  if (symbol.detail.startsWith('Timeline')) return api.languages.CompletionItemKind.Event
  return api.languages.CompletionItemKind.Reference
}

export function registerGml(api: MonacoApi): void {
  api.languages.register({ id: 'gml', extensions: ['.gml'], aliases: ['GML', 'GameMaker Language'] })
  api.languages.setLanguageConfiguration('gml', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string', 'comment'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    indentationRules: {
      increaseIndentPattern: /\{[^}"']*$/,
      decreaseIndentPattern: /^\s*\}/
    },
    folding: {
      markers: {
        start: /^\s*\/\/\s*#?region\b/i,
        end: /^\s*\/\/\s*#?endregion\b/i
      }
    },
    onEnterRules: [
      {
        beforeText: /^\s*\/\*\*(?!\/).*$/,
        afterText: /^\s*\*\/$/,
        action: { indentAction: api.languages.IndentAction.IndentOutdent, appendText: ' * ' }
      },
      {
        beforeText: /^\s*\*(?!\/).*$/,
        action: { indentAction: api.languages.IndentAction.None, appendText: '* ' }
      },
      {
        beforeText: /^.*\{\s*$/,
        afterText: /^\s*\}/,
        action: { indentAction: api.languages.IndentAction.IndentOutdent }
      }
    ]
  })

  api.languages.setMonarchTokensProvider('gml', {
    defaultToken: '',
    tokenPostfix: '.gml',
    keywords,
    wordOperators,
    constants,
    variables: builtInVariables,
    builtins: gmlFunctions.map((item) => item.name),
    tokenizer: {
      root: [
        [/\/\/\/.*$/, 'comment.doc'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
        [/\$[0-9a-fA-F]+/, 'number.hex'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
        [/\d+([eE][-+]?\d+)?/, 'number'],
        [/[a-zA-Z_]\w*(?=\s*\()/, {
          cases: {
            '@builtins': 'builtin.function',
            '@default': 'function'
          }
        }],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@wordOperators': 'operator.word',
            '@constants': 'constant',
            '@variables': 'variable.predefined',
            '@builtins': 'builtin.function',
            '@default': 'identifier'
          }
        }],
        [/[{}()[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
        [/[<>!=~?:&|+\-*/^%@#]+/, 'operator'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@stringDouble'],
        [/'/, 'string', '@stringSingle']
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment']
      ],
      stringDouble: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ],
      stringSingle: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop']
      ]
    }
  })

  const functionItems = gmlFunctions.map((item) => ({
    label: item.name,
    kind: api.languages.CompletionItemKind.Function,
    detail: item.signature,
    documentation: {
      value: `${item.description}\n\n_GMS 1.4 · ${item.category}_`
    },
    insertText: functionSnippet(item),
    insertTextRules: api.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: `3_${item.name}`,
    command: parameters(item.name, item.signature).length
      ? { id: 'editor.action.triggerParameterHints', title: 'Show parameter hints' }
      : undefined
  }))

  api.languages.registerCompletionItemProvider('gml', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = new api.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      )
      const suggestions: Monaco.languages.CompletionItem[] = functionItems.map((item) => ({
        ...item,
        range
      }))

      for (const item of snippets) {
        suggestions.push({
          label: item.label,
          kind: api.languages.CompletionItemKind.Snippet,
          detail: item.detail,
          insertText: item.text,
          insertTextRules: api.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          sortText: `0_${item.label}`,
          range
        })
      }

      for (const item of localNames(model)) {
        suggestions.push({
          label: item.name,
          kind: api.languages.CompletionItemKind.Variable,
          detail: item.detail,
          insertText: item.name,
          sortText: `1_${item.name}`,
          range
        })
      }

      for (const symbol of projectSymbols(useApp.getState().project)) {
        const args = symbol.signature ? parameters(symbol.name, symbol.signature) : []
        suggestions.push({
          label: symbol.name,
          kind: completionKind(api, symbol),
          detail: symbol.signature || symbol.detail,
          documentation: symbol.description,
          insertText: symbol.type === 'function'
            ? `${symbol.name}(${args.length
              ? args.map((arg, index) => placeholder(arg, index + 1)).join(', ')
              : '$0'})`
            : symbol.name,
          insertTextRules: symbol.type === 'function'
            ? api.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          sortText: `2_${symbol.name}`,
          range
        })
      }

      for (const name of builtInVariables) {
        suggestions.push({
          label: name,
          kind: api.languages.CompletionItemKind.Variable,
          detail: 'GML built-in variable',
          insertText: name,
          sortText: `4_${name}`,
          range
        })
      }

      for (const name of constants) {
        suggestions.push({
          label: name,
          kind: api.languages.CompletionItemKind.Constant,
          detail: 'GML constant',
          insertText: name,
          sortText: `4_${name}`,
          range
        })
      }

      for (const name of [...keywords, ...wordOperators]) {
        suggestions.push({
          label: name,
          kind: api.languages.CompletionItemKind.Keyword,
          detail: 'GML keyword',
          insertText: name,
          sortText: `5_${name}`,
          range
        })
      }

      return { suggestions }
    }
  })

  api.languages.registerSignatureHelpProvider('gml', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    provideSignatureHelp(model, position) {
      const call = activeCall(model, position)
      if (!call) return null
      const item = functionByName.get(call.name) ?? projectFunction(call.name)
      if (!item) return null
      const args = parameters(item.name, item.signature)
      return {
        value: {
          signatures: [{
            label: item.signature,
            documentation: item.description,
            parameters: args.map((label) => ({ label }))
          }],
          activeSignature: 0,
          activeParameter: Math.min(call.argument, Math.max(0, args.length - 1))
        },
        dispose: () => undefined
      }
    }
  })

  api.languages.registerHoverProvider('gml', {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position)
      if (!word) return null
      const item = functionByName.get(word.word) ?? projectFunction(word.word)
      if (item) {
        return {
          range: new api.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [
            { value: `\`${item.signature}\`` },
            { value: item.description },
            { value: `_GMS 1.4 · ${item.category}_` }
          ]
        }
      }

      const symbol = projectSymbols(useApp.getState().project).find((entry) => entry.name === word.word)
      if (!symbol) return null
      return {
        range: new api.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
        contents: [
          { value: `**${symbol.name}**` },
          { value: symbol.detail },
          ...(symbol.description ? [{ value: symbol.description }] : [])
        ]
      }
    }
  })
}
