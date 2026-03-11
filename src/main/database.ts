import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type { Agent, Message, TaskChain, Broadcast, CreateAgentParams, TeamStats } from '@shared/types'

interface DBData {
  agents: Agent[]
  messages: Message[]
  taskChains: TaskChain[]
  broadcasts: Broadcast[]
  nextMessageId: number
}

export class Database {
  private data: DBData
  private dbPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    mkdirSync(userDataPath, { recursive: true })
    this.dbPath = join(userDataPath, 'database.json')
    this.data = this.load()
  }

  private load(): DBData {
    if (existsSync(this.dbPath)) {
      try {
        return JSON.parse(readFileSync(this.dbPath, 'utf-8'))
      } catch {
        // Corrupted file, start fresh
      }
    }
    return {
      agents: [],
      messages: [],
      taskChains: [],
      broadcasts: [],
      nextMessageId: 1
    }
  }

  private save(): void {
    // Atomic write: write to temp file then rename
    const tmpPath = this.dbPath + '.tmp'
    writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8')
    renameSync(tmpPath, this.dbPath)
  }

  // Agents
  createAgent(params: CreateAgentParams): Agent {
    const id = uuidv4()
    const sessionNumber = this.getNextSessionNumber(params.projectPath)
    const now = new Date().toISOString()

    const agent: Agent = {
      id,
      name: params.name,
      icon: null,
      roleLabel: params.roleLabel ?? null,
      projectPath: params.projectPath,
      projectName: params.projectName,
      sessionNumber,
      status: 'creating',
      currentTask: null,
      systemPrompt: params.systemPrompt ?? null,
      claudeSessionId: null,
      isPinned: false,
      createdAt: now,
      updatedAt: now
    }

    this.data.agents.push(agent)
    this.save()
    return agent
  }

  private getNextSessionNumber(projectPath: string): number {
    const existing = this.data.agents.filter((a) => a.projectPath === projectPath)
    return existing.length > 0 ? Math.max(...existing.map((a) => a.sessionNumber)) + 1 : 1
  }

  getAgent(id: string): Agent | null {
    return this.data.agents.find((a) => a.id === id) ?? null
  }

  getAgents(): Agent[] {
    return this.data.agents
      .filter((a) => a.status !== 'archived')
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }

  updateAgent(id: string, updates: Record<string, unknown>): Agent {
    const agent = this.data.agents.find((a) => a.id === id)
    if (!agent) throw new Error(`Agent ${id} not found`)

    const allowedFields = ['name', 'icon', 'roleLabel', 'status', 'currentTask', 'systemPrompt', 'claudeSessionId', 'isPinned']
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        (agent as Record<string, unknown>)[key] = value
      }
    }
    agent.updatedAt = new Date().toISOString()
    this.save()
    return agent
  }

  // Messages
  addMessage(agentId: string, role: string, contentType: string, content: string, metadata?: Record<string, unknown>): Message {
    const msg: Message = {
      id: this.data.nextMessageId++,
      agentId,
      role: role as Message['role'],
      contentType: contentType as Message['contentType'],
      content,
      metadata: metadata ?? null,
      createdAt: new Date().toISOString()
    }
    this.data.messages.push(msg)
    this.save()
    return msg
  }

  getMessages(agentId: string): Message[] {
    return this.data.messages
      .filter((m) => m.agentId === agentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  // Task Chains
  createChain(chain: Omit<TaskChain, 'id' | 'createdAt'>): TaskChain {
    const tc: TaskChain = {
      ...chain,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    }
    this.data.taskChains.push(tc)
    this.save()
    return tc
  }

  getChains(): TaskChain[] {
    return this.data.taskChains
  }

  updateChain(id: string, updates: Partial<TaskChain>): TaskChain {
    const chain = this.data.taskChains.find((c) => c.id === id)
    if (!chain) throw new Error(`Chain ${id} not found`)
    Object.assign(chain, updates)
    this.save()
    return chain
  }

  deleteChain(id: string): void {
    this.data.taskChains = this.data.taskChains.filter((c) => c.id !== id)
    this.save()
  }

  // Broadcasts
  createBroadcast(message: string, agentIds: string[]): string {
    const b: Broadcast = {
      id: uuidv4(),
      messageTemplate: message,
      targetAgentIds: agentIds,
      status: 'pending',
      responses: {},
      createdAt: new Date().toISOString()
    }
    this.data.broadcasts.push(b)
    this.save()
    return b.id
  }

  updateBroadcast(id: string, updates: Partial<Broadcast>): void {
    const b = this.data.broadcasts.find((br) => br.id === id)
    if (b) {
      Object.assign(b, updates)
      this.save()
    }
  }

  // Team Stats
  getTeamStats(): TeamStats {
    const agents = this.getAgents()
    return {
      active: agents.filter((a) => ['active', 'thinking', 'tool_running'].includes(a.status)).length,
      awaiting: agents.filter((a) => a.status === 'awaiting').length,
      error: agents.filter((a) => a.status === 'error').length,
      completedToday: 0
    }
  }

  close(): void {
    this.save()
  }
}
