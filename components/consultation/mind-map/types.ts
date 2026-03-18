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
