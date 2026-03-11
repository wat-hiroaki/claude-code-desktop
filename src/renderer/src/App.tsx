import { useEffect, useCallback } from 'react'
import { useAppStore } from './stores/useAppStore'
import { TitleBar } from './components/TitleBar'
import { AgentList } from './components/AgentList'
import { ChatArea } from './components/ChatArea'
import { ContextPane } from './components/ContextPane'
import { Dashboard } from './components/Dashboard'
import { BroadcastModal } from './components/BroadcastModal'

export function App(): JSX.Element {
  const {
    setAgents,
    updateAgentInList,
    addMessage,
    setTeamStats,
    showDashboard,
    showRightPane,
    toggleDashboard,
    toggleRightPane,
    toggleBroadcast
  } = useAppStore()

  const loadAgents = useCallback(async () => {
    const agents = await window.api.getAgents()
    setAgents(agents)
    const stats = await window.api.getTeamStats()
    setTeamStats(stats)
  }, [setAgents, setTeamStats])

  useEffect(() => {
    loadAgents()

    const unsubOutput = window.api.onAgentOutput((agentId, message) => {
      addMessage(agentId, {
        id: Date.now(),
        agentId,
        role: message.role,
        contentType: message.contentType,
        content: message.content,
        metadata: message.metadata ?? null,
        createdAt: new Date().toISOString()
      })
    })

    const unsubStatus = window.api.onAgentStatusChange((agentId, status) => {
      updateAgentInList(agentId, { status })
      window.api.getTeamStats().then(setTeamStats)
    })

    return () => {
      unsubOutput()
      unsubStatus()
    }
  }, [loadAgents, addMessage, updateAgentInList, setTeamStats])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        toggleDashboard()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        toggleBroadcast()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        toggleRightPane()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleDashboard, toggleBroadcast, toggleRightPane])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />

      {showDashboard && <Dashboard />}

      <div className="flex flex-1 overflow-hidden">
        <AgentList />

        <ChatArea />

        {showRightPane && <ContextPane />}
      </div>

      <BroadcastModal />
    </div>
  )
}
