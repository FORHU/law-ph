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
    <PageLayout activePage="cases" title="Case Management" subtitle="Organize and track your legal matters">
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
              className="flex-1 md:flex-none bg-primary hover:brightness-110 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              New Case
            </button>
          </div>
        </div>

        {/* Case List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
            </div>
          ) : filteredCases.length > 0 ? (
            filteredCases.map((c, index) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/cases/${c.id}`)}
                className="glass-panel p-6 rounded-2xl hover:border-primary/30 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-primary transition-colors">{c.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><Folder className="w-4 h-4" /> {c.client}</span>
                      <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {c.case_number}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {c.last_updated}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    c.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                  }`}>
                    {c.status}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-40 glass-panel rounded-3xl border-dashed">
              <Folder className="w-16 h-16 text-gray-700 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-400 mb-2">No cases found</h3>
              <p className="text-gray-600">Start by creating your first legal matter.</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
