import { MindMapThemeType } from './constants';

export interface MapNode {
  id: string;
  text?: string;
  label?: string;
  color?: string;
  children: MapNode[];
}

export interface MindMapProps {
  rootTitle?: string;
  data?: any;
  initialTheme?: MindMapThemeType;
}

// 3D mind map rendering consumes flexible, AI-shaped tree structures.
// Keep this intentionally permissive so 2D/3D can share the same `data` input.
export type MindMapItem = any;
