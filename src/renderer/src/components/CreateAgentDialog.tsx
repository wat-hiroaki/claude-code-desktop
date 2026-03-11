import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { X } from 'lucide-react'

interface CreateAgentDialogProps {
  onClose: () => void
}

export function CreateAgentDialog({ onClose }: CreateAgentDialogProps): JSX.Element {
  const { t } = useTranslation()
  const { addAgent, setSelectedAgent } = useAppStore()
  const [name, setName] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [projectName, setProjectName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (): Promise<void> => {
    if (!name.trim() || !projectPath.trim() || !projectName.trim()) return

    setLoading(true)
    try {
      const agent = await window.api.createAgent({
        name: name.trim(),
        projectPath: projectPath.trim(),
        projectName: projectName.trim(),
        roleLabel: roleLabel.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined
      })
      addAgent(agent)
      setSelectedAgent(agent.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl w-[480px] max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">{t('agent.new')}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agent.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Frontend Dev"
              className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agent.projectPath')}</label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="C:/Users/user/my-project"
              className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agent.project')}</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Project"
              className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agent.role')}</label>
            <input
              type="text"
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="frontend / backend / test"
              className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agent.systemPrompt')}</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Optional: Define the agent's role..."
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !projectPath.trim() || !projectName.trim() || loading}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? t('common.loading') : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
