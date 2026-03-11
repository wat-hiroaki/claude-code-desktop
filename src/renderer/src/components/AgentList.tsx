import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { AgentCard } from './AgentCard'
import { CreateAgentDialog } from './CreateAgentDialog'
import { Plus, Search } from 'lucide-react'

export function AgentList(): JSX.Element {
  const { t } = useTranslation()
  const { agents, selectedAgentId, setSelectedAgent } = useAppStore()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = agents.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      a.projectName.toLowerCase().includes(q) ||
      (a.roleLabel?.toLowerCase().includes(q) ?? false)
    )
  })

  // Group by project
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, agent) => {
    const key = agent.projectName
    if (!acc[key]) acc[key] = []
    acc[key].push(agent)
    return acc
  }, {})

  return (
    <div className="flex flex-col w-72 min-w-[240px] max-w-[400px] border-r border-border bg-card resize-x overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('app.subtitle')}</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
            title={t('agent.new')}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-secondary rounded border-none outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('agent.noAgents')}
          </div>
        ) : (
          Object.entries(grouped).map(([project, projectAgents]) => (
            <div key={project}>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 sticky top-0">
                {project}
              </div>
              {projectAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={agent.id === selectedAgentId}
                  onClick={() => setSelectedAgent(agent.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {showCreate && <CreateAgentDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
