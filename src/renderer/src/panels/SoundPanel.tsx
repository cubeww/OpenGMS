import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ExternalLink,
  FolderOpen,
  HardDrive,
  Play,
  Radio,
  SlidersHorizontal,
  Square,
  Volume2
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { ProjectItem, SoundData, SoundMode } from '../../../shared/types'
import { assetUrl } from '../assets'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'

type SoundItem = Extract<ProjectItem, { kind: 'resource' }>

export type SoundParams = {
  item: SoundItem
  projectPath: string
}

const modes: Array<{ value: SoundMode; title: string; note: string }> = [
  { value: 'uncompressed', title: 'Uncompressed', note: 'In memory · Low CPU' },
  { value: 'compressed', title: 'Compressed', note: 'In memory · Higher CPU' },
  { value: 'decompress', title: 'Decompress on load', note: 'Higher memory · Low CPU' },
  { value: 'streamed', title: 'Streamed', note: 'On disk · Higher CPU' }
]

let audioRevision = 0

function nextAudioRevision(): number {
  audioRevision += 1
  return audioRevision
}

function copySound(sound: SoundData): SoundData {
  return { ...sound }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function time(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function values(options: number[], current: number): number[] {
  return Array.from(new Set([...options, current])).sort((left, right) => left - right)
}

export function SoundPanel({ params, api }: IDockviewPanelProps<SoundParams>): React.JSX.Element {
  const source = params.item.sound
  const [sound, setSound] = useState<SoundData | null>(() => (source ? copySound(source) : null))
  const [saved, setSaved] = useState(() => (source ? JSON.stringify(source) : ''))
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [audioVersion, setAudioVersion] = useState(nextAudioRevision)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const project = useApp((state) => state.project)
  const updateSound = useApp((state) => state.updateSound)
  const addLog = useApp((state) => state.addLog)
  const dirty = sound ? JSON.stringify(sound) !== saved : false
  useSave(api.id, dirty, save)
  const audioUrl = sound?.audio && !sound.missing
    ? assetUrl(sound.audio, params.projectPath, audioVersion)
    : undefined

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.load()
    setPlaying(false)
    setPosition(0)
    setDuration(0)
  }, [audioUrl])

  useEffect(() => {
    if (audioRef.current && sound) audioRef.current.volume = sound.volume
  }, [sound?.volume])

  useEffect(() => () => audioRef.current?.pause(), [])

  const bars = useMemo(() => {
    const seed = sound?.data || params.item.name
    return Array.from({ length: 64 }, (_, index) => {
      const code = seed.charCodeAt(index % Math.max(seed.length, 1)) || 47
      return 18 + ((code * (index + 5) * 13) % 70)
    })
  }, [params.item.name, sound?.data])

  if (!sound) {
    return (
      <div className="sound-empty">
        <Volume2 size={34} />
        <strong>Sound data is unavailable</strong>
        <span>The sound descriptor is missing or could not be parsed.</span>
      </div>
    )
  }
  const data = sound
  const groups = project?.audioGroups ?? ['audiogroup_default']

  function patch(change: Partial<SoundData>): void {
    setSound((current) => current ? { ...current, ...change } : current)
  }

  async function save(): Promise<void> {
    if (!sound || !dirty || saving) return
    const next = copySound(sound)
    setSaving(true)
    try {
      await window.openGms.saveSound(params.item.file, next)
      updateSound(params.item.id, next)
      setSaved(JSON.stringify(next))
      addLog(`Saved sound ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save sound ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  async function replace(): Promise<void> {
    if (loading) return
    setLoading(true)
    try {
      const file = await window.openGms.replaceSound(params.item.file)
      if (!file) return
      setSound((current) => current ? { ...current, ...file, missing: false } : current)
      setAudioVersion(nextAudioRevision())
      addLog(`Loaded new audio for ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to load audio for ${params.item.name}: ${errorText(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function play(): Promise<void> {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    try {
      await audio.play()
      setPlaying(true)
    } catch (error) {
      addLog(`Could not play ${params.item.name}: ${errorText(error)}`)
    }
  }

  function stop(): void {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
    setPosition(0)
  }

  async function openExternal(): Promise<void> {
    if (!data.audio || data.missing) return
    try {
      const error = await window.openGms.openSound(data.audio)
      addLog(error || `Opened ${params.item.name} in the external audio editor.`)
    } catch (error) {
      addLog(`Could not open ${params.item.name}: ${errorText(error)}`)
    }
  }

  return (
    <section className="sound-editor">
      <header className="sound-editor-head">
        <div className="sprite-title sound-title">
          <span className="sprite-title-icon"><Volume2 size={18} /></span>
          <div><strong>{params.item.name}</strong><small>Sound resource</small></div>
        </div>
        <EditorOk api={api} />
      </header>

      <div className="sound-editor-body">
        <div className="sound-settings">
          <section className="sprite-group sound-source-group">
            <h3><Volume2 size={15} /> Sound</h3>
            <div className="sprite-group-body">
              <label className="sprite-text-field">
                <span>Name</span>
                <ResourceName item={params.item} />
              </label>
              <label className="sprite-text-field">
                <span>Filename</span>
                <input value={data.originName || data.audio || 'No audio loaded'} readOnly />
              </label>
              <button className="sprite-wide-button" onClick={() => void replace()} disabled={loading}>
                <FolderOpen size={15} /> {loading ? 'Loading…' : 'Load Sound'}
              </button>
            </div>
          </section>

          <section className="sprite-group sound-mode-group">
            <h3><HardDrive size={15} /> Attributes</h3>
            <div className="sprite-group-body sound-modes">
              {modes.map((mode) => (
                <label className={`sound-mode ${data.mode === mode.value ? 'active' : ''}`} key={mode.value}>
                  <input
                    type="radio"
                    name={`sound-mode-${params.item.id}`}
                    checked={data.mode === mode.value}
                    onChange={() => patch({ mode: mode.value })}
                  />
                  <span><strong>{mode.title}</strong><small>{mode.note}</small></span>
                </label>
              ))}
            </div>
          </section>

          <section className="sprite-group">
            <h3><SlidersHorizontal size={15} /> Target Options</h3>
            <div className="sprite-group-body sound-target-grid">
              <label className="sprite-text-field">
                <span>Channels</span>
                <select value={data.stereo ? 'stereo' : 'mono'} onChange={(event) => patch({ stereo: event.target.value === 'stereo' })}>
                  <option value="mono">Mono</option>
                  <option value="stereo">Stereo</option>
                </select>
              </label>
              <label className="sprite-text-field">
                <span>Sample Rate</span>
                <select value={data.sampleRate} onChange={(event) => patch({ sampleRate: Number(event.target.value) })}>
                  {values([11025, 22050, 32000, 44100, 48000], data.sampleRate).map((value) => <option key={value} value={value}>{value} Hz</option>)}
                </select>
              </label>
              <label className="sprite-text-field">
                <span>Bit Depth</span>
                <select value={data.bitDepth} onChange={(event) => patch({ bitDepth: Number(event.target.value) })}>
                  {values([8, 16, 24, 32], data.bitDepth).map((value) => <option key={value} value={value}>{value} bit</option>)}
                </select>
              </label>
              <label className="sprite-text-field">
                <span>Bit Rate</span>
                <select value={data.bitRate} onChange={(event) => patch({ bitRate: Number(event.target.value) })}>
                  {values([96, 128, 160, 192, 224, 256, 320], data.bitRate).map((value) => <option key={value} value={value}>{value} kbps</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="sprite-group">
            <h3><Radio size={15} /> Output</h3>
            <div className="sprite-group-body">
              <label className="sprite-range-field sound-volume">
                <span>Volume <strong>{Math.round(data.volume * 100)}%</strong></span>
                <input type="range" min="0" max="100" value={Math.round(data.volume * 100)} onChange={(event) => patch({ volume: Number(event.target.value) / 100 })} />
              </label>
              <label className="sprite-text-field">
                <span>Audio Group</span>
                <select value={data.audioGroup} onChange={(event) => patch({ audioGroup: Number(event.target.value) })}>
                  {groups.map((name, index) => <option key={`${name}-${index}`} value={index}>{name}</option>)}
                  {data.audioGroup >= groups.length && <option value={data.audioGroup}>Audio Group {data.audioGroup}</option>}
                </select>
              </label>
            </div>
          </section>
        </div>

        <aside className="sound-preview">
          <div className="sound-preview-head">
            <div>
              <strong>Audio Preview</strong>
              <span>{data.extension ? data.extension.slice(1).toUpperCase() : 'AUDIO'}</span>
            </div>
            <span className={`sound-source-state ${data.missing ? 'missing' : ''}`}>
              {data.missing ? 'Source missing' : 'Source ready'}
            </span>
          </div>

          <div className="sound-wave-area">
            <div className={`sound-disc ${playing ? 'playing' : ''}`}><Volume2 size={28} /></div>
            <div className="sound-wave" aria-hidden="true">
              {bars.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
            </div>
            <strong className="sound-file-name">{data.data || 'No audio file'}</strong>
            <span className="sound-file-path">{data.audio ?? 'Load an audio file to preview this sound.'}</span>
          </div>

          <div className="sound-transport">
            <input
              className="sound-progress"
              type="range"
              min="0"
              max={duration || 1}
              step="0.01"
              value={Math.min(position, duration || 1)}
              disabled={!audioUrl || duration <= 0}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (audioRef.current) audioRef.current.currentTime = next
                setPosition(next)
              }}
              aria-label="Playback position"
            />
            <div className="sound-time"><span>{time(position)}</span><span>{time(duration)}</span></div>
            <div className="sound-buttons">
              <button className="sound-play" onClick={() => void play()} disabled={!audioUrl || playing} title="Play">
                <Play size={16} fill="currentColor" /> Play
              </button>
              <button onClick={stop} disabled={!audioUrl} title="Stop">
                <Square size={14} fill="currentColor" /> Stop
              </button>
              <button onClick={() => void openExternal()} disabled={!audioUrl} title="Open in the default audio application">
                <ExternalLink size={15} /> Open Externally
              </button>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onEnded={() => setPlaying(false)}
            onError={() => addLog(`${params.item.name}: ${data.missing ? 'Source file is missing' : 'Audio preview is unavailable'}`)}
          />
        </aside>
      </div>
    </section>
  )
}
