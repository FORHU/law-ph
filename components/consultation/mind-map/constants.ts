export const MIND_MAP_COLORS = [
  'bg-blue-500/20 border-blue-500/50 text-blue-100',
  'bg-emerald-500/20 border-emerald-500/50 text-emerald-100',
  'bg-purple-500/20 border-purple-500/50 text-purple-100',
  'bg-amber-500/20 border-amber-500/50 text-amber-100',
  'bg-rose-500/20 border-rose-500/50 text-rose-100',
];

export const MIND_MAP_HEX_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export type MindMapThemeType = 'premium';

export const MIND_MAP_THEMES: Record<MindMapThemeType, {
  name: string;
  bg: string;
  gridColor: string;
  edgeColor: string;
  rootClass: string;
  nodeClass: (index: number) => string;
}> = {
  premium: {
    name: 'Premium Dark',
    bg: '#111111',
    gridColor: '#333',
    edgeColor: '#722f37',
    rootClass: 'bg-[#722f37]/30 border-[#722f37] text-white font-bold shadow-[0_0_15px_rgba(114,47,55,0.4)]',
    nodeClass: (i) => MIND_MAP_COLORS[i % MIND_MAP_COLORS.length]
  }
};
