import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export function ShortcutHelp(): JSX.Element | null {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const SHORTCUTS = [
    { keys: 'Ctrl+N', action: t('shortcuts.newAgent', 'New Agent') },
    { keys: 'Ctrl+K', action: t('shortcuts.commandPalette', 'Command Palette') },
    { keys: 'Ctrl+L', action: t('shortcuts.focusComposer', 'Focus Composer') },
    { keys: 'Ctrl+D', action: t('shortcuts.toggleDashboard', 'Toggle Dashboard') },
    { keys: 'Ctrl+Shift+B', action: t('shortcuts.broadcast', 'Broadcast') },
    { keys: 'Ctrl+Shift+P', action: t('shortcuts.toggleRightPane', 'Toggle Right Pane') },
    { keys: 'Ctrl+Tab', action: t('shortcuts.nextAgent', 'Next Agent') },
    { keys: 'Ctrl+Shift+Tab', action: t('shortcuts.previousAgent', 'Previous Agent') },
    { keys: 'Ctrl+1-9', action: t('shortcuts.switchAgent', 'Switch to Agent #N') },
    { keys: 'Ctrl+W', action: t('shortcuts.archiveAgent', 'Archive Agent') },
    { keys: 'Ctrl+=', action: t('shortcuts.zoomIn', 'Zoom In (Terminal Font)') },
    { keys: 'Ctrl+-', action: t('shortcuts.zoomOut', 'Zoom Out (Terminal Font)') },
    { keys: 'Up/Down', action: t('shortcuts.messageHistory', 'Message History (in Composer)') },
    { keys: 'Enter', action: t('shortcuts.sendMessage', 'Send Message') },
    { keys: 'Shift+Enter', action: t('shortcuts.newLine', 'New Line') },
    { keys: 'Ctrl+?', action: t('shortcuts.thisHelp', 'This Help') }
  ]

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === '?') {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)} role="dialog" aria-modal="true">
      <div
        className="bg-card border border-border rounded-xl w-[400px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{t('shortcuts.title', 'Keyboard Shortcuts')}</h3>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-accent">
            <X size={14} />
          </button>
        </div>
        <div className="p-2 max-h-[400px] overflow-y-auto">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs text-muted-foreground">{s.action}</span>
              <kbd className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
