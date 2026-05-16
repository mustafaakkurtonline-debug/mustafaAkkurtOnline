import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

// Captured at module level so we never miss the early-fired event
let _prompt: BeforeInstallPromptEvent | null = null
const _listeners = new Set<(canInstall: boolean) => void>()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  _prompt = e as BeforeInstallPromptEvent
  _listeners.forEach(fn => { fn(true) })
})

window.addEventListener('appinstalled', () => {
  _prompt = null
  _listeners.forEach(fn => { fn(false) })
})

export function usePWAInstall(): { canInstall: boolean; promptInstall: () => Promise<boolean> } {
  const [canInstall, setCanInstall] = useState(() => _prompt !== null)

  useEffect(() => {
    const notify = (value: boolean) => { setCanInstall(value) }
    _listeners.add(notify)
    return () => { _listeners.delete(notify) }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!_prompt) return false
    await _prompt.prompt()
    const { outcome } = await _prompt.userChoice
    _prompt = null
    setCanInstall(false)
    return outcome === 'accepted'
  }

  return { canInstall, promptInstall }
}
