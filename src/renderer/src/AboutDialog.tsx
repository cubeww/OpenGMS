import { useEffect } from 'react'
import { X } from 'lucide-react'
import packageInfo from '../../../package.json'

type AboutDialogProps = {
  onClose: () => void
}

export function AboutDialog({ onClose }: AboutDialogProps): React.JSX.Element {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div className="about-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <strong>About OpenGMS</strong>
          <button type="button" onClick={onClose} title="Close" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="about-body">
          <div className="brand-mark about-logo" aria-hidden="true">G</div>
          <div className="about-copy">
            <h1 id="about-title">OpenGMS</h1>
            <span>Version {packageInfo.version}</span>
            <p>{packageInfo.description}</p>
            <dl>
              <dt>Author</dt>
              <dd>Cube</dd>
            </dl>
          </div>
        </div>

        <footer>
          <button type="button" className="primary" onClick={onClose} autoFocus>OK</button>
        </footer>
      </section>
    </div>
  )
}
