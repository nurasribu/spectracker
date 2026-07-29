export interface PatternNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: PatternNode[];
}

export interface ProjectConfig {
  name: string;
  bpm: number;
  key?: string;
  scale?: string;
}

export interface SampleInfo {
  name: string;
  path: string;
  category: string;
}
