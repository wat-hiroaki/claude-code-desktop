import { useTranslation } from 'react-i18next'
import type { Agent, AgentStatus } from '@shared/types'
import { cn } from '../lib/utils'

const statusColors: Record<AgentStatus, string> = {
  creating: 'bg-gray-400',
  active: 'bg-green-500',
  thinking: 'bg-blue-500 animate-pulse',
  tool_running: 'bg-yellow-500',
  awaiting: 'bg-orange-500',
  error: 'bg-red-500',
  idle: 'bg-gray-400',
  archived: 'bg-gray-300'
}

interface AgentCardProps {
  agent: Agent
  isSelected: boolean
  onClick: () => void
}

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps): JSX.Element {
  const { t } = useTranslation()

  const initials = agent.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50',
        isSelected && 'bg-accent'
      )}
    >
      {/* Avatar with status dot */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
          {initials}
        </div>
        <div
          className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card', statusColors[agent.status])}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">
            {agent.name}
          </span>
          {agent.roleLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {agent.roleLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {agent.currentTask || t(`agent.status.${agent.status}`)}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-col items-end gap-1">
        {agent.status === 'awaiting' && (
          <span className="w-2 h-2 rounded-full bg-orange-500" />
        )}
        {agent.status === 'error' && (
          <span className="w-2 h-2 rounded-full bg-red-500" />
        )}
        {agent.isPinned && (
          <span className="text-[10px] text-muted-foreground">&#128204;</span>
        )}
      </div>
    </button>
  )
}
