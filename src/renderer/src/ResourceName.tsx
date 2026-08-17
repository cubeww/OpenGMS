import { useEffect, useRef, useState } from 'react'
import { renameResource, type ResourceItem } from './resources'
import { useApp } from './store'

type ResourceNameProps = {
  item: ResourceItem
  className?: string
  disabled?: boolean
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Rename failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

export function ResourceName({ item, className, disabled = false }: ResourceNameProps): React.JSX.Element {
  const addLog = useApp((state) => state.addLog)
  const [name, setName] = useState(item.name)
  const [busy, setBusy] = useState(false)
  const committing = useRef(false)
  const cancel = useRef(false)

  useEffect(() => {
    setName(item.name)
  }, [item.id, item.name])

  async function commit(): Promise<void> {
    if (committing.current || cancel.current) {
      cancel.current = false
      return
    }
    const next = name.trim()
    if (!next || next === item.name) {
      setName(item.name)
      return
    }

    committing.current = true
    setBusy(true)
    try {
      await renameResource(item, next)
      addLog(`Renamed ${item.name} to ${next}.`)
    } catch (error) {
      const message = errorText(error)
      setName(item.name)
      addLog(`Could not rename ${item.name}: ${message}`, 'error')
    } finally {
      committing.current = false
      setBusy(false)
    }
  }

  return (
    <input
      className={className}
      value={name}
      disabled={disabled || busy}
      spellCheck={false}
      aria-label="Resource name"
      title="Rename resource"
      onChange={(event) => setName(event.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          cancel.current = true
          setName(item.name)
          event.currentTarget.blur()
        }
      }}
    />
  )
}
