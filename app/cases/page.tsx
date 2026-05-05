'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Filter, 
  Folder, 
  FileText, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { PageLayout } from '@/components/ui/page-layout';

interface Case {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'pending';
  last_updated: string;
  client: string;
  case_number: string;
}

export default function CasesPage() {
  const router = useRouter();
  const { supabase, session } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCases() {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching cases:', error);
        // Mock data for demo if table missing
        setCases([
          { id: '1', title: 'People vs. Dela Cruz', status: 'active', last_updated: '2026-04-28', client: 'Juan Dela Cruz', case_number: 'G.R. No. 123456' },
          { id: '2', title: 'Estate of Santiago', status: 'pending', last_updated: '2026-04-27', client: 'Santiago Family', case_number: 'SP No. 7890' },
          { id: '3', title: 'TechCorp Merger', status: 'active', last_updated: '2026-04-25', client: 'TechCorp Inc.', case_number: 'SEC-2026-01' },
        ]);
      } else {
        setCases(data || []);
      }
      setLoading(false);
    }

    fetchCases();
  }, [session, supabase]);

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout activePage="cases" title="Case Management" subtitle="Organize and track your legal matters" backgroundAngle={2}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search cases, clients, or files..." 
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

        {/* Case List */}
        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6"
        >
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-secondary"></div>
            </div>
          ) : filteredCases.length > 0 ? (
            filteredCases.map((c, index) => (
              <motion.div
                key={c.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
                }}
                onClick={() => router.push(`/cases/${c.id}`)}
                className="glass-panel p-8 rounded-3xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.03]"
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
              >
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-[#722f37]/20 group-hover:border-[#722f37]/30 transition-all">
                    <Briefcase className="w-8 h-8 text-gray-400 group-hover:text-[#ffb2b8]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif text-white mb-2 group-hover:text-[#ffb2b8] transition-colors">{c.title}</h3>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-2 uppercase tracking-wider text-[10px]"><Folder className="w-4 h-4 text-gray-600" /> {c.client}</span>
                      <span className="flex items-center gap-2 uppercase tracking-wider text-[10px]"><FileText className="w-4 h-4 text-gray-600" /> {c.case_number}</span>
                      <span className="flex items-center gap-2 uppercase tracking-wider text-[10px]"><Clock className="w-4 h-4 text-gray-600" /> {c.last_updated}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className={`px-4 h-6 inline-flex items-center justify-center text-[9px] font-black uppercase tracking-[0.2em] border rounded-md ${
                    c.status === 'active' ? 'bg-[#059669]/10 text-[#34d399] border-[#059669]/20' :
                    c.status === 'pending' ? 'bg-[#e9c176]/10 text-[#e9c176] border-[#e9c176]/20' :
                    'bg-white/5 text-gray-500 border-white/10'
                  }`}>
                    {c.status}
                  </div>
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
