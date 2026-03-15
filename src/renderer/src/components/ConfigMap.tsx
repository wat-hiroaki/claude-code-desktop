import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { ConfigMapNode } from './ConfigMapNode'
import { ConfigMapDetailPanel } from './ConfigMapDetailPanel'
import type { ConfigMapData, ConfigNode, Workspace } from '@shared/types'

// ---------------------------------------------------------
// CYBER/HUD THEME (reuse from ActivityMap pattern)
// ---------------------------------------------------------
const cyberPaletteDark = {
  bg: '#09090b',
  accent: '#71717a',
  cyan: '#0ea5e9',
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  gray: '#52525b',
  darkGray: '#18181b',
  textMain: '#fafafa',
  textMuted: '#a1a1aa',
  panelBg: 'rgba(9, 9, 11, 0.9)',
  panelBorder: 'rgba(82, 82, 91, 0.5)'
}

const cyberPaletteLight = {
  bg: '#f8fafc',
  accent: '#64748b',
  cyan: '#0284c7',
  green: '#059669',
  orange: '#d97706',
  red: '#dc2626',
  purple: '#7c3aed',
  gray: '#94a3b8',
  darkGray: '#e2e8f0',
  textMain: '#0f172a',
  textMuted: '#64748b',
  panelBg: 'rgba(255, 255, 255, 0.95)',
  panelBorder: 'rgba(148, 163, 184, 0.5)'
}

function useResolvedTheme(): 'dark' | 'light' {
  const { theme } = useAppStore()
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])
  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}

// ---------------------------------------------------------
// Layout: Sector-based around center
// ---------------------------------------------------------
const CATEGORY_SECTORS: Record<string, { angle: number; radius: number }> = {
  rules:      { angle: -90,  radius: 160 },
  settings:   { angle: -45,  radius: 140 },
  mcpServers: { angle: 0,    radius: 170 },
  hooks:      { angle: 35,   radius: 140 },
  skills:     { angle: 70,   radius: 170 },
  commands:   { angle: 110,  radius: 160 },
  templates:  { angle: 145,  radius: 140 },
  memory:     { angle: 180,  radius: 160 },
  agents:     { angle: 225,  radius: 170 }
}

function getNodePosition(node: ConfigNode, index: number, totalInCategory: number, cx: number, cy: number): { x: number; y: number } {
  const sector = CATEGORY_SECTORS[node.category] || { angle: 0, radius: 160 }
  const baseAngle = (sector.angle * Math.PI) / 180
  // Spread multiple nodes in same category
  const spread = totalInCategory > 1 ? ((index - (totalInCategory - 1) / 2) * 0.25) : 0
  const angle = baseAngle + spread
  return {
    x: cx + sector.radius * Math.cos(angle),
    y: cy + sector.radius * Math.sin(angle)
  }
}

const EDGE_STYLES: Record<string, { stroke: string; dasharray: string; width: number }> = {
  inherits:   { stroke: 'cyan',   dasharray: '',      width: 1.5 },
  overrides:  { stroke: 'red',    dasharray: '4 3',   width: 1.5 },
  references: { stroke: 'accent', dasharray: '2 4',   width: 1 },
  configures: { stroke: 'gray',   dasharray: '3 2',   width: 1 }
}

interface ConfigMapProps {
  workspaces: Workspace[]
}

