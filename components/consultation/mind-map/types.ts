export interface MapNode {
  id: string;
  text: string;
  color?: string;
  children: MapNode[];
}

export interface MindMapProps {
  rootTitle?: string;
}
