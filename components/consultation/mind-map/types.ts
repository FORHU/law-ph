import { MindMapThemeType } from './constants';

export interface MediaItem {
  type: 'image' | 'audio' | 'file';
  url: string;
  name: string;
}

export interface MapNode {
  id: string;
  text?: string;
  label?: string;
  color?: string;
  children: MapNode[];
  media?: MediaItem[];
}

export interface MindMapItem {
  id: string;
  label?: string;
  description?: string;
  children?: MindMapItem[];
  media?: MediaItem[];
}
export interface MindMapProps {
  rootTitle?: string;
  data?: any;
  initialTheme?: MindMapThemeType;
}
