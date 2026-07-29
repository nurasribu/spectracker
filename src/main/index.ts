import { app, shell, BrowserWindow, ipcMain, dialog, net } from 'electron'
import { join, dirname, basename } from 'path'
import { readFile, writeFile, readdir, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

async function listDirRecursive(dirPath: string): Promise<any[]> {
  const entries: any[] = []
  try {
    const items = await readdir(dirPath, { withFileTypes: true })
    for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name.startsWith('.')) continue
      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: join(dirPath, item.name),
          type: 'folder',
          children: await listDirRecursive(join(dirPath, item.name))
        })
      } else if (item.name.endsWith('.js')) {
        entries.push({
          name: item.name.replace('.js', ''),
          path: join(dirPath, item.name),
          type: 'pattern'
        })
      }
    }
  } catch (_) {}
  return entries
}

ipcMain.handle('get-home-dir', () => homedir())

ipcMain.handle('list-patterns', async (_event, path: string) => {
  return listDirRecursive(path)
})

ipcMain.handle('read-pattern', async (_event, path: string) => {
  return readFile(path, 'utf-8')
})

ipcMain.handle('save-pattern', async (_event, path: string, content: string) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf-8')
})

ipcMain.handle('list-samples', async () => {
  const sampleDirs = [
    join(__dirname, '../../resources/samples'),
    join(homedir(), 'Projects/spectracker/samples'),
  ]
  const result: Record<string, { name: string; path: string }[]> = {}
  for (const dir of sampleDirs) {
    if (!existsSync(dir)) continue
    const cats = await readdir(dir, { withFileTypes: true })
    for (const cat of cats) {
      if (!cat.isDirectory() || cat.name.startsWith('.')) continue
      const catPath = join(dir, cat.name)
      const files = (await readdir(catPath))
        .filter(f => f.match(/\.(wav|mp3|ogg)$/i))
        .sort()
      if (files.length > 0) {
        result[cat.name] = files.map(f => ({ name: f, path: join(catPath, f) }))
      }
    }
  }
  return result
})

ipcMain.handle('create-project', async (_event, path: string, name: string) => {
  const projDir = join(path, name)
  await mkdir(join(projDir, 'drums'), { recursive: true })
  await mkdir(join(projDir, 'bass'), { recursive: true })
  await mkdir(join(projDir, 'synth'), { recursive: true })
  await mkdir(join(projDir, 'samples'), { recursive: true })
  await writeFile(join(projDir, 'project.toml'), `name = "${name}"\n`, 'utf-8')
})

ipcMain.handle('render-wav', async (_event, _patternPath: string, _outputPath: string) => {
  // rendering happens in renderer with OfflineAudioContext
  // this handler saves the rendered buffer
})

ipcMain.handle('save-file-dialog', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'WAV Audio', extensions: ['wav'] }]
  })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('open-project-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('read-sample-file', async (_event, filePath: string) => {
  const buf = await readFile(filePath)
  return { data: buf.toString('base64'), name: basename(filePath) }
})

ipcMain.handle('download-dirt-samples', async () => {
  const samplesParent = join(homedir(), 'Projects/spectracker/samples')
  if (!existsSync(samplesParent)) await mkdir(samplesParent, { recursive: true })

  console.log('[download-dirt-samples] fetching strudel.json...')

  const jsonUrl = 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json'
  const jsonBuf = await net.fetch(jsonUrl).then((r: Response) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.arrayBuffer()
  })
  const sampleMap = JSON.parse(new TextDecoder().decode(jsonBuf))
  const base = sampleMap._base || 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/'
  await writeFile(join(samplesParent, 'strudel.json'), JSON.stringify(sampleMap, null, 2))

  const entries = Object.entries(sampleMap) as [string, string | string[]][]
  let total = 0
  for (const [key, val] of entries) {
    if (key === '_base') continue
    const files = Array.isArray(val) ? val : [val]
    total += files.length
  }
  console.log(`[download-dirt-samples] ${total} files to download`)

  let downloaded = 0
  let errors = 0
  const concurrency = 5
  const queue: (() => Promise<void>)[] = []

  for (const [key, val] of entries) {
    if (key === '_base') continue
    const files = Array.isArray(val) ? val : [val]
    const keyDir = join(samplesParent, key)
    if (!existsSync(keyDir)) await mkdir(keyDir, { recursive: true })
    for (const file of files) {
      const fileUrl = new URL(file.split('/').map(s => encodeURIComponent(s)).join('/'), base).href
      const localPath = join(keyDir, basename(file))
      queue.push(async () => {
        if (existsSync(localPath)) { downloaded++; return }
        try {
          const buf = await net.fetch(fileUrl).then((r: Response) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.arrayBuffer()
          })
          await writeFile(localPath, Buffer.from(buf))
          downloaded++
        } catch (e) {
          console.warn(`[download] failed: ${fileUrl}`, e)
          errors++
        }
      })
    }
  }

  while (queue.length) {
    const batch = queue.splice(0, concurrency)
    await Promise.all(batch.map((fn) => fn()))
  }

  console.log(`[download-dirt-samples] done: ${downloaded}/${total}, errors: ${errors}`)
  return { total, downloaded, errors }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.spectracker')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
