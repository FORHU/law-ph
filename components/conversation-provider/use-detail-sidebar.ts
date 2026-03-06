// Detail Sidebar State Management Hook
import { useState } from 'react';
import { LegalSource, RelatedCase } from '@/lib/citation-parser';

export function useDetailSidebar(setIsSidebarOpen: (isOpen: boolean) => void) {
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<LegalSource | null>(null);
  const [selectedCase, setSelectedCase] = useState<RelatedCase | null>(null);
  const [detailContext, setDetailContext] = useState<string>('');
  
  const openSourceDetail = (source: LegalSource, context?: string) => {
    setSelectedSource(source);
    setSelectedCase(null);
    setDetailContext(context || '');
    setIsDetailSidebarOpen(true);
    // Auto-close left sidebar
    setIsSidebarOpen(false);
  };

  const openCaseDetail = (caseItem: RelatedCase, context?: string) => {
    setSelectedCase(caseItem);
    setSelectedSource(null);
    setDetailContext(context || '');
    setIsDetailSidebarOpen(true);
    // Auto-close left sidebar
    setIsSidebarOpen(false);
  };

  /** Open the source detail sidebar by item_id (e.g. from a /sources/123 link). Stays on current page. */
  const openSourceByItemId = (itemId: string, context?: string) => {
    setSelectedCase({ itemId, title: '', caseNumber: '', description: '' });
    setSelectedSource(null);
    setDetailContext(context || '');
    setIsDetailSidebarOpen(true);
    setIsSidebarOpen(false);
  };

  const closeDetailSidebar = () => {
    setIsDetailSidebarOpen(false);
    setSelectedSource(null);
    setSelectedCase(null);
    setDetailContext('');
  };
  
  return {
    isDetailSidebarOpen,
    selectedSource,
    selectedCase,
    detailContext,
    openSourceDetail,
    openCaseDetail,
    openSourceByItemId,
    closeDetailSidebar,
  };
}
