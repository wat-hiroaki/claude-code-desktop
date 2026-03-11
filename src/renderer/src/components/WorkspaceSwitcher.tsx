import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { cn } from '../lib/utils'
import { ChevronDown, Plus, Laptop, Server } from 'lucide-react'
import type { Workspace } from '@shared/types'

interface WorkspaceSwitcherProps {
  className?: string
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps): JSX.Element {
  const { t } = useTranslation()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { activeWorkspaceId, setActiveWorkspaceId } = useAppStore()

  const loadWorkspaces = useCallback(async () => {
    const ws = await window.api.getWorkspaces()
    setWorkspaces(ws)
  }, [])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  const handleSelect = async (id: string | null): Promise<void> => {
    await window.api.setActiveWorkspace(id)
    setActiveWorkspaceId(id)
    setIsOpen(false)
  }

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    const ws = await window.api.createWorkspace({
      name: newName.trim(),
      connectionType: 'local'
    })
    setNewName('')
    setIsCreating(false)
    await loadWorkspaces()
    await handleSelect(ws.id)
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm',
          'border border-border/50 hover:bg-muted/50 transition-colors',
          'text-left'
        )}
      >
        {activeWorkspace ? (
          <>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeWorkspace.color }}
            />
            <span className="truncate flex-1 font-medium">{activeWorkspace.name}</span>
            {activeWorkspace.connectionType === 'ssh' && (
              <Server size={12} className="text-muted-foreground shrink-0" />
            )}
          </>
        ) : (
          <>
            <Laptop size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate flex-1 text-muted-foreground">
              {t('workspace.allAgents', 'All Agents')}
            </span>
          </>
        )}
        <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* All agents option */}
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
              !activeWorkspaceId && 'bg-primary/10'
            )}
          >
            <Laptop size={14} className="text-muted-foreground" />
            <span>{t('workspace.allAgents', 'All Agents')}</span>
          </button>

          {workspaces.length > 0 && (
            <div className="border-t border-border/50">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
                    activeWorkspaceId === ws.id && 'bg-primary/10'
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ws.color }}
                  />
                  <span className="truncate flex-1">{ws.name}</span>
                  {ws.connectionType === 'ssh' && (
                    <Server size={12} className="text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-border/50">
            {isCreating ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') setIsCreating(false)
                  }}
                  placeholder={t('workspace.namePlaceholder', 'Workspace name...')}
                  className="flex-1 bg-transparent text-sm border-none outline-none placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {t('common.create', 'Create')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus size={14} />
                <span>{t('workspace.create', 'New Workspace')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
