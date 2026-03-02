import { Scale, Mail, Calendar, BookOpen, Gavel, History, GitGraph } from 'lucide-react';

export const ANIMATION_VARIANTS = {
  container: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 }
  }
};

export const TAB_CONFIG = [
  { id: 'answer', label: 'Answer', icon: Scale },
  { id: 'sources', label: 'Sources', icon: BookOpen, countKey: 'sources' },
  { id: 'related', label: 'Related Cases', icon: Gavel, countKey: 'relatedCases' },
  { id: 'timeline', label: 'Timeline View', icon: History },
  { id: 'mindmap', label: 'Legal Mind Map', icon: GitGraph },
  { id: 'email', label: 'AI Email', icon: Mail },
  { id: 'schedule', label: 'Calendar', icon: Calendar },
] as const;
