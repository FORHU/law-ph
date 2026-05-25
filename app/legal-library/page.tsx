'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, ChevronRight, Gavel, Scale, Building2, X, FileText, ArrowRight, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';

interface RagDocument {
  id: number;
  title: string | null;
  case_no: string | null;
  category: string;
  subcategory: string | null;
  year: number | null;
  source_url: string | null;
  concise_summary: string | null;
  matched_in?: 'title' | 'summary' | 'full_text';
}

const CATEGORIES = [
  {
    id: 'law',
    label: 'Law',
    icon: Scale,
    count: 32525,
    color: 'from-[#722f37]/30 to-[#722f37]/5',
    border: 'border-[#722f37]/40',
    description: 'Republic Acts, Presidential Decrees, Constitutions & Statutes',
    subcategories: [
      { id: '', label: 'All Laws' },
      { id: 'statutes', label: 'Statutes' },
      { id: 'constitutions', label: 'Constitutions' },
      { id: 'presidential_issuances', label: 'Presidential Issuances' },
      { id: 'supreme_court_issuances', label: 'SC Issuances' },
    ],
  },
  {
    id: 'jurisprudence',
    label: 'Jurisprudence',
    icon: Gavel,
    count: 14747,
    color: 'from-[#e9c176]/20 to-[#e9c176]/5',
    border: 'border-[#e9c176]/30',
    description: 'Supreme Court & Court of Tax Appeals decisions',
    subcategories: [
      { id: '', label: 'All Cases' },
      { id: 'court_of_tax_appeals', label: 'Court of Tax Appeals' },
    ],
  },
  {
    id: 'issuance',
    label: 'Issuance',
    icon: Building2,
    count: 20870,
    color: 'from-white/10 to-white/5',
    border: 'border-white/10',
    description: 'BIR, BOC, DILG, DOLE & other agency orders',
    subcategories: [
      { id: '', label: 'All Issuances' },
      { id: 'bureau_of_internal_revenue', label: 'BIR' },
      { id: 'bureau_of_customs', label: 'Bureau of Customs' },
      { id: 'department_of_the_interior_and_local_government', label: 'DILG' },
      { id: 'department_of_labor_and_employment', label: 'DOLE' },
      { id: 'department_of_justice', label: 'DOJ' },
      { id: 'civil_service_commission', label: 'Civil Service Commission' },
      { id: 'employees_compensation_commission', label: 'ECC' },
      { id: 'department_of_energy', label: 'DOE' },
      { id: 'bureau_of_corrections', label: 'Bureau of Corrections' },
    ],
  },
];

const docCache = new Map<string, RagDocument[]>();

