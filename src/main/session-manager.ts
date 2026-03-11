import { spawn, type ChildProcess } from 'child_process'
import type { Agent, AgentStatus } from '@shared/types'
import type { Database } from './database'

interface Session {
  agentId: string
  process: ChildProcess | null
  buffer: string
}

type OutputCallback = (agentId: string, data: string) => void
type StatusCallback = (agentId: string, status: AgentStatus) => void

export class SessionManager {
  private sessions: Map<string, Session> = new Map()
  private onOutput: OutputCallback
  private onStatusChange: StatusCallback
  private database: Database

  constructor(database: Database, onOutput: OutputCallback, onStatusChange: StatusCallback) {
    this.database = database
    this.onOutput = onOutput
    this.onStatusChange = onStatusChange
  }

  async startSession(agent: Agent): Promise<void> {
    const args = ['--output-format', 'stream-json']

    if (agent.systemPrompt) {
      args.push('--system-prompt', agent.systemPrompt)
    }

    const proc = spawn('claude', args, {
      cwd: agent.projectPath,
      env: { ...process.env },
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const session: Session = {
      agentId: agent.id,
      process: proc,
      buffer: ''
    }

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8')
      session.buffer += text
      this.onOutput(agent.id, text)
      this.detectStatus(agent.id, text)
    })

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8')
      this.onOutput(agent.id, text)
      if (text.includes('Error') || text.includes('error')) {
        this.updateStatus(agent.id, 'error')
      }
    })

    proc.on('exit', (code) => {
      const status: AgentStatus = code === 0 ? 'idle' : 'error'
      this.database.updateAgent(agent.id, { status })
      this.onStatusChange(agent.id, status)
      this.sessions.delete(agent.id)
    })

    this.sessions.set(agent.id, session)
    this.database.updateAgent(agent.id, { status: 'active' })
    this.onStatusChange(agent.id, 'active')
  }

  async sendInput(agentId: string, input: string): Promise<void> {
    const session = this.sessions.get(agentId)
    if (session?.process?.stdin?.writable) {
      session.process.stdin.write(input + '\n')
    }
  }

  async interruptSession(agentId: string): Promise<void> {
    const session = this.sessions.get(agentId)
    if (session?.process) {
      // Send SIGINT equivalent on Windows
      session.process.kill('SIGINT')
    }
  }

  async stopSession(agentId: string): Promise<void> {
    const session = this.sessions.get(agentId)
    if (session?.process) {
      session.process.kill()
      this.sessions.delete(agentId)
    }
  }

  stopAll(): void {
    for (const [id] of this.sessions) {
      this.stopSession(id)
    }
  }

  private detectStatus(agentId: string, data: string): void {
    try {
      const lines = data.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        if (!line.startsWith('{')) continue
        const parsed = JSON.parse(line)
        if (parsed.type === 'assistant') {
          this.updateStatus(agentId, 'thinking')
        } else if (parsed.type === 'tool_use') {
          this.updateStatus(agentId, 'tool_running')
          this.database.updateAgent(agentId, { currentTask: parsed.name || 'Running tool...' })
        } else if (parsed.type === 'result') {
          this.updateStatus(agentId, 'active')
          this.database.updateAgent(agentId, { currentTask: null })
        }
      }
    } catch {
      // Fallback pattern matching
      if (data.includes('permission') || data.includes('approve')) {
        this.updateStatus(agentId, 'awaiting')
      }
    }
  }

  private updateStatus(agentId: string, status: AgentStatus): void {
    this.database.updateAgent(agentId, { status })
    this.onStatusChange(agentId, status)
  }
}
