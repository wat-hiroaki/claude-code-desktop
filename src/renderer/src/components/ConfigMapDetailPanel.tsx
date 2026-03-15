import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FileText, Zap, Terminal, Layout, Server, Shield, Brain, Bot, Settings } from 'lucide-react'
import type { ConfigNode, ConfigConflict } from '@shared/types'

interface ConfigMapDetailPanelProps {
  node: ConfigNode
  conflicts: ConfigConflict[]
  onClose: () => void
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  rules: FileText,
  skills: Zap,
  commands: Terminal,
  templates: Layout,
  mcpServers: Server,
  hooks: Shield,
  memory: Brain,
  agents: Bot,
  settings: Settings
}

export function ConfigMapDetailPanel({ node, conflicts, onClose }: ConfigMapDetailPanelProps): JSX.Element {
  const { t } = useTranslation()
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFileContent(null)

    window.api.readConfigFile(node.filePath).then((content) => {
      if (!cancelled) {
        setFileContent(content)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setFileContent('')
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [node.filePath])

  const Icon = CATEGORY_ICONS[node.category] || FileText
  const nodeConflicts = conflicts.filter(c => c.nodeIds.includes(node.id))

  return (
    <div className="w-80 h-full border-l border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={16} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{node.label}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-accent rounded transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Metadata */}
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{t('configMap.level')}:</span>
          <span className={
            node.level === 'global' ? 'text-cyan-500' :
            node.level === 'project' ? 'text-green-500' :
            'text-purple-500'
          }>
            {node.level.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{t('configMap.category.label')}:</span>
          <span>{t('configMap.category.' + node.category)}</span>
        </div>
        {node.lineCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('configMap.lines')}:</span>
            <span>{node.lineCount}</span>
          </div>
        )}
        {node.sizeBytes > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('configMap.size')}:</span>
            <span>{(node.sizeBytes / 1024).toFixed(1)} KB</span>
          </div>
        )}
        <div className="text-[10px] text-muted-foreground font-mono break-all opacity-70">
          {node.filePath}
        </div>

        {/* Agent metadata */}
        {node.category === 'agents' && node.metadata && (
          <div className="space-y-1 pt-1">
            {node.metadata.description && (
              <div className="text-xs text-muted-foreground">{String(node.metadata.description)}</div>
            )}
            {node.metadata.model && (
              <div className="text-xs"><span className="text-muted-foreground">Model:</span> {String(node.metadata.model)}</div>
            )}
            {Array.isArray(node.metadata.tools) && node.metadata.tools.length > 0 && (
              <div className="text-xs"><span className="text-muted-foreground">Tools:</span> {(node.metadata.tools as string[]).join(', ')}</div>
            )}
          </div>
        )}

        {/* MCP server list */}
        {node.category === 'mcpServers' && Array.isArray(node.metadata.servers) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {(node.metadata.servers as string[]).map(s => (
              <span key={s} className="px-1.5 py-0.5 text-[10px] bg-secondary rounded font-mono">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Conflicts */}
      {nodeConflicts.length > 0 && (
        <div className="p-3 border-b border-border shrink-0">
          <div className="text-xs font-medium text-red-500 mb-1">{t('configMap.conflicts')}</div>
          {nodeConflicts.map((c, i) => (
            <div key={i} className="text-xs text-muted-foreground bg-red-500/5 border border-red-500/20 rounded p-2 mb-1">
              {c.description}
            </div>
          ))}
        </div>
      )}

      {/* File content preview */}
      <div className="flex-1 overflow-auto p-3">
        <div className="text-xs font-medium mb-2">{t('configMap.preview')}</div>
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse">{t('common.loading')}</div>
        ) : (
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
            {fileContent || t('configMap.noContent')}
          </pre>
        )}
      </div>
    </div>
  )
}
