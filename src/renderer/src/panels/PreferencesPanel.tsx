import { useEffect, useState } from 'react'
import { Braces, Palette, RotateCcw, Settings2, Type } from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import { ColorPicker } from '../ColorPicker'
import {
  codeFontFamily,
  resetEditorSettings,
  updateEditorSettings,
  useEditorSettings
} from '../editorSettings'
import type { EditorColors } from '../editorSettings'
import { FontPicker } from '../FontPicker'

const colorFields: Array<{ key: keyof EditorColors; label: string }> = [
  { key: 'text', label: 'Plain text' },
  { key: 'keyword', label: 'Keywords' },
  { key: 'operator', label: 'Operators' },
  { key: 'builtInFunction', label: 'Built-in functions' },
  { key: 'function', label: 'Script functions' },
  { key: 'resource', label: 'Resource names' },
  { key: 'variable', label: 'Built-in variables' },
  { key: 'constant', label: 'Constants' },
  { key: 'string', label: 'Strings' },
  { key: 'number', label: 'Numbers' },
  { key: 'comment', label: 'Comments' },
  { key: 'docComment', label: 'Documentation comments' },
  { key: 'enumName', label: 'Enum names' },
  { key: 'enumMember', label: 'Enum members' }
]

function NumberField({
  value,
  min,
  max,
  onChange
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}): React.JSX.Element {
  const [text, setText] = useState(String(value))

  useEffect(() => setText(String(value)), [value])

  function commit(): void {
    const next = Number(text)
    if (!Number.isFinite(next)) {
      setText(String(value))
      return
    }
    onChange(Math.max(min, Math.min(max, Math.round(next))))
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="preferences-color">
      <span>{label}</span>
      <ColorPicker value={value} onChange={onChange} label={`${label} color`} />
    </div>
  )
}

