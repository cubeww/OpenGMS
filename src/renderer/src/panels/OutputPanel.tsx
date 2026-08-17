import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  CaseSensitive,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Search,
  Terminal,
  Trash2,
  TriangleAlert,
  WholeWord
} from 'lucide-react'
import {
  openCodeSearchResult,
  searchProjectCode,
  type CodeSearchOptions,
  type CodeSearchReport
} from '../codeSearch'
import { useApp } from '../store'

export type OutputTab = 'Output' | 'Problems' | 'Search'

const defaultOptions: CodeSearchOptions = {
  matchCase: false,
  wholeWord: false
}

export function OutputPanel(): React.JSX.Element {
  const [tab, setTab] = useState<OutputTab>('Output')
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState(defaultOptions)
  const [report, setReport] = useState<CodeSearchReport | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const followOutput = useRef(true)
  const searchVersion = useRef(0)
  const logs = useApp((state) => state.logs)
  const clearLogs = useApp((state) => state.clearLogs)
  const project = useApp((state) => state.project)

  useEffect(() => {
    const showOutput = (): void => setTab('Output')
    const activate = (event: Event): void => {
      const next = (event as CustomEvent<OutputTab>).detail
      if (next !== 'Output' && next !== 'Problems' && next !== 'Search') return
      setTab(next)
      if (next === 'Search') {
        window.requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
    window.addEventListener('opengms:show-output', showOutput)
    window.addEventListener('opengms:activate-output-tab', activate)
    return () => {
      window.removeEventListener('opengms:show-output', showOutput)
      window.removeEventListener('opengms:activate-output-tab', activate)
    }
  }, [])

  useEffect(() => {
    searchVersion.current += 1
    setReport(null)
    setSearching(false)
    setError('')
  }, [project?.path])

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (tab !== 'Output' || !body || !followOutput.current) return
    body.scrollTop = body.scrollHeight
  }, [logs.length, tab])

  async function runSearch(): Promise<void> {
    const current = project
    const text = query.trim()
    const version = searchVersion.current + 1
    searchVersion.current = version
    setError('')

    if (!current || !text) {
      setReport(null)
      setSearching(false)
      return
    }

    setSearching(true)
    try {
      const next = await searchProjectCode(current, text, options)
      if (searchVersion.current === version) setReport(next)
    } catch (reason) {
      if (searchVersion.current !== version) return
      setReport(null)
      setError(reason instanceof Error ? reason.message : 'Project search failed.')
    } finally {
      if (searchVersion.current === version) setSearching(false)
    }
  }

  function toggle(option: keyof CodeSearchOptions): void {
    setOptions((current) => ({ ...current, [option]: !current[option] }))
  }

  function clearSearch(): void {
    searchVersion.current += 1
    setReport(null)
    setSearching(false)
    setError('')
  }

  function clearCurrent(): void {
    if (tab === 'Output') {
      followOutput.current = true
      clearLogs()
    }
    else if (tab === 'Search') clearSearch()
  }

  function trackOutputScroll(): void {
    const body = bodyRef.current
    if (tab !== 'Output' || !body) return
    const distance = body.scrollHeight - body.scrollTop - body.clientHeight
    followOutput.current = distance <= 32
  }

  const clearDisabled = tab === 'Output'
    ? logs.length === 0
    : tab === 'Problems'
      ? true
      : !report && !error && !searching

  return (
    <section className="output-panel">
      <div className="output-tabs" role="tablist">
        <button className={tab === 'Output' ? 'active' : ''} onClick={() => setTab('Output')}>
          Output
        </button>
        <button className={tab === 'Problems' ? 'active' : ''} onClick={() => setTab('Problems')}>
          Problems <span className="tab-count">0</span>
        </button>
        <button className={tab === 'Search' ? 'active' : ''} onClick={() => setTab('Search')}>
          Search {report && <span className="tab-count">{report.results.length}</span>}
        </button>
        <button
          className="output-clear"
          onClick={clearCurrent}
          disabled={clearDisabled}
          title={`Clear ${tab.toLowerCase()}`}
        ><Trash2 size={13} /><span>Clear</span></button>
      </div>

      <div
        ref={bodyRef}
        className={`output-body ${tab === 'Search' ? 'search-open' : ''}`}
        onScroll={trackOutputScroll}
      >
        {tab === 'Output' &&
          logs.map((line, index) => (
            <div className={`log-line ${line.kind}`} key={`${line.text}-${index}`}>
              <span className="log-time">
                {line.kind === 'build' ? 'BUILD' : line.kind === 'error' ? 'ERROR' : 'PROJECT'}
              </span>
              {line.kind === 'build'
                ? <Terminal size={14} />
                : line.kind === 'error'
                  ? <CircleX size={14} />
                  : <CircleCheck size={14} />}
              <span>{line.text}</span>
            </div>
          ))}
        {tab === 'Problems' && (
          <div className="empty-output">
            <TriangleAlert size={18} /> No problems detected
          </div>
        )}
        {tab === 'Search' && (
          <div className="code-search">
            <form className="code-search-bar" onSubmit={(event) => { event.preventDefault(); void runSearch() }}>
              <Search size={15} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search all project code"
                aria-label="Search all project code"
                spellCheck={false}
              />
              <button
                type="button"
                className={options.matchCase ? 'active' : ''}
                onClick={() => toggle('matchCase')}
                title="Match case"
                aria-pressed={options.matchCase}
              ><CaseSensitive size={15} /></button>
              <button
                type="button"
                className={options.wholeWord ? 'active' : ''}
                onClick={() => toggle('wholeWord')}
                title="Match whole word"
                aria-pressed={options.wholeWord}
              ><WholeWord size={15} /></button>
              <button type="submit" className="search-submit" disabled={!project || !query.trim() || searching}>
                {searching ? <LoaderCircle className="spin" size={14} /> : 'Search'}
              </button>
            </form>

            <div className="code-search-summary">
              {searching && <span>Searching project code…</span>}
              {!searching && report && (
                <span>
                  {report.results.length} {report.results.length === 1 ? 'result' : 'results'} in {report.sources} code locations
                  {report.truncated ? ' · first 5,000 shown' : ''}
                  {report.errors ? ` · ${report.errors} files could not be read` : ''}
                </span>
              )}
              {!searching && error && <span className="error">{error}</span>}
              {!searching && !report && !error && <span>Scripts, shaders, actions, rooms and macros are searched.</span>}
            </div>

            <div className="code-search-results">
              {report?.results.map((result) => (
                <button
                  className="code-search-result"
                  key={result.id}
                  onClick={() => openCodeSearchResult(result)}
                  title={`Open ${result.resourceName} at line ${result.line}`}
                >
                  <span className="code-search-result-head">
                    <strong>{result.resourceName}</strong>
                    <span>{result.section}</span>
                    <small>Ln {result.line}, Col {result.column}</small>
                  </span>
                  <code className="code-search-preview">
                    <span>{result.before}</span><mark>{result.match}</mark><span>{result.after}</span>
                  </code>
                </button>
              ))}
              {!searching && report?.results.length === 0 && (
                <div className="code-search-empty"><Search size={18} /><span>No code matches found.</span></div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