export function ConfigMap({ workspaces }: ConfigMapProps): JSX.Element {
  const { t } = useTranslation()
  const resolved = useResolvedTheme()
  const palette = resolved === 'dark' ? cyberPaletteDark : cyberPaletteLight

  const { activeWorkspaceId } = useAppStore()
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

  const [data, setData] = useState<ConfigMapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<ConfigNode | null>(null)

  // Pan/zoom
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const svgWidth = 700
  const svgHeight = 500
  const cx = svgWidth / 2
  const cy = svgHeight / 2

  // Load data when workspace changes
  useEffect(() => {
    if (!activeWorkspace) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    window.api.getConfigMapData(activeWorkspace.path).then((result) => {
      if (!cancelled) {
        setData(result)
        setLoading(false)
        setSelectedNode(null)
        setPan({ x: 0, y: 0 })
        setScale(1)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeWorkspace])

  // Wheel zoom
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault()
      setScale(s => Math.max(0.3, Math.min(3, s - e.deltaY * 0.001)))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target instanceof SVGElement && e.target.tagName === 'svg') {
      isDragging.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    isDragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  // Compute positions
  const nodePositions = useMemo(() => {
    if (!data) return new Map<string, { x: number; y: number }>()
    const positions = new Map<string, { x: number; y: number }>()
    // Group nodes by category
    const byCategory = new Map<string, ConfigNode[]>()
    for (const node of data.nodes) {
      const existing = byCategory.get(node.category) || []
      existing.push(node)
      byCategory.set(node.category, existing)
    }
    for (const [, nodes] of byCategory) {
      nodes.forEach((node, idx) => {
        positions.set(node.id, getNodePosition(node, idx, nodes.length, cx, cy))
      })
    }
    return positions
  }, [data, cx, cy])

  // Conflict lookup
  const conflictedNodeIds = useMemo(() => {
    if (!data) return new Set<string>()
    const ids = new Set<string>()
    for (const c of data.conflicts) {
      for (const id of c.nodeIds) ids.add(id)
    }
    return ids
  }, [data])

  const handleNodeClick = useCallback((node: ConfigNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  // No workspace selected
  if (!activeWorkspace) {
    return (
      <div
        className="w-full flex items-center justify-center border overflow-hidden font-mono relative rounded-md"
        style={{ backgroundColor: palette.bg, borderColor: palette.panelBorder, height: '500px' }}
      >
        <div className="text-sm tracking-widest opacity-50 flex flex-col items-center" style={{ color: palette.textMuted }}>
          <span className="mb-2 uppercase">[ {t('configMap.noWorkspace')} ]</span>
          <span className="text-xs">{t('configMap.selectWorkspace')}</span>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div
        className="w-full flex items-center justify-center border overflow-hidden font-mono relative rounded-md"
        style={{ backgroundColor: palette.bg, borderColor: palette.panelBorder, height: '500px' }}
      >
        <span className="animate-pulse tracking-widest" style={{ color: palette.cyan }}>
          SCANNING CONFIG...
        </span>
      </div>
    )
  }

  return (
    <div className="flex w-full" style={{ height: '500px' }}>
      {/* Main SVG area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Conflict summary bar */}
        {data && data.conflicts.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono border-b" style={{ borderColor: palette.panelBorder, backgroundColor: 'rgba(239,68,68,0.05)' }}>
            <span style={{ color: palette.red }}>&#x26A0;</span>
            <span style={{ color: palette.red }}>
              {data.conflicts.length} {t('configMap.conflictsFound')}
            </span>
            <span style={{ color: palette.textMuted }}>
              {data.conflicts.map(c => c.description).join(' | ')}
            </span>
          </div>
        )}

        <div
          className="flex-1 rounded-md border shadow-xl overflow-hidden select-none cursor-grab active:cursor-grabbing relative"
          style={{
            backgroundColor: palette.bg,
            borderColor: palette.panelBorder
          }}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(${palette.accent} 1px, transparent 1px), linear-gradient(90deg, ${palette.accent} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              opacity: 0.06
            }}
          />

          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full block"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <defs>
              <filter id="config-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker id="arrow-inherits" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 3 L 0 6 z" fill={palette.cyan} opacity={0.6} />
              </marker>
              <marker id="arrow-overrides" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 3 L 0 6 z" fill={palette.red} opacity={0.6} />
              </marker>
              <marker id="arrow-configures" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 3 L 0 6 z" fill={palette.gray} opacity={0.6} />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
              {/* Center: project label */}
              <circle cx={cx} cy={cy} r={36} fill={palette.bg} stroke={palette.cyan} strokeWidth={1} opacity={0.6} />
              <text
                x={cx} y={cy - 4}
                textAnchor="middle"
                className="font-mono"
                fontSize={9}
                fill={palette.cyan}
                fontWeight="bold"
                style={{ userSelect: 'none' }}
              >
                {data?.projectName || ''}
              </text>
              <text
                x={cx} y={cy + 8}
                textAnchor="middle"
                className="font-mono uppercase"
                fontSize={6}
                fill={palette.textMuted}
                style={{ userSelect: 'none' }}
              >
                {t('configMap.title')}
              </text>

              {/* Category sector labels */}
              {data && Object.entries(CATEGORY_SECTORS).map(([cat, sector]) => {
                const hasNodes = data.nodes.some(n => n.category === cat)
                if (!hasNodes) return null
                const angle = (sector.angle * Math.PI) / 180
                const labelR = sector.radius + 34
                const lx = cx + labelR * Math.cos(angle)
                const ly = cy + labelR * Math.sin(angle)
                return (
                  <text
                    key={cat}
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    className="font-mono uppercase"
                    fontSize={7}
                    fill={palette.textMuted}
                    opacity={0.5}
                    style={{ userSelect: 'none' }}
                  >
                    {t('configMap.category.' + cat)}
                  </text>
                )
              })}

              {/* Edges */}
              {data?.edges.map((edge, i) => {
                const from = nodePositions.get(edge.from)
                const to = nodePositions.get(edge.to)
                if (!from || !to) return null
                const style = EDGE_STYLES[edge.relationship] || EDGE_STYLES.references
                const color = style.stroke === 'cyan' ? palette.cyan :
                              style.stroke === 'red' ? palette.red :
                              style.stroke === 'accent' ? palette.accent :
                              palette.gray
                const markerId = edge.relationship === 'references' ? '' : `url(#arrow-${edge.relationship})`

                // Shorten line to avoid overlapping node circles
                const dx = to.x - from.x
                const dy = to.y - from.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < 1) return null
                const nx = dx / dist
                const ny = dy / dist
                const startOffset = 30
                const endOffset = 30
                return (
                  <line
                    key={`edge-${i}`}
                    x1={from.x + nx * startOffset}
                    y1={from.y + ny * startOffset}
                    x2={to.x - nx * endOffset}
                    y2={to.y - ny * endOffset}
                    stroke={color}
                    strokeWidth={style.width}
                    strokeDasharray={style.dasharray}
                    markerEnd={markerId}
                    opacity={0.5}
                  />
                )
              })}

              {/* Nodes */}
              {data?.nodes.map((node) => {
                const pos = nodePositions.get(node.id)
                if (!pos) return null
                return (
                  <ConfigMapNode
                    key={node.id}
                    node={node}
                    x={pos.x}
                    y={pos.y}
                    palette={palette}
                    isConflicted={conflictedNodeIds.has(node.id)}
                    isSelected={selectedNode?.id === node.id}
                    onClick={handleNodeClick}
                  />
                )
              })}
            </g>
          </svg>

          {/* Legend */}
          <div
            className="absolute bottom-2 left-2 px-2 py-1.5 rounded text-[9px] font-mono flex gap-3"
            style={{ backgroundColor: palette.panelBg, border: `1px solid ${palette.panelBorder}` }}
          >
            <span style={{ color: palette.cyan }}>&#9644; {t('configMap.levelGlobal')}</span>
            <span style={{ color: palette.green }}>&#9644; {t('configMap.levelProject')}</span>
            <span style={{ color: palette.purple }}>&#9644; {t('configMap.levelAgent')}</span>
          </div>

          {/* Node count */}
          {data && (
            <div
              className="absolute top-2 right-2 px-2 py-1 rounded text-[9px] font-mono"
              style={{ backgroundColor: palette.panelBg, border: `1px solid ${palette.panelBorder}`, color: palette.textMuted }}
            >
              {data.nodes.length} {t('configMap.nodes')} / {data.edges.length} {t('configMap.edges')}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedNode && data && (
        <ConfigMapDetailPanel
          node={selectedNode}
          conflicts={data.conflicts}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
