'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search, Plus, Filter, Folder, FileText, Clock, ChevronRight, Briefcase
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { PageLayout } from '@/components/ui/page-layout';

interface Case {
  id: string;
  caseName: string;
  partyInvolved: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function CasesPage() {
  const router = useRouter();
  const { loggedIn } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loggedIn) return;

    fetch('/api/cases')
      .then((r) => r.json())
      .then(({ cases }) => setCases(cases || []))
      .catch((err) => console.error('Error fetching cases:', err))
      .finally(() => setLoading(false));
  }, [loggedIn]);

  const filteredCases = cases.filter((c) =>
    c.caseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.partyInvolved || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout activePage="cases" title="Case Management" subtitle="Organize and track your legal matters" backgroundAngle={2}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cases or parties..."
              className="w-full bg-[#1A1A1B] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none glass-panel px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-all">
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => router.push('/create-case')}
              className="flex-1 md:flex-none bg-[#722f37] hover:bg-[#8b3a44] text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-black/40 font-bold uppercase tracking-widest text-[10px]"
            >
              <Plus className="w-5 h-5" />
              New Case
            </button>
          </div>
        </div>

        <motion.div
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6"
        >
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-secondary"></div>
            </div>
          ) : filteredCases.length > 0 ? (
            filteredCases.map((c) => (
              <motion.div
                key={c.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                onClick={() => router.push(`/cases/${c.id}`)}
                className="glass-panel p-8 rounded-3xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.03]"
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
              >
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-[#722f37]/20 group-hover:border-[#722f37]/30 transition-all">
                    <Briefcase className="w-8 h-8 text-gray-400 group-hover:text-[#ffb2b8]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif text-white mb-2 group-hover:text-[#ffb2b8] transition-colors">{c.caseName}</h3>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                      {c.partyInvolved && (
                        <span className="flex items-center gap-2 uppercase tracking-wider text-[10px]">
                          <Folder className="w-4 h-4 text-gray-600" /> {c.partyInvolved}
                        </span>
                      )}
                      <span className="flex items-center gap-2 uppercase tracking-wider text-[10px]">
                        <Clock className="w-4 h-4 text-gray-600" /> {new Date(c.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-white/10 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-40 glass-panel rounded-[3rem] border-dashed border-white/10">
              <Folder className="w-20 h-20 text-gray-800 mx-auto mb-8" />
              <h3 className="text-3xl font-serif text-gray-500 mb-4">No cases found</h3>
              <p className="text-gray-600 text-lg">Start by creating your first legal matter.</p>
            </div>
          )}
        </motion.div>
      </div>
    </PageLayout>
  );
}
