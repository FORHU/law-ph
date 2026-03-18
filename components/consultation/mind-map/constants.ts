export const MIND_MAP_COLORS = [
  'bg-blue-500/20 border-blue-500/50 text-blue-100',
  'bg-emerald-500/20 border-emerald-500/50 text-emerald-100',
  'bg-purple-500/20 border-purple-500/50 text-purple-100',
  'bg-amber-500/20 border-amber-500/50 text-amber-100',
  'bg-rose-500/20 border-rose-500/50 text-rose-100',
];

export type MindMapThemeType = 'premium' | 'classic' | 'neon' | 'vibrant';

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
    edgeColor: '#8B4564',
    rootClass: 'bg-[#8B4564]/30 border-[#8B4564] text-white font-bold shadow-[0_0_15px_rgba(139,69,100,0.4)]',
    nodeClass: (i) => MIND_MAP_COLORS[i % MIND_MAP_COLORS.length]
  },
  classic: {
    name: 'Legal Classic',
    bg: '#F8F9FA',
    gridColor: '#DDD',
    edgeColor: '#2C3E50',
    rootClass: 'bg-[#2C3E50] border-[#1A252F] text-white font-bold rounded-none',
    nodeClass: (i) => [
      'bg-white border-[#BDC3C7] text-[#2C3E50] rounded-none shadow-sm',
      'bg-white border-[#BDC3C7] text-[#2C3E50] rounded-none shadow-sm',
    ][i % 2]
  },
  neon: {
    name: 'Modern Neon',
    bg: '#050505',
    gridColor: '#111',
    edgeColor: '#00F2FF',
    rootClass: 'bg-black border-[#00F2FF] text-[#00F2FF] font-black shadow-[0_0_20px_#00F2FF]',
    nodeClass: (i) => [
      'bg-black border-[#FF00E5] text-[#FF00E5] shadow-[0_0_10px_#FF00E5]',
      'bg-black border-[#7000FF] text-[#7000FF] shadow-[0_0_10px_#7000FF]',
      'bg-black border-[#00FF66] text-[#00FF66] shadow-[0_0_10px_#00FF66]',
    ][i % 3]
  },
  vibrant: {
    name: 'Vibrant Organic',
    bg: '#FFFFFF',
    gridColor: '#F0F0F0',
    edgeColor: '#FF6B6B',
    rootClass: 'bg-[#FF6B6B] border-none text-white rounded-full px-8 py-4 shadow-lg scale-110',
    nodeClass: (i) => [
      'bg-[#4D96FF] border-none text-white rounded-full shadow-md',
      'bg-[#6BCB77] border-none text-white rounded-full shadow-md',
      'bg-[#FFD93D] border-none text-[#555] rounded-full shadow-md',
      'bg-[#9772FB] border-none text-white rounded-full shadow-md',
    ][i % 4]
  }
};
