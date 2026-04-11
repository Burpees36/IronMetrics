import { Flame, Target, Heart, ArrowRight } from "lucide-react";

export function TheJourney() {
  return (
    <div className="min-h-screen bg-[#f3f0ea] flex items-center justify-center p-8 font-sans">
      <div className="max-w-4xl w-full space-y-6">
        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-5">
            <div className="w-36 h-36 rounded-2xl overflow-hidden border-4 border-orange-100">
              <img src="/__mockup/images/landing/founder-hunter.jpg" alt="Hunter Brashears" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Hunter Brashears</h3>
              <p className="text-orange-600 font-semibold">Founder, ForgeOS</p>
            </div>
            <div className="w-full border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                Coach. Builder. On a mission to make gyms the best version of themselves.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">Why ForgeOS Exists</h4>
            </div>

            <p className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
              You can't change the world one class at a time. You have to make the gyms themselves better.
            </p>

            <p className="text-lg text-slate-600 leading-relaxed">
              When a gym improves, every single member inside it benefits. ForgeOS is built to make that happen — helping gym owners understand who needs attention, where revenue is leaking, and what to do next.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-600" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">What This Is Really About</h4>
            </div>

            <p className="text-lg text-slate-700 leading-relaxed">
              This isn't about software. It's about raising the standard of gyms. Creating places where someone could walk in for the first time, nervous and unsure, and feel like they belong.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              It's about building gyms strong enough that you would confidently send your own family there. <span className="font-bold text-slate-900">That's the bar.</span>
            </p>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 md:p-10 shadow-sm text-white space-y-5 relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px]"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">The Mission</h4>
            </div>

            <div className="space-y-4 relative z-10">
              <p className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
                Make gyms better.
              </p>
              <p className="text-xl text-slate-300 font-medium leading-relaxed">
                Because better gyms create better people. And better people create a better world.
              </p>
            </div>

            <div className="pt-4 relative z-10">
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 font-semibold hover:text-orange-300 transition-colors">
                Join the movement <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
