import { useEffect, useState } from 'react'

/** Chrome/Edge/Android's deferred install prompt (not in the standard DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

// iPadOS reports itself as a Mac, so also check for touch.
const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (isStandalone()) return null

  if (installPrompt) {
    return (
      <button
        type="button"
        className="install-btn"
        onClick={async () => {
          await installPrompt.prompt()
          setInstallPrompt(null)
        }}
      >
        Install app
      </button>
    )
  }

  // iOS has no install prompt; people add it from Safari's Share menu.
  if (!isIos()) return null
  return (
    <>
      <button
        type="button"
        className="install-btn"
        aria-expanded={showIosHint}
        onClick={() => setShowIosHint((v) => !v)}
      >
        Install app
      </button>
      {showIosHint && (
        <p className="install-hint" role="status">
          Tap the Share button <span aria-hidden="true">⬆️</span>, then “Add to Home Screen”.
        </p>
      )}
    </>
  )
}
