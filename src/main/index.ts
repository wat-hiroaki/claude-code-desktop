import { app, shell, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { SessionManager } from './session-manager'
import { Database } from './database'
import type { CreateAgentParams } from '@shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let sessionManager: SessionManager
let database: Database

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#e0e0e0',
      height: 36
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Claude Code Desktop')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.show()
  })
}

function setupIPC(): void {
  // Agent management
  ipcMain.handle('agent:create', async (_event, params: CreateAgentParams) => {
    const agent = database.createAgent(params)
    await sessionManager.startSession(agent)
    return agent
  })

  ipcMain.handle('agent:list', () => {
    return database.getAgents()
  })

  ipcMain.handle('agent:get', (_event, id: string) => {
    return database.getAgent(id)
  })

  ipcMain.handle('agent:update', (_event, id: string, updates: Record<string, unknown>) => {
    return database.updateAgent(id, updates)
  })

  ipcMain.handle('agent:archive', async (_event, id: string) => {
    await sessionManager.stopSession(id)
    database.updateAgent(id, { status: 'archived' })
  })

  // Messaging
  ipcMain.handle('message:send', async (_event, agentId: string, content: string) => {
    database.addMessage(agentId, 'manager', 'text', content)
    await sessionManager.sendInput(agentId, content)
  })

  ipcMain.handle('message:list', (_event, agentId: string) => {
    return database.getMessages(agentId)
  })

  // Agent control
  ipcMain.handle('agent:restart', async (_event, id: string) => {
    const agent = database.getAgent(id)
    if (agent) {
      await sessionManager.stopSession(id)
      await sessionManager.startSession(agent)
      database.updateAgent(id, { status: 'active' })
    }
  })

  ipcMain.handle('agent:interrupt', async (_event, id: string) => {
    await sessionManager.interruptSession(id)
  })

  // Broadcast
  ipcMain.handle('broadcast:send', async (_event, agentIds: string[], message: string) => {
    const broadcastId = database.createBroadcast(message, agentIds)
    for (const agentId of agentIds) {
      database.addMessage(agentId, 'manager', 'text', message)
      await sessionManager.sendInput(agentId, message)
    }
    database.updateBroadcast(broadcastId, { status: 'sent' })
    return broadcastId
  })

  // Task chains
  ipcMain.handle('chain:create', (_event, chain) => {
    return database.createChain(chain)
  })

  ipcMain.handle('chain:list', () => {
    return database.getChains()
  })

  ipcMain.handle('chain:update', (_event, id: string, updates) => {
    return database.updateChain(id, updates)
  })

  ipcMain.handle('chain:delete', (_event, id: string) => {
    return database.deleteChain(id)
  })

  // Team stats
  ipcMain.handle('team:stats', () => {
    return database.getTeamStats()
  })

  // App
  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.impme.claude-code-desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  database = new Database()
  sessionManager = new SessionManager(database, (agentId, data) => {
    mainWindow?.webContents.send('agent:output', agentId, data)
  }, (agentId, status) => {
    mainWindow?.webContents.send('agent:status-change', agentId, status)
    // Show notification for important status changes
    if (status === 'awaiting' || status === 'error') {
      const agent = database.getAgent(agentId)
      if (agent) {
        const title = status === 'awaiting' ? 'Approval Required' : 'Error Occurred'
        const body = `${agent.name}: ${agent.currentTask || 'Check agent for details'}`
        new Notification({ title, body }).show()
        mainWindow?.webContents.send('notification', title, body)
      }
    }
  })

  setupIPC()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Keep running in tray on Windows
  if (process.platform !== 'win32') {
    app.quit()
  }
})

app.on('before-quit', () => {
  sessionManager.stopAll()
  database.close()
})