export function PreferencesPanel({ api }: IDockviewPanelProps): React.JSX.Element {
  const settings = useEditorSettings()
  const [fonts, setFonts] = useState<string[] | null>(null)

  useEffect(() => {
    api.setTitle('Preferences')
  }, [api])

  useEffect(() => {
    let active = true
    void window.openGms.listFonts().then((items) => {
      if (active) setFonts(items)
    }).catch(() => {
      if (active) setFonts([])
    })
    return () => { active = false }
  }, [])

  return (
    <section className="preferences-editor">
      <header className="preferences-head">
        <div className="sprite-title preferences-title">
          <span className="sprite-title-icon"><Settings2 size={18} /></span>
          <div><strong>Preferences</strong><small>Changes are saved automatically</small></div>
        </div>
        <button className="preferences-reset" onClick={resetEditorSettings}>
          <RotateCcw size={14} /> Restore Defaults
        </button>
      </header>

      <div className="preferences-body">
        <nav className="preferences-nav" aria-label="Preference categories">
          <button className="active"><Braces size={15} /><span>Code Editor</span></button>
        </nav>

        <main className="preferences-content">
          <section className="preferences-section">
            <header><Type size={18} /><div><h2>Editor Font</h2><p>Choose how code is displayed in scripts and embedded code editors.</p></div></header>
            <div className="preferences-fields">
              <div className="preferences-field wide">
                <span>Preferred font</span>
                <FontPicker
                  value={settings.fontFamily}
                  options={fonts ?? []}
                  loading={fonts === null}
                  onChange={(fontFamily) => updateEditorSettings({ fontFamily })}
                />
              </div>
              <div className="preferences-field wide">
                <span>Fallback font</span>
                <FontPicker
                  value={settings.fontFallback}
                  options={fonts ?? []}
                  loading={fonts === null}
                  onChange={(fontFallback) => updateEditorSettings({ fontFallback })}
                />
              </div>
              <label className="preferences-field">
                <span>Font size</span>
                <NumberField
                  min={9}
                  max={40}
                  value={settings.fontSize}
                  onChange={(fontSize) => updateEditorSettings({ fontSize })}
                />
              </label>
              <label className="preferences-field">
                <span>Line height</span>
                <NumberField
                  min={12}
                  max={64}
                  value={settings.lineHeight}
                  onChange={(lineHeight) => updateEditorSettings({ lineHeight })}
                />
              </label>
              <label className="preferences-field">
                <span>Tab size</span>
                <select
                  value={settings.tabSize}
                  onChange={(event) => updateEditorSettings({ tabSize: Number(event.target.value) })}
                >
                  {[2, 3, 4, 8].map((size) => <option key={size} value={size}>{size} spaces</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="preferences-section">
            <header><Braces size={18} /><div><h2>Editor Display</h2><p>These defaults apply to every Monaco code editor.</p></div></header>
            <div className="preferences-checks">
              <label><input type="checkbox" checked={settings.fontLigatures} onChange={(event) => updateEditorSettings({ fontLigatures: event.target.checked })} /><span><strong>Font ligatures</strong><small>Use programming ligatures when supported by the selected font.</small></span></label>
              <label><input type="checkbox" checked={settings.wordWrap} onChange={(event) => updateEditorSettings({ wordWrap: event.target.checked })} /><span><strong>Word wrap</strong><small>Wrap long lines to the editor width by default.</small></span></label>
              <label><input type="checkbox" checked={settings.minimap} onChange={(event) => updateEditorSettings({ minimap: event.target.checked })} /><span><strong>Minimap</strong><small>Show the code overview on the right side of the editor.</small></span></label>
            </div>
          </section>

          <section className="preferences-section">
            <header><Palette size={18} /><div><h2>Syntax Colors</h2><p>Customize GML and shader highlighting. Changes appear immediately in open editors.</p></div></header>
            <div className="preferences-colors">
              {colorFields.map((item) => (
                <ColorField
                  key={item.key}
                  label={item.label}
                  value={settings.colors[item.key]}
                  onChange={(color) => updateEditorSettings({
                    colors: { ...settings.colors, [item.key]: color }
                  })}
                />
              ))}
            </div>
          </section>

          <section className="preferences-preview">
            <span>Preview</span>
            <pre style={{
              fontFamily: codeFontFamily(settings.fontFamily, settings.fontFallback),
              fontSize: `${settings.fontSize}px`,
              lineHeight: `${settings.lineHeight}px`,
              fontVariantLigatures: settings.fontLigatures ? 'normal' : 'none',
              color: settings.colors.text
            }}><code>
                <span style={{ color: settings.colors.docComment, fontStyle: 'italic' }}>/// move_player(x pos, y pos, [relative])</span>{'\n'}
                <span style={{ color: settings.colors.keyword }}>var</span>{' speed '}<span style={{ color: settings.colors.operator }}>=</span>{' '}<span style={{ color: settings.colors.number }}>4</span>;{'\n'}
                <span style={{ color: settings.colors.variable }}>x</span>{' '}<span style={{ color: settings.colors.operator }}>+=</span>{' '}<span style={{ color: settings.colors.builtInFunction }}>lengthdir_x</span>(speed, <span style={{ color: settings.colors.variable }}>direction</span>);{'\n'}
                {'state '}<span style={{ color: settings.colors.operator }}>=</span>{' '}<span style={{ color: settings.colors.enumName }}>PlayerState</span>.<span style={{ color: settings.colors.enumMember }}>Move</span>;{'\n'}
                <span style={{ color: settings.colors.builtInFunction }}>instance_create</span>(<span style={{ color: settings.colors.variable }}>x</span>, <span style={{ color: settings.colors.variable }}>y</span>, <span style={{ color: settings.colors.resource }}>objPlayer</span>);{'\n'}
                <span style={{ color: settings.colors.builtInFunction }}>draw_set_color</span>(<span style={{ color: settings.colors.constant }}>c_white</span>);{'\n'}
                <span style={{ color: settings.colors.function }}>move_player</span>(<span style={{ color: settings.colors.variable }}>x</span>, <span style={{ color: settings.colors.variable }}>y</span>, <span style={{ color: settings.colors.constant }}>true</span>);{' '}<span style={{ color: settings.colors.comment, fontStyle: 'italic' }}>// Update position</span>{'\n'}
                <span style={{ color: settings.colors.builtInFunction }}>show_debug_message</span>(<span style={{ color: settings.colors.string }}>&quot;Ready&quot;</span>);
              </code></pre>
          </section>
        </main>
      </div>
    </section>
  )
}
