import * as monaco from 'monaco-editor/editor/editor.api'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import 'monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching.js'
import 'monaco-editor/editor/contrib/clipboard/browser/clipboard.js'
import 'monaco-editor/editor/contrib/comment/browser/comment.js'
import 'monaco-editor/editor/contrib/contextmenu/browser/contextmenu.js'
import 'monaco-editor/editor/contrib/find/browser/findController.js'
import 'monaco-editor/editor/contrib/folding/browser/folding.js'
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution.js'
import 'monaco-editor/editor/contrib/indentation/browser/indentation.js'
import 'monaco-editor/editor/contrib/linesOperations/browser/linesOperations.js'
import 'monaco-editor/editor/contrib/links/browser/links.js'
import 'monaco-editor/editor/contrib/multicursor/browser/multicursor.js'
import 'monaco-editor/editor/contrib/parameterHints/browser/parameterHints.js'
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2.js'
import 'monaco-editor/editor/contrib/suggest/browser/suggestController.js'
import 'monaco-editor/editor/contrib/wordHighlighter/browser/wordHighlighter.js'
import 'monaco-editor/editor/contrib/wordOperations/browser/wordOperations.js'
import 'monaco-editor/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js'
import { registerGml } from './gml'

type MonacoHost = typeof globalThis & {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, _label: string) => Worker
  }
}

;(globalThis as MonacoHost).MonacoEnvironment = {
  getWorker: () => new EditorWorker()
}

let ready = false

export function setupMonaco(): void {
  if (ready) return
  ready = true

  registerGml(monaco)

  function registerShaderLanguage(id: 'glsl' | 'hlsl', extensions: string[], keywords: string[], types: string[]): void {
    monaco.languages.register({ id, extensions })
    monaco.languages.setLanguageConfiguration(id, {
      comments: { lineComment: '//', blockComment: ['/*', '*/'] },
      brackets: [['{', '}'], ['[', ']'], ['(', ')']],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    })
    monaco.languages.setMonarchTokensProvider(id, {
      defaultToken: '',
      tokenPostfix: `.${id}`,
      keywords,
      types,
      constants: ['true', 'false', 'NULL'],
      builtins: [
        'gl_Position', 'gl_FragColor', 'gl_FragData', 'gl_FragCoord',
        'gm_BaseTexture', 'gm_Matrices', 'MATRIX_WORLD', 'MATRIX_VIEW',
        'MATRIX_PROJECTION', 'MATRIX_WORLD_VIEW_PROJECTION',
        'texture2D', 'textureCube', 'mul', 'lerp', 'saturate', 'frac',
        'normalize', 'dot', 'cross', 'length', 'distance', 'reflect', 'refract',
        'sin', 'cos', 'tan', 'pow', 'sqrt', 'abs', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep'
      ],
      tokenizer: {
        root: [
          [/^\s*#\s*[a-zA-Z_]+.*$/, 'keyword.directive'],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
          [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@types': 'type', '@constants': 'constant', '@builtins': 'type.identifier', '@default': 'identifier' } }],
          [/\d*\.\d+([eE][-+]?\d+)?[fF]?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+[uUfF]?/, 'number'],
          [/[{}()[\]]/, '@brackets'],
          [/[<>!=~?:&|+\-*/^%]+/, 'operator'],
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
  }

  registerShaderLanguage(
    'glsl',
    ['.vert', '.frag', '.glsl'],
    ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'discard', 'attribute', 'varying', 'uniform', 'const', 'in', 'out', 'inout', 'precision', 'lowp', 'mediump', 'highp', 'struct'],
    ['void', 'bool', 'int', 'uint', 'float', 'double', 'vec2', 'vec3', 'vec4', 'ivec2', 'ivec3', 'ivec4', 'uvec2', 'uvec3', 'uvec4', 'bvec2', 'bvec3', 'bvec4', 'mat2', 'mat3', 'mat4', 'sampler2D', 'samplerCube']
  )
  registerShaderLanguage(
    'hlsl',
    ['.hlsl', '.fx'],
    ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'discard', 'cbuffer', 'struct', 'register', 'static', 'const', 'uniform', 'in', 'out', 'inout'],
    ['void', 'bool', 'int', 'uint', 'half', 'float', 'double', 'float2', 'float3', 'float4', 'float2x2', 'float3x3', 'float4x4', 'sampler', 'sampler2D', 'SamplerState', 'Texture2D', 'TextureCube']
  )

  monaco.editor.defineTheme('opengms-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.gml', foreground: 'C792EA' },
      { token: 'keyword.directive.gml', foreground: '89DDFF' },
      { token: 'operator.word.gml', foreground: '89DDFF' },
      { token: 'constant.gml', foreground: 'FFCB6B' },
      { token: 'variable.predefined.gml', foreground: 'F78C6C' },
      { token: 'builtin.function.gml', foreground: '82AAFF' },
      { token: 'function.gml', foreground: '80CBC4' },
      { token: 'comment.doc.gml', foreground: '7F9F7F', fontStyle: 'italic' },
      { token: 'comment.gml', foreground: '667085', fontStyle: 'italic' },
      { token: 'string.gml', foreground: 'C3E88D' },
      { token: 'string.escape.gml', foreground: '89DDFF' },
      { token: 'number.gml', foreground: 'F78C6C' },
      { token: 'number.float.gml', foreground: 'F78C6C' },
      { token: 'number.hex.gml', foreground: 'F78C6C' },
      { token: 'keyword.glsl', foreground: 'C792EA' },
      { token: 'keyword.hlsl', foreground: 'C792EA' },
      { token: 'keyword.directive.glsl', foreground: '89DDFF' },
      { token: 'keyword.directive.hlsl', foreground: '89DDFF' },
      { token: 'type.glsl', foreground: 'FFCB6B' },
      { token: 'type.hlsl', foreground: 'FFCB6B' },
      { token: 'type.identifier.glsl', foreground: '82AAFF' },
      { token: 'type.identifier.hlsl', foreground: '82AAFF' },
      { token: 'comment.glsl', foreground: '6A7B68', fontStyle: 'italic' },
      { token: 'comment.hlsl', foreground: '6A7B68', fontStyle: 'italic' }
    ],
    colors: {
      'editor.background': '#11151B',
      'editor.foreground': '#D7DCE5',
      'editor.lineHighlightBackground': '#171D26',
      'editorCursor.foreground': '#7AA2F7',
      'editor.selectionBackground': '#29436A',
      'editorLineNumber.foreground': '#505866',
      'editorLineNumber.activeForeground': '#9AA5B5',
      'editorIndentGuide.background1': '#232A35',
      'editorIndentGuide.activeBackground1': '#394354'
    }
  })
}

export { monaco }
