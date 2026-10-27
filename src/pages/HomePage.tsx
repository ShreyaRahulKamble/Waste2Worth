import React from 'react';
import {
  ArrowRight,
  Sparkles,
  Recycle,
  ShoppingBag,
  HeartHandshake,
  Repeat,
  Leaf,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
  isAuthenticated: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, isAuthenticated }) => {
  return (
    <div id="home-page-container" className="min-h-screen bg-stone-950 text-stone-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 border-b border-stone-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-stone-950 to-stone-950 -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs sm:text-sm font-medium">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI-Powered Circular Economy for Campuses & Communities</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Waste is not worthless.{' '}
            <span className="block mt-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-green-200 bg-clip-text text-transparent">
              It is an opportunity.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-stone-300 leading-relaxed">
            Turn unwanted materials into useful products, value, and positive environmental impact
            with AI-powered circular intelligence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              id="hero-analyze-cta-btn"
              onClick={() => onNavigate(isAuthenticated ? '/upload' : '/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/40 hover:-translate-y-0.5"
            >
              <span>Analyze My Waste</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              id="hero-marketplace-cta-btn"
              onClick={() => onNavigate('/marketplace')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-stone-200 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <span>Explore Marketplace</span>
            </button>
          </div>

          {/* Waste -> AI -> Value Flow */}
          <div className="pt-12">
            <div className="max-w-3xl mx-auto p-4 sm:p-6 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
                Core Innovation Pipeline
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="p-4 rounded-xl bg-stone-800/60 border border-stone-700/50 text-center">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-2">
                    <Recycle className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-stone-200">1. WASTE</div>
                  <p className="text-xs text-stone-400 mt-1">Discarded items, textiles, plastics & raw materials</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 text-center relative">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center font-bold mb-2 shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-emerald-300">2. AI INTELLIGENCE</div>
                  <p className="text-xs text-emerald-200/80 mt-1">Vision identification, DIY reuse ideas & value appraisal</p>
                </div>

                <div className="p-4 rounded-xl bg-stone-800/60 border border-stone-700/50 text-center">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-teal-950/70 border border-teal-800/50 flex items-center justify-center text-teal-400 mb-2">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-stone-200">3. VALUE</div>
                  <p className="text-xs text-stone-400 mt-1">Cash, donations, circular credits & landfill diversion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Concepts: Reuse, Sell, Donate */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-stone-800">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Three Ways to Give Waste Life</h2>
          <p className="text-stone-400 mt-3 text-base">
            Every piece of scrap or discarded item has a viable circular destination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Reuse */}
          <div className="p-8 rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-105 transition-transform">
                <Repeat className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">1. Reuse & Upcycle</h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                Discover step-by-step DIY upcycling guides. Repurpose timber, electronics, cardboard, or textiles into functional college dorm items or art.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-800/80 text-xs font-semibold text-emerald-400">
              Zero Landfill Destination
            </div>
          </div>

          {/* Sell */}
          <div className="p-8 rounded-2xl bg-stone-900 border border-stone-800 hover:border-teal-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-800/60 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">2. Sell in Marketplace</h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                Turn your scrap metal, salvage parts, working electronics, or surplus materials into fair market value directly with peer buyers.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-800/80 text-xs font-semibold text-teal-400">
              Direct Peer Economy
            </div>
          </div>

          {/* Donate */}
          <div className="p-8 rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">3. Donate & Exchange</h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                Pass along stationery, laboratory gear, furniture, and books to classmates and student clubs in need while earning verified EcoPoints.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-800/80 text-xs font-semibold text-emerald-400">
              Community Circular Giving
            </div>
          </div>
        </div>
      </section>

      {/* Platform Pillars */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <Sparkles className="w-8 h-8 text-emerald-400 mb-3" />
            <h4 className="text-lg font-bold text-white mb-2">AI Waste Intelligence</h4>
            <p className="text-sm text-stone-400">
              Future Gemini vision integration for material classification, decomposition metrics, and upcycling ideas.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <ShoppingBag className="w-8 h-8 text-teal-400 mb-3" />
            <h4 className="text-lg font-bold text-white mb-2">Circular Marketplace</h4>
            <p className="text-sm text-stone-400">
              Live peer-to-peer listings categorized by condition, material, intended action, and campus dropoff spots.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <Leaf className="w-8 h-8 text-emerald-400 mb-3" />
            <h4 className="text-lg font-bold text-white mb-2">Environmental Impact</h4>
            <p className="text-sm text-stone-400">
              Real-time audit logs tracking kilograms diverted from municipal landfills, carbon savings, and community impact.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <GraduationCap className="w-8 h-8 text-cyan-400 mb-3" />
            <h4 className="text-lg font-bold text-white mb-2">Campus Community</h4>
            <p className="text-sm text-stone-400">
              Engage fellow students, faculty green clubs, and department workshops to close the resource loop.
            </p>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-16 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 border border-emerald-800/40 text-center space-y-6">
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white">
            Ready to give your campus waste a second life?
          </h3>
          <p className="text-stone-300 max-w-2xl mx-auto text-sm sm:text-base">
            Create an account in 30 seconds with your institution or email to start listing, discovering, and upcycling.
          </p>
          <div>
            <button
              id="home-bottom-cta-btn"
              onClick={() => onNavigate(isAuthenticated ? '/upload' : '/signup')}
              className="px-8 py-3.5 rounded-xl font-bold bg-emerald-400 hover:bg-emerald-300 text-stone-950 transition-colors shadow-lg"
            >
              {isAuthenticated ? 'Upload New Item' : 'Join Waste2Worth Today'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
