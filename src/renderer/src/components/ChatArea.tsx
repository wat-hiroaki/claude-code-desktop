import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { MessageBubble } from './MessageBubble'
import { cn } from '../lib/utils'
import {
  Send,
  RotateCw,
  Square
} from 'lucide-react'

export function ChatArea(): JSX.Element {
  const { t } = useTranslation()
  const { selectedAgentId, agents, messages, setMessages, addMessage } = useAppStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const agent = agents.find((a) => a.id === selectedAgentId)
  const agentMessages = selectedAgentId ? messages[selectedAgentId] || [] : []

  const loadMessages = useCallback(async () => {
    if (selectedAgentId) {
      const msgs = await window.api.getMessages(selectedAgentId)
      setMessages(selectedAgentId, msgs)
    }
  }, [selectedAgentId, setMessages])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [agentMessages.length])

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || !selectedAgentId) return
    const content = input.trim()
    setInput('')

    addMessage(selectedAgentId, {
      id: Date.now(),
      agentId: selectedAgentId,
      role: 'manager',
      contentType: 'text',
      content,
      metadata: null,
      createdAt: new Date().toISOString()
    })

    await window.api.sendMessage(selectedAgentId, content)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>{t('chat.selectAgent')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{agent.name} #{agent.sessionNumber}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded',
                agent.status === 'active' && 'bg-green-500/20 text-green-400',
                agent.status === 'thinking' && 'bg-blue-500/20 text-blue-400',
                agent.status === 'tool_running' && 'bg-yellow-500/20 text-yellow-400',
                agent.status === 'awaiting' && 'bg-orange-500/20 text-orange-400',
                agent.status === 'error' && 'bg-red-500/20 text-red-400'
              )}>
                {t(`agent.status.${agent.status}`)}
              </span>
            </div>
            {agent.currentTask && (
              <p className="text-xs text-muted-foreground">{agent.currentTask}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => window.api.interruptAgent(agent.id)}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
            title={t('agent.actions.interrupt')}
          >
            <Square size={14} />
          </button>
          <button
            onClick={() => window.api.restartAgent(agent.id)}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
            title={t('agent.actions.restart')}
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {agentMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('chat.noMessages')}
          </div>
        ) : (
          agentMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            className="flex-1 resize-none bg-secondary rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground min-h-[40px] max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
