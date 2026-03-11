import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { X, Radio } from 'lucide-react'

export function BroadcastModal(): JSX.Element | null {
  const { t } = useTranslation()
  const { showBroadcast, toggleBroadcast, agents } = useAppStore()
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  if (!showBroadcast) return null

  const activeAgents = agents.filter((a) => a.status !== 'archived')

  const toggleAgent = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = (): void => {
    setSelected(new Set(activeAgents.map((a) => a.id)))
  }

  const handleSend = async (): Promise<void> => {
    if (!message.trim() || selected.size === 0) return
    setSending(true)
    try {
      await window.api.broadcast(Array.from(selected), message.trim())
      setMessage('')
      setSelected(new Set())
      toggleBroadcast()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl w-[560px] max-h-[80vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-primary" />
            <h3 className="font-semibold">{t('broadcast.title')}</h3>
          </div>
          <button onClick={toggleBroadcast} className="p-1 rounded hover:bg-accent">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{t('broadcast.subtitle')}</p>

          {/* Agent Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {selected.size}/{activeAgents.length} selected
              </span>
              <button
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                {t('broadcast.selectAll')}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {activeAgents.map((agent) => (
                <label
                  key={agent.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(agent.id)}
                    onChange={() => toggleAgent(agent.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{agent.name}</span>
                  {agent.roleLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {agent.roleLabel}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('broadcast.placeholder')}
            rows={4}
            className="w-full px-3 py-2 bg-secondary rounded-lg text-sm outline-none resize-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={toggleBroadcast}
            className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim() || selected.size === 0 || sending}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {sending ? t('common.loading') : t('broadcast.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