function stripDates(title: string): string {
  return title
    .replace(/,?\s*\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\b/gi, '')
    .replace(/,?\s*\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function LegalLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get('category') || 'law';
  const initialSubcategory = searchParams.get('subcategory') || '';
  const initialKeyword = searchParams.get('q') || '';
  const initialPage = parseInt(searchParams.get('page') || '1');

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState(initialSubcategory);
  const [searchInput, setSearchInput] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [showFilter, setShowFilter] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [articleNo, setArticleNo] = useState('');
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  const [appliedYearFrom, setAppliedYearFrom] = useState('');
  const [appliedYearTo, setAppliedYearTo] = useState('');
  const [appliedArticleNo, setAppliedArticleNo] = useState('');
  const [appliedLibraries, setAppliedLibraries] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lib_saved_searches') || '[]'); } catch { return []; }
  });

  const YEARS = Array.from({ length: 2026 - 1899 + 1 }, (_, i) => 1899 + i);

  const LIBRARIES = {
    LAW: ['Acts', 'Batas Pambansa', 'Commonwealth Act', 'Executive Order', 'Republic Act', 'Administrative Circulars', 'Administrative Matters', 'Rules of Court', 'Constitutions', 'General Order', 'Letter of Implementation', 'Letter of Instruction', 'Presidential Decree', 'Implementing Rules and Regulations'],
    JURISPRUDENCE: ['Court of Tax Appeals', 'Supreme Court'],
    ISSUANCE: ['Bureau of Internal Revenue', 'Bureau of Customs', 'Civil Service Commission', 'Department of Agrarian Reform', 'Department of Energy', 'Department of Finance', 'Department of Justice', 'Department of Labor and Employment', 'Department of the Interior and Local Government', 'Employees Compensation Commission', 'National Labor Relations Commission', 'Securities and Exchange Commission'],
    TREATY: ['Treaty'],
  };

  const LIBRARY_TO_CATEGORY: Record<string, string> = {
    ...Object.fromEntries(LIBRARIES.LAW.map(l => [l, 'law'])),
    ...Object.fromEntries(LIBRARIES.JURISPRUDENCE.map(l => [l, 'jurisprudence'])),
    ...Object.fromEntries(LIBRARIES.ISSUANCE.map(l => [l, 'issuance'])),
    ...Object.fromEntries(LIBRARIES.TREATY.map(l => [l, 'law'])),
  };

  const toggleLibrary = (lib: string) => {
    setSelectedLibraries(prev => prev.includes(lib) ? prev.filter(l => l !== lib) : [...prev, lib]);
  };

  const routerRef = React.useRef(router);
  routerRef.current = router;

  const limit = 16;

  const currentCategory = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
  const CategoryIcon = currentCategory.icon;

  const fetchDocuments = useCallback(async (cat: string, sub: string, q: string, p: number, yFrom?: string, yTo?: string, articleNum?: string, libs?: string[]) => {
    const offset = (p - 1) * limit;
    const params = new URLSearchParams();
    const effectiveQuery = articleNum || q;
    if (effectiveQuery) params.set('q', effectiveQuery);
    if (!libs || libs.length === 0) {
      params.set('category', cat);
      if (sub) params.set('subcategory', sub);
    }
    if (yFrom) params.set('yearFrom', yFrom);
    if (yTo) params.set('yearTo', yTo);
    if (libs && libs.length > 0) params.set('libraries', libs.join(','));
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const cacheKey = params.toString();

    // Return cached results instantly without loading state
    if (docCache.has(cacheKey)) {
      setDocuments(docCache.get(cacheKey)!);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rag/documents?${cacheKey}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const docs = data.documents || [];
      docCache.set(cacheKey, docs);
      setDocuments(docs);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchDocuments(activeCategory, activeSubcategory, keyword, 1, appliedYearFrom, appliedYearTo, appliedArticleNo, appliedLibraries);
    const p = new URLSearchParams();
    if (activeCategory) p.set('category', activeCategory);
    if (activeSubcategory) p.set('subcategory', activeSubcategory);
    if (keyword) p.set('q', keyword);
    routerRef.current.replace(`/legal-library?${p.toString()}`, { scroll: false });
  }, [activeCategory, activeSubcategory, keyword, appliedYearFrom, appliedYearTo, appliedArticleNo, appliedLibraries, fetchDocuments]);

  useEffect(() => {
    if (page > 1) {
      fetchDocuments(activeCategory, activeSubcategory, keyword, page, appliedYearFrom, appliedYearTo, appliedArticleNo, appliedLibraries);
      const p = new URLSearchParams();
      if (activeCategory) p.set('category', activeCategory);
      if (activeSubcategory) p.set('subcategory', activeSubcategory);
      if (keyword) p.set('q', keyword);
      p.set('page', String(page));
      routerRef.current.replace(`/legal-library?${p.toString()}`, { scroll: false });
    }
  }, [page, activeCategory, activeSubcategory, keyword, appliedYearFrom, appliedYearTo, appliedArticleNo, appliedLibraries, fetchDocuments]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setActiveSubcategory('');
    setPage(1);
  };

  const handleApplyFilter = () => {
    setAppliedYearFrom(yearFrom);
    setAppliedYearTo(yearTo);
    setAppliedArticleNo(articleNo);
    setAppliedLibraries(selectedLibraries);

    // Auto-switch category based on selected libraries
    if (selectedLibraries.length > 0) {
      const detectedCategory = LIBRARY_TO_CATEGORY[selectedLibraries[0]];
      if (detectedCategory && detectedCategory !== activeCategory) {
        setActiveCategory(detectedCategory);
        setActiveSubcategory('');
      }
    }

    setShowFilter(false);
    setPage(1);
  };

  const handleClearFilter = () => {
    setYearFrom('');
    setYearTo('');
    setArticleNo('');
    setSelectedLibraries([]);
    setAppliedYearFrom('');
    setAppliedYearTo('');
    setAppliedArticleNo('');
    setAppliedLibraries([]);
    setPage(1);
  };

  const hasActiveFilter = appliedYearFrom || appliedYearTo || appliedArticleNo || appliedLibraries.length > 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    setKeyword(q);
    setPage(1);
    if (q) {
      setSavedSearches(prev => {
        const updated = [q, ...prev.filter(s => s !== q)].slice(0, 8);
        try { localStorage.setItem('lib_saved_searches', JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
  };

  const removeSavedSearch = (s: string) => {
    setSavedSearches(prev => {
      const updated = prev.filter(x => x !== s);
      try { localStorage.setItem('lib_saved_searches', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setKeyword('');
    setPage(1);
  };

  return (
    <PageLayout
      activePage="library"
      title="Library"
      subtitle="Browse Philippine legal documents"
      maxWidth="max-w-7xl"
      backgroundAngle={2}
    >
      <div className="flex-1 flex flex-col min-h-0 relative z-10 pt-2 pb-6 px-2 md:px-0 gap-6 overflow-hidden">

        {/* Search + Filter */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 focus-within:border-[#722f37]/50 transition-all">
                <Search size={16} className="text-gray-600 flex-shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search cases, laws, acts, or legal topics..."
                  className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none"
                />
                {searchInput && (
                  <button type="button" onClick={handleClearSearch} className="text-gray-600 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
                <button type="submit" className="bg-[#722f37] hover:bg-[#8b3a44] text-white text-[10px] font-bold uppercase tracking-widest px-5 py-2 rounded-xl transition-all">
                  Search
                </button>
              </div>
            </form>

            {/* Filter button */}
            <button onClick={() => setShowFilter(f => !f)}
              className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl border text-[11px] font-bold uppercase tracking-widest transition-all ${
                hasActiveFilter
                  ? 'bg-[#722f37]/30 border-[#722f37]/50 text-white'
                  : 'bg-white/[0.03] border-white/10 text-gray-500 hover:text-white hover:border-white/20'
              }`}
            >
              <SlidersHorizontal size={15} />
              Filter
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#e9c176]" />}
            </button>
          </div>

          {/* Saved searches */}
          {savedSearches.length > 0 && !keyword && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Recent:</span>
              {savedSearches.map(s => (
                <div key={s} className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg overflow-hidden group">
                  <button
                    onClick={() => { setSearchInput(s); setKeyword(s); setPage(1); }}
                    className="px-3 py-1 text-[11px] text-gray-400 hover:text-white transition-colors"
                  >{s}</button>
                  <button
                    onClick={() => removeSavedSearch(s)}
                    className="px-2 py-1 text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  ><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Drawer — slides in from right */}
        {showFilter && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilter(false)} />
            <div className="fixed top-0 right-0 h-full w-80 z-50 bg-[#0f0f10] border-l border-white/[0.07] flex flex-col shadow-2xl">

              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-[#e9c176]" />
                  <span className="text-sm font-bold text-white uppercase tracking-widest">Filters</span>
                </div>
                <button onClick={() => setShowFilter(false)} className="text-gray-600 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8" style={{ scrollbarWidth: 'none' }}>

                {/* Year range */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Year Range</p>
                  <div className="flex gap-2">
                    <select
                      value={yearFrom}
                      onChange={e => setYearFrom(e.target.value)}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#722f37]/60 transition-all"
                    >
                      <option value="">From</option>
                      {YEARS.map(y => <option key={y} value={y} className="bg-[#0f0f10]">{y}</option>)}
                    </select>
                    <select
                      value={yearTo}
                      onChange={e => setYearTo(e.target.value)}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#722f37]/60 transition-all"
                    >
                      <option value="">To</option>
                      {YEARS.slice().reverse().map(y => <option key={y} value={y} className="bg-[#0f0f10]">{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Article number */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Article / Case Number</p>
                  <input
                    type="text"
                    value={articleNo}
                    onChange={e => setArticleNo(e.target.value)}
                    placeholder="e.g. G.R. No. 149023, RA 1131"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[#722f37]/60 transition-all"
                  />
                </div>

                {/* Libraries */}
                {(Object.entries(LIBRARIES) as [string, string[]][]).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map(item => {
                        const active = selectedLibraries.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() => toggleLibrary(item)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              active
                                ? 'bg-[#722f37]/30 border-[#722f37]/50 text-white'
                                : 'bg-white/[0.03] border-white/[0.07] text-gray-500 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer footer */}
              <div className="px-6 py-5 border-t border-white/[0.07] flex flex-col gap-2">
                <button
                  onClick={handleApplyFilter}
                  className="w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-[#722f37] hover:bg-[#8b3a44] text-white transition-all"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleClearFilter}
                  className="w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </>
        )}

        {/* Category cards */}
        <div className="grid grid-cols-3 gap-4 flex-shrink-0">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`relative rounded-2xl p-4 text-left transition-all border ${
                  isActive
                    ? `bg-gradient-to-br ${cat.color} ${cat.border} shadow-xl`
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-white/10' : 'bg-white/5'}`}>
                    <Icon size={16} className={isActive ? 'text-[#e9c176]' : 'text-gray-500'} />
                  </div>
                </div>
                <p className={`text-sm font-bold mb-1 ${isActive ? 'text-white' : 'text-gray-500'}`}>{cat.label}</p>
                <p className={`text-[10px] leading-relaxed ${isActive ? 'text-gray-400' : 'text-gray-600'}`}>{cat.description}</p>
              </button>
            );
          })}
        </div>

        {/* Subcategory dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowSubcategoryDropdown(d => !d)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeSubcategory
                ? 'bg-[#722f37]/20 border-[#722f37]/40 text-white'
                : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span>
              {activeSubcategory
                ? currentCategory.subcategories.find(s => s.id === activeSubcategory)?.label
                : `All ${currentCategory.label}`}
            </span>
            <ChevronDown size={13} className={`transition-transform ${showSubcategoryDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showSubcategoryDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSubcategoryDropdown(false)} />
              <div className="absolute top-full left-0 mt-2 z-20 w-56 bg-[#0f0f10] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
                {currentCategory.subcategories.map(sub => {
                  const isActive = activeSubcategory === sub.id;
                  return (
                    <button
                      key={sub.id || 'all'}
                      onClick={() => {
                        setActiveSubcategory(sub.id);
                        setPage(1);
                        setShowSubcategoryDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-[#722f37]/20 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>{sub.label}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#e9c176]" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Results area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
                <Loader2 className="animate-spin text-[#e9c176]" size={24} />
              </div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest animate-pulse">Loading documents...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              {keyword ? (
                <div className="w-full max-w-md bg-[#722f37]/10 border border-[#722f37]/20 rounded-2xl px-6 py-6 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#722f37]/20 flex items-center justify-center">
                    <FileText size={18} className="text-[#e9c176]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-serif text-white mb-1">
                      No results in <span className="text-[#e9c176]">{currentCategory.label}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      No documents matching <span className="text-gray-300">&quot;{keyword}&quot;</span> were found in this category.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {CATEGORIES.filter(c => c.id !== activeCategory).map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
                      >
                        Try in {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <FileText size={22} className="text-gray-600" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-serif text-white">No documents in this category</p>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {!loading && documents.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {keyword ? `Results for "${keyword}"` : `${currentCategory.label}${activeSubcategory ? ` · ${currentCategory.subcategories.find(s => s.id === activeSubcategory)?.label}` : ''}`}
                </p>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{documents.length} shown</p>
              </div>

              <div className="flex flex-col pb-6">
                {documents.map(doc => (
                  <Link
                    key={doc.id}
                    href={`/legal-library/${doc.id}`}
                    className="group flex items-start gap-4 py-4 hover:bg-white/[0.02] px-3 -mx-3 rounded-xl transition-all"
                  >
                    {/* Left icon */}
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-[#722f37]/30 group-hover:bg-[#722f37]/10 transition-all">
                      <CategoryIcon size={14} className="text-gray-600 group-hover:text-[#e9c176] transition-colors" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {doc.case_no && (
                          <span className="text-[9px] font-mono font-bold text-[#e9c176]/70 uppercase tracking-wider">
                            {doc.case_no}
                          </span>
                        )}
                        {doc.year && (
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">· {doc.year}</span>
                        )}
                        {doc.subcategory && (
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                            · {doc.subcategory.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm text-gray-300 group-hover:text-white transition-colors leading-snug mb-1 line-clamp-1 capitalize">
                        {stripDates(doc.title ?? doc.case_no ?? 'Untitled Document')}
                      </h3>
                      {doc.matched_in && doc.matched_in !== 'title' && (
                        <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#e9c176]/10 text-[#e9c176] border border-[#e9c176]/20 mb-1">
                          Match in {doc.matched_in === 'full_text' ? 'full text' : 'summary'}
                        </span>
                      )}
                      {doc.concise_summary && (
                        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-1 group-hover:text-gray-500 transition-colors">
                          {doc.concise_summary}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight size={14} className="text-gray-700 group-hover:text-white transition-colors flex-shrink-0 mt-2" />
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between py-4 border-t border-white/5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
                >
                  ← Previous
                </button>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Page {page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={documents.length < limit}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
