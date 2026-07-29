import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  listPatterns: (path: string) => ipcRenderer.invoke('list-patterns', path),
  readPattern: (path: string) => ipcRenderer.invoke('read-pattern', path),
  savePattern: (path: string, content: string) => ipcRenderer.invoke('save-pattern', path, content),
  listSamples: () => ipcRenderer.invoke('list-samples'),
  readSampleFile: (filePath: string) => ipcRenderer.invoke('read-sample-file', filePath),
  downloadDirtSamples: () => ipcRenderer.invoke('download-dirt-samples'),
  createProject: (path: string, name: string) => ipcRenderer.invoke('create-project', path, name),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('save-file-dialog', defaultName),
  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  on: (channel: string, cb: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => cb(...args))
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {})
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  ;(window as any).api = api
}
