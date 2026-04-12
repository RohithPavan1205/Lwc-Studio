'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Zap,
  ArrowUpRight,
  User
} from 'lucide-react';

const CATEGORIES = ['All', 'Data', 'Forms', 'UI', 'Notifications', 'Featured'];

interface Template {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  preview: React.ReactNode;
  isFeatured?: boolean;
  hasArrowBtn?: boolean;
}

const TEMPLATES: Template[] = [
  {
    slug: 'modern-data-table',
    name: 'Modern Data Table',
    description: 'A responsive data table with sorting, filtering, and pagination powered by @wire.',
    tags: ['@wire', 'lightning-datatable', 'sorting'],
    isFeatured: true,
    hasArrowBtn: true,
    preview: (
      <div className="w-[85%] h-auto bg-[#1a1a1a] rounded-lg border border-white/10 p-3 shadow-2xl flex flex-col mx-auto mt-4 opacity-95">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] font-bold text-white/90">Data Table</div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2 pb-1.5 border-b border-white/10 text-[8px] text-white/50 font-semibold tracking-wide">
          <div>Name</div><div>Status</div><div>Amount</div><div>Date</div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="grid grid-cols-4 gap-2 py-1.5 items-center">
            <div className="h-1.5 w-full bg-white/20 rounded"></div>
            <div className="h-1.5 w-3/4 bg-white/20 rounded"></div>
            <div className="h-1.5 w-1/2 bg-white/20 rounded"></div>
            <div className="h-1.5 w-3/4 bg-white/20 rounded"></div>
          </div>
        ))}
      </div>
    ),
  },
  {
    slug: 'profile-card',
    name: 'Profile Card',
    description: 'A sleek account/contact profile card with avatar, fields, and action buttons.',
    tags: ['lightning-card', '@api', 'recordId'],
    hasArrowBtn: false,
    preview: (
      <div className="w-[65%] bg-[#1a1a1a] rounded-xl border border-white/10 p-4 shadow-2xl flex flex-col items-center opacity-95 mx-auto mt-2">
        <div className="w-10 h-10 rounded-full bg-[#1c1c1c] mb-2 overflow-hidden flex items-center justify-center border border-[#333] shadow-inner">
          <User className="text-white/60" size={20} />
        </div>
        <div className="text-[9px] font-bold text-white mb-0.5">Contact Card</div>
        <div className="text-[6px] text-white/40 mb-3">Personal Details</div>
        
        <div className="w-full grid grid-cols-2 gap-x-2 gap-y-2 mb-3 text-[6px] text-white/40">
           <div className="flex flex-col gap-0.5">
             <span>Phone</span>
             <div className="h-1 w-full bg-white/20 rounded"></div>
           </div>
           <div className="flex flex-col gap-0.5">
             <span>Email</span>
             <div className="h-1 w-full bg-white/20 rounded"></div>
           </div>
           <div className="flex flex-col gap-0.5">
             <span>Department</span>
             <div className="h-1 w-3/4 bg-white/20 rounded"></div>
           </div>
           <div className="flex flex-col gap-0.5">
             <span>Role</span>
             <div className="h-1 w-4/5 bg-white/20 rounded"></div>
           </div>
        </div>
        <div className="flex gap-1.5 w-full justify-center mt-auto border-t border-white/10 pt-2.5">
          <div className="h-5 flex-1 bg-[#222] rounded flex items-center justify-center text-[7px] text-white/70 border border-white/5">Call</div>
          <div className="h-5 flex-1 bg-[#222] rounded flex items-center justify-center text-[7px] text-white/70 border border-white/5">Message</div>
          <div className="h-5 w-6 bg-[#f77f00]/80 rounded flex items-center justify-center"></div>
        </div>
      </div>
    ),
  },
  {
    slug: 'smart-record-form',
    name: 'Smart Record Form',
    description: 'A dynamic record edit form with lightning-record-edit-form and validation.',
    tags: ['lightning-record-edit-form', 'validation'],
    hasArrowBtn: false,
    preview: (
      <div className="w-[85%] bg-[#1a1a1a] rounded-lg border border-white/10 p-3.5 shadow-2xl flex flex-col opacity-95 mx-auto mt-2">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-1.5 h-1.5 rounded bg-[#f77f00]"></div>
          <div className="text-[9px] font-bold text-white/90">Smart Record Form</div>
        </div>
        <div className="space-y-2.5 flex-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1">
              <div className="h-1.5 w-12 bg-white/20 rounded"></div>
              <div className="h-4 w-full bg-[#111] border border-white/5 rounded"></div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-3">
           <div className="h-5 w-12 rounded bg-[#f77f00]/80"></div>
        </div>
      </div>
    ),
  },
  {
    slug: 'chart-dashboard',
    name: 'Chart Dashboard',
    description: 'A responsive chart table with sorting, filtering, and pagination powered.',
    tags: ['@wire', 'lightning-datatable'],
    hasArrowBtn: true,
    preview: (
      <div className="w-[90%] h-auto bg-[#1a1a1a] rounded-lg border border-white/10 p-3 shadow-2xl flex flex-col opacity-95 mx-auto mt-3">
        <div className="flex justify-between h-full gap-3">
          <div className="flex-1 flex flex-col">
             <div className="text-[9px] font-bold text-white/80 mb-2">Chart Dashboard</div>
             <div className="flex-1 flex items-end gap-1 pb-1 border-b border-l border-white/10 px-1 pt-3">
               {[40, 60, 30, 80, 50, 70, 40, 90, 60, 75].map((h, i) => (
                 <div key={i} className="flex-1 bg-[#f77f00]/70 rounded-t-sm" style={{height: `${h}%`}}></div>
               ))}
             </div>
          </div>
          <div className="w-[35%] flex flex-col">
             <div className="text-[9px] font-bold text-white/80 mb-2 text-right">Chart Dashboard</div>
             <div className="flex-1 flex items-center justify-center mt-2">
               <div className="w-12 h-12 rounded-full border-[4px] border-[#f77f00] border-r-[#f77f00]/20"></div>
             </div>
          </div>
        </div>
        <div className="grid grid-cols-2 mt-3 pt-2 border-t border-white/10">
           <div><div className="h-1.5 w-8 bg-white/20 rounded"></div></div>
           <div className="flex justify-end"><div className="h-1.5 w-12 bg-white/20 rounded"></div></div>
        </div>
      </div>
    ),
  },
  {
    slug: 'toast-notification',
    name: 'Toast Notification',
    description: 'A sleek account/contact profile card with avatar, fields, and action buttons.',
    tags: ['lightning-card', '@api', 'recordId'],
    hasArrowBtn: true,
    preview: (
      <div className="w-[85%] mx-auto space-y-2 mt-3">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-md p-2 flex items-center gap-2 shadow-2xl relative overflow-hidden opacity-95">
          <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          </div>
          <div className="flex-1">
             <div className="text-[8px] text-white font-bold mb-0.5">Toast Notification</div>
             <div className="text-[6px] text-white/50">This is a sample error message for the user.</div>
          </div>
          <div className="text-white/40 text-[7px] pl-1">X</div>
        </div>
        <div className="bg-[#1a1a1a] border border-green-500/30 rounded-md p-2 flex items-center gap-2 shadow-2xl relative overflow-hidden opacity-95">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500"></div>
          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1">
             <div className="text-[8px] text-white font-bold mb-0.5">Toast Notification</div>
             <div className="text-[6px] text-white/50">This is a sample error message for the user.</div>
          </div>
          <div className="text-white/40 text-[7px] pl-1">X</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#f77f00]/30 rounded-md p-2 flex items-center gap-2 shadow-2xl relative overflow-hidden opacity-95">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#f77f00]"></div>
          <div className="w-4 h-4 rounded-full bg-[#f77f00]/20 flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f77f00]"></div>
          </div>
          <div className="flex-1">
             <div className="text-[8px] text-white font-bold mb-0.5">Toast Notification</div>
             <div className="text-[6px] text-white/50">This is a sample error message for the user.</div>
          </div>
          <div className="text-white/40 text-[7px] pl-1">X</div>
        </div>
      </div>
    ),
  },
  {
    slug: 'calendar-view',
    name: 'Calendar View',
    description: 'A dynamic record edit form with lightning-record-edit-form and validation.',
    tags: ['lightning-record-edit-form'],
    hasArrowBtn: true,
    preview: (
      <div className="w-[90%] bg-[#1a1a1a] rounded-lg border border-white/10 p-3 shadow-2xl flex flex-col opacity-95 mx-auto mt-2">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[9px] font-bold text-white/90">Calendar View</div>
          <div className="text-[7px] text-white/50 font-medium">{'< June 2025 >'}</div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-[6px] text-white/50 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {[...Array(35)].map((_, i) => {
            const isToday = i === 10;
            const hasEvent = i === 16 || i === 22 || i === 23 || i === 12;
            const isOff = i < 2 || i > 31;
            return (
              <div key={i} className={`aspect-square rounded-sm flex items-center justify-center text-[6px] ${isToday ? 'bg-[#f77f00] text-black font-bold' : hasEvent ? 'bg-white/10 text-white' : isOff ? 'opacity-0' : 'text-white/40'}`}>
                {i - 1}
              </div>
            );
          })}
        </div>
      </div>
    ),
  }
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans overflow-x-hidden selection:bg-[#f77f00]/30">
      {/* Ambient Glow background */}
      <div className="fixed inset-0 pointer-events-none -z-10 flex items-start justify-center overflow-hidden">
        <div className="absolute top-[-15%] w-[1200px] h-[900px] bg-[radial-gradient(circle_at_center,rgba(247,127,0,0.18)_0%,rgba(0,0,0,0)_50%)] blur-3xl mix-blend-screen" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-5">
        <Link href="/dashboard" className="forge-logo flex-shrink-0 w-28 h-8 flex items-center justify-center relative ml-2 lg:ml-4">
          <img src="/logo-full.png" alt="LWCForge" className="absolute h-[140px] w-auto max-w-none object-contain pointer-events-none" />
        </Link>
        <div className="flex items-center gap-8">
           <Link href="/dashboard" className="text-sm text-[#a1a1aa] hover:text-white transition-colors">
              Dashboard
           </Link>
           <Link href="/dashboard" className="text-sm font-semibold bg-gradient-to-r from-[#f77f00] to-[#fd6412] text-white px-5 py-2 rounded-lg shadow-[0_0_20px_rgba(247,127,0,0.4)] hover:shadow-[0_0_30px_rgba(247,127,0,0.6)] transition-all">
              Get Started
           </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center pt-24 pb-24 px-6 z-10 w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#f77f00]/20 bg-[#f77f00]/[0.05] text-[#f77f00] text-sm font-medium mb-8 backdrop-blur-md">
          <CheckCircle2 size={16} className="text-[#f77f00]" />
          Production-ready Components
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-[72px] font-bold text-center leading-[1.05] tracking-tight mb-6">
          Premium LWC<br/>Template Gallery
        </h1>
        
        <p className="text-[#a1a1aa] text-center text-lg max-w-2xl mx-auto leading-relaxed mb-16">
          Production-ready Lightning Web Components for high-end<br className="hidden md:block" />SaaS applications. Customize in seconds.
        </p>

        {/* Categories Bar */}
        <div className="flex items-center p-1.5 rounded-full bg-[#18181b]/80 border border-white/10 backdrop-blur-md mb-20 shadow-2xl">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-[#ff8c42] to-[#fd6412] text-white shadow-[0_4px_15px_rgba(247,127,0,0.3)]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full mx-auto pb-10">
          {TEMPLATES.map((t) => (
            <div 
              key={t.slug}
              className={`flex flex-col bg-[#111111]/90 backdrop-blur-md rounded-2xl overflow-hidden
                ${t.isFeatured ? 'border-[1px] border-[#f77f00] shadow-[0_0_40px_-10px_rgba(247,127,0,0.3)]' : 'border-[1px] border-white/5'}`}
            >
               {/* Preview Area */}
               <div className="h-[210px] p-4 pb-0 relative bg-black/20">
                  <div className="w-full h-full bg-gradient-to-b from-[#3a2012] to-[#121212] rounded-t-xl overflow-hidden relative">
                     {t.isFeatured && (
                       <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md text-white/90 text-[9px] font-bold px-2 py-1.5 rounded uppercase tracking-wider z-10">
                         FEATURED
                       </div>
                     )}
                     {t.preview}
                  </div>
               </div>

               {/* Content Area */}
               <div className="p-6 flex flex-col flex-1 border-t border-transparent bg-[#111111]">
                  <h3 className="text-xl font-bold text-white mb-2">{t.name}</h3>
                  <p className="text-sm text-[#a1a1aa] leading-relaxed mb-6 flex-1 min-h-[40px]">
                    {t.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {t.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs text-[#a1a1aa] font-medium tracking-wide">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => router.push(`/dashboard?new=1&template=${t.slug}`)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-300
                      ${t.isFeatured 
                        ? 'bg-gradient-to-r from-[#f77f00] to-[#e85d04] text-white shadow-[0_0_20px_rgba(247,127,0,0.3)] hover:shadow-[0_0_30px_rgba(247,127,0,0.5)]' 
                        : 'bg-[#361e12] border border-white/5 text-[#dca581] hover:bg-[#462818] hover:text-white'}`}
                  >
                    Use Template {t.hasArrowBtn && <ArrowUpRight size={16} strokeWidth={2.5} />}
                  </button>
               </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex flex-col items-center justify-center pb-12 pt-8 mt-auto relative z-10">
        <Link href="/" className="forge-logo flex-shrink-0 w-24 h-6 flex items-center justify-center relative mb-3 opacity-90 hover:opacity-100 transition-opacity">
          <img src="/logo-full.png" alt="LWCForge" className="absolute h-[100px] w-auto max-w-none object-contain pointer-events-none" />
        </Link>
        <p className="text-[13px] text-[#71717a]">All templates are free and open</p>
      </footer>
    </div>
  );
}
