import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Send, X, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface PromptTemplate {
  label: string
  value: string
  category: string
}

const TEMPLATES: PromptTemplate[] = [
  { label: '/compact', value: '/compact', category: 'command' },
  { label: '/clear', value: '/clear', category: 'command' },
  { label: '/help', value: '/help', category: 'command' },
  { label: 'Code Review', value: 'Please review the recent changes and provide feedback on code quality, potential bugs, and improvements.', category: 'review' },
  { label: 'Run Tests', value: 'Run the test suite and report any failures.', category: 'dev' },
  { label: 'Build & Lint', value: 'Run npm run build && npm run lint and fix any issues found.', category: 'dev' },
  { label: 'Git Status', value: 'Show me the current git status and recent changes.', category: 'git' },
  { label: 'Summarize', value: 'Please summarize what you have done so far in this session.', category: 'info' }
]

const MIN_HEIGHT = 38
const MAX_HEIGHT = 400
const DEFAULT_MAX_HEIGHT = 200

interface ComposerProps {
  agentId: string
  disabled?: boolean
  className?: string
}

// Per-agent message history (persists across re-renders, max 50 entries)
const historyMap = new Map<string, string[]>()

export function Composer({ agentId, disabled = false, className }: ComposerProps): JSX.Element {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [customMaxHeight, setCustomMaxHeight] = useState(() => {
    const saved = localStorage.getItem('composerHeight')
    return saved ? parseInt(saved) : 0
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const templatesRef = useRef<HTMLDivElement>(null)
  const savedDraft = useRef('')
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  const effectiveMaxHeight = customMaxHeight > 0 ? customMaxHeight : DEFAULT_MAX_HEIGHT

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return

    // Add to history
    const history = historyMap.get(agentId) ?? []
    if (history[0] !== trimmed) {
      history.unshift(trimmed)
      if (history.length > 50) history.pop()
      historyMap.set(agentId, history)
    }
    setHistoryIndex(-1)
    savedDraft.current = ''

    // Send text to PTY, then send carriage return separately after a short delay.
    // Sending them together in a single write can cause Claude CLI's readline
    // to not process the \r as an Enter keystroke.
    window.api.ptyWrite(agentId, trimmed)
    setTimeout(() => {
      window.api.ptyWrite(agentId, '\r')
    }, 50)
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [agentId, value, disabled])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter or Cmd+Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
        return
      }
      // Enter without modifiers also sends (Shift+Enter for newline)
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        handleSend()
        return
      }
      // Up arrow — browse history (only when cursor is at the start or value is empty)
      const history = historyMap.get(agentId) ?? []
      if (e.key === 'ArrowUp' && history.length > 0) {
        const textarea = textareaRef.current
        if (textarea && (textarea.selectionStart === 0 || !value)) {
          e.preventDefault()
          if (historyIndex === -1) savedDraft.current = value
          const newIdx = Math.min(historyIndex + 1, history.length - 1)
          setHistoryIndex(newIdx)
          setValue(history[newIdx])
        }
      }
      // Down arrow — forward in history
      if (e.key === 'ArrowDown' && historyIndex >= 0) {
        const textarea = textareaRef.current
        if (textarea && (textarea.selectionStart === value.length || !value)) {
          e.preventDefault()
          const newIdx = historyIndex - 1
          setHistoryIndex(newIdx)
          setValue(newIdx < 0 ? savedDraft.current : history[newIdx])
        }
      }
    },
    [handleSend, agentId, value, historyIndex]
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    // Auto-expand height
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, effectiveMaxHeight)}px`
  }, [effectiveMaxHeight])

  const handleClear = useCallback(() => {
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }, [])

  const handleTemplate = useCallback((template: PromptTemplate) => {
    setValue(template.value)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }, [])

  // Close templates on outside click
  useEffect(() => {
    if (!showTemplates) return
    const handler = (e: MouseEvent): void => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) {
        setShowTemplates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTemplates])

  // Drag resize handlers
  const handleDragStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartY.current = e.clientY
    const textarea = textareaRef.current
    dragStartHeight.current = textarea ? textarea.offsetHeight : effectiveMaxHeight
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }, [effectiveMaxHeight])

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent): void => {
      if (!isDragging.current) return
      const delta = dragStartY.current - e.clientY
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartHeight.current + delta))
      setCustomMaxHeight(newHeight)
      if (textareaRef.current) {
        textareaRef.current.style.height = `${newHeight}px`
      }
    }

    const handleMouseUp = (): void => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      // Persist
      const textarea = textareaRef.current
      if (textarea) {
        const h = textarea.offsetHeight
        localStorage.setItem('composerHeight', String(h))
        window.api.updateSettings({ composerHeight: h })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div
      className={cn('border-t border-border/50 bg-card/80 backdrop-blur-sm', className)}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-primary/50') }}
      onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-primary/50') }}
      onDrop={(e) => {
        e.preventDefault()
        e.currentTarget.classList.remove('ring-2', 'ring-primary/50')
        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
          const paths = files.map((f) => (f as unknown as { path?: string }).path).filter(Boolean).join('\n')
          if (paths) setValue((v) => v + (v ? '\n' : '') + paths)
        }
      }}
    >
      {/* Drag handle for resizing */}
      <div
        className="flex items-center justify-center h-3 cursor-ns-resize group hover:bg-border/30 transition-colors"
        onMouseDown={handleDragStart}
        title={t('composer.dragResize', 'Drag to resize')}
      >
        <GripHorizontal size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60" />
      </div>

      <div className="flex items-end gap-2 p-2 pt-0">
        <textarea
          ref={textareaRef}
          data-composer-input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder={disabled ? t('composer.waiting', 'Agent is busy...') : t('composer.placeholder', 'Type a message... (Enter to send, Shift+Enter for newline)')}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-md border border-border/50 bg-background/50 px-3 py-2',
            'text-sm font-mono placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-1 focus:ring-primary/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'scrollbar-thin scrollbar-thumb-border'
          )}
          style={{ minHeight: `${MIN_HEIGHT}px`, maxHeight: `${effectiveMaxHeight}px` }}
        />
        <div className="flex gap-1">
          {value && (
            <button
              onClick={handleClear}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:bg-muted/50 transition-colors"
              title={t('composer.clear', 'Clear')}
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className={cn(
              'flex h-[38px] w-[38px] items-center justify-center rounded-md transition-colors',
              value.trim() && !disabled
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border/50 text-muted-foreground/50 cursor-not-allowed'
            )}
            title={t('composer.send', 'Send (Ctrl+Enter)')}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 pb-1.5 text-[10px] text-muted-foreground/60">
        <span>Enter {t('composer.toSend', 'to send')}</span>
        <span>·</span>
        <span>Shift+Enter {t('composer.forNewline', 'for newline')}</span>
        <div className="relative ml-auto" ref={templatesRef}>
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="flex items-center gap-1 cursor-pointer hover:text-muted-foreground/80"
          >
            {showTemplates ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            <span>{t('composer.templates', 'Templates')}</span>
          </button>
          {showTemplates && (
            <div className="absolute bottom-full right-0 mb-1 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  onClick={() => handleTemplate(tmpl)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <span className={cn(
                    'text-[9px] px-1 py-0.5 rounded',
                    tmpl.category === 'command' ? 'bg-blue-500/20 text-blue-400' :
                    tmpl.category === 'review' ? 'bg-yellow-500/20 text-yellow-400' :
                    tmpl.category === 'git' ? 'bg-green-500/20 text-green-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {t(`composer.category.${tmpl.category}`, tmpl.category)}
                  </span>
                  <span className="truncate">{tmpl.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
