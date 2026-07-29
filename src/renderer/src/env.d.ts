/// <reference types="vite/client" />

interface PatternNode {
  name: string
  path: string
  type: 'folder' | 'pattern'
  children?: PatternNode[]
}

interface SampleInfo {
  name: string
  path: string
  category?: string
}

interface StrudelAPI {
  getHomeDir(): Promise<string>
  listPatterns(path: string): Promise<PatternNode[]>
  readPattern(path: string): Promise<string>
  savePattern(path: string, content: string): Promise<void>
  listSamples(): Promise<Record<string, SampleInfo[]>>
  readSampleFile(filePath: string): Promise<{ data: string; name: string }>
  downloadDirtSamples(): Promise<{ total: number; downloaded: number; errors: number }>
  createProject(path: string, name: string): Promise<void>
  saveFileDialog(defaultName: string): Promise<string | null>
  openProjectDialog(): Promise<string | null>
  on(channel: string, cb: (...args: any[]) => void): void
}

interface Window {
  electron: Record<string, never>
  api: StrudelAPI
}
