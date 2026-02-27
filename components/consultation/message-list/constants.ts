export const ANIMATION_VARIANTS = {
  container: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 }
  },
  indicator: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }
};

export const TAB_CONFIG = [
  { id: 'answer', label: 'Answer', icon: 'BookOpen' },
  { id: 'email', label: 'Send Email', icon: 'Mail' },
  { id: 'schedule', label: 'Schedule', icon: 'Calendar' },
  { id: 'sources', label: 'Sources', icon: 'History' },
  { id: 'related', label: 'Related Cases', icon: 'GitGraph' }
];
