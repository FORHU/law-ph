
import React from 'react';

interface ResourceCardProps {
  title: string;
  description: string;
  link: string;
  icon: string;
  tag?: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ title, description, link, icon, tag }) => (
  <a 
    href={link} 
    target="_blank" 
    rel="noopener noreferrer"
    className="group p-6 rounded-3xl bg-card-dark/40 border border-border-dark hover:border-primary/50 hover:bg-slate-800/50 transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      {tag && (
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-800 text-slate-500 group-hover:text-primary transition-colors">
          {tag}
        </span>
      )}
    </div>
    <h4 className="text-lg font-bold mb-2 text-white group-hover:text-primary transition-colors">{title}</h4>
    <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-300 transition-colors">{description}</p>
    <div className="mt-4 flex items-center gap-2 text-primary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
      Visit Portal <span className="material-symbols-outlined text-sm">open_in_new</span>
    </div>
  </a>
);

const ResourcesSection: React.FC = () => {
  return (
    <section id="resources" className="py-24 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
              Citizen Hub
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-4">Verified Legal Resources</h2>
            <p className="text-slate-500 text-lg">Direct access to official government portals and free legal assistance programs in the Philippines.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors whitespace-nowrap">
            View All Directories <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Official Portals */}
          <ResourceCard 
            title="Official Gazette"
            description="The public journal and main publication of the Republic of the Philippines. Access R.A.s and E.O.s."
            link="https://www.officialgazette.gov.ph/"
            icon="public"
            tag="Government"
          />
          <ResourceCard 
            title="Supreme Court E-Library"
            description="A comprehensive database of SC decisions, resolutions, and administrative matters."
            link="https://elibrary.judiciary.gov.ph/"
            icon="account_balance"
            tag="Judiciary"
          />
          <ResourceCard 
            title="PAO Website"
            description="Official portal of the Public Attorney's Office for indigent litigants seeking free legal aid."
            link="https://pao.gov.ph/"
            icon="diversity_3"
            tag="Legal Aid"
          />
          
          {/* Reference Materials */}
          <ResourceCard 
            title="1987 Constitution"
            description="The fundamental law of the land. Essential reading for every Filipino citizen's rights."
            link="https://www.officialgazette.gov.ph/constitutions/the-1987-constitution-of-the-republic-of-the-philippines/"
            icon="menu_book"
            tag="Reference"
          />
          <ResourceCard 
            title="Revised Penal Code"
            description="Access the primary law defining crimes and penalties in the Philippines (Act No. 3815)."
            link="https://lawphil.net/statutes/acts/act_3815_1930.html"
            icon="gavel"
            tag="Reference"
          />
          <ResourceCard 
            title="Integrated Bar (IBP)"
            description="Directory of local chapters for finding licensed lawyers and legal aid programs."
            link="https://ibp.ph/"
            icon="groups"
            tag="Professional"
          />
        </div>

        <div className="mt-16 p-8 rounded-[32px] bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
              <span className="material-symbols-outlined text-4xl">emergency</span>
            </div>
            <div>
              <h4 className="text-xl font-bold">Emergency Legal Help?</h4>
              <p className="text-slate-400 text-sm">Need immediate assistance for arrests or rights violations?</p>
            </div>
          </div>
          <div className="flex gap-4">
             <a href="tel:911" className="px-6 py-3 rounded-xl bg-white text-slate-900 font-black text-sm hover:bg-slate-100 transition-all active:scale-95">Call Emergency Services</a>
             <button className="px-6 py-3 rounded-xl border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-all">List of 24/7 Hotlines</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResourcesSection;
