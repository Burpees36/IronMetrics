import { Flame } from "lucide-react";

export function TheManifesto() {
  return (
    <div className="min-h-screen bg-[#f3f0ea] flex items-center justify-center p-8 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-[3rem] shadow-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-8 md:px-16 py-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4"></div>
          <div className="relative z-10 flex items-center gap-6 mb-10">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-orange-500/30 shrink-0">
              <img src="/__mockup/images/landing/founder-hunter.jpg" alt="Hunter Brashears" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Hunter Brashears</h3>
              <p className="text-orange-400 font-semibold text-lg">Founder, ForgeOS</p>
            </div>
          </div>
          <blockquote className="text-3xl md:text-4xl font-bold leading-tight tracking-tight relative z-10">
            "Make gyms better. Because better gyms create better people. And better people create a better world."
          </blockquote>
        </div>

        <div className="px-8 md:px-16 py-12 md:py-16 space-y-8">
          <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Why ForgeOS Exists</h4>

            <p className="text-xl font-medium text-slate-900">
              I realized that if you want to make a bigger impact, you can't just coach one class at a time. You have to make the gyms themselves better.
            </p>

            <p>
              Because when a gym improves, every single member inside it benefits. That's what ForgeOS is built to do.
            </p>

            <p>
              It's not just another dashboard. It's not just reports and charts. It's a system designed to help gym owners understand who is at risk of leaving, where revenue is being lost, what actions actually move the needle — and most importantly, <span className="font-bold text-slate-900">what to do next.</span>
            </p>
          </div>

          <div className="border-t border-slate-200 pt-8 space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">What This Is Really About</h4>

            <p className="text-lg text-slate-700 leading-relaxed">
              This isn't about software. It's about raising the standard of gyms. It's about creating places where someone could walk in for the first time, nervous and unsure, and feel like they belong.
            </p>

            <p className="text-lg text-slate-700 leading-relaxed">
              It's about building gyms strong enough that you would confidently send your own family there. That's the bar.
            </p>
          </div>

          <div className="bg-orange-50 rounded-2xl p-8 border border-orange-100">
            <div className="flex items-start gap-4">
              <Flame className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
              <div className="space-y-2">
                <p className="text-lg font-bold text-slate-900">The Mission</p>
                <p className="text-slate-700 leading-relaxed">
                  ForgeOS exists to turn data into decisions, so gym owners can focus on what actually matters — their people.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
