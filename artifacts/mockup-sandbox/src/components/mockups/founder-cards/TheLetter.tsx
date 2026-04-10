import { Flame } from "lucide-react";

export function TheLetter() {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-8 font-sans">
      <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
        <div className="px-8 md:px-14 pt-12 md:pt-16 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              FORGE<span className="text-orange-500">OS</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 font-medium ml-11">A letter from our founder</p>
        </div>

        <div className="px-8 md:px-14 pb-12 md:pb-16 space-y-7">
          <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-200 shrink-0">
              <img src="/__mockup/images/landing/founder-hunter.png" alt="Hunter Brashears" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Hunter Brashears</h3>
              <p className="text-orange-600 font-medium">Founder, ForgeOS</p>
            </div>
          </div>

          <div className="space-y-5 text-[17px] text-slate-700 leading-[1.8]">
            <p>
              I realized that if you want to make a bigger impact, you can't just coach one class at a time.
            </p>

            <p>
              You have to make the <em>gyms themselves</em> better.
            </p>

            <p>
              Because when a gym improves, every single member inside it benefits. That's what ForgeOS is built to do.
            </p>

            <p>
              It's not just another dashboard. It's not just reports and charts. It's a system designed to help gym owners understand:
            </p>

            <ul className="space-y-3 pl-6">
              {[
                "Who is at risk of leaving",
                "Where revenue is being lost",
                "What actions actually move the needle"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-3 shrink-0"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p>
              And most importantly: <span className="font-bold text-slate-900">what to do next.</span>
            </p>

            <div className="my-8 border-l-4 border-orange-300 pl-6 py-2">
              <p className="text-xl text-slate-900 font-semibold leading-relaxed italic">
                This isn't about software. It's about raising the standard of gyms. Creating places where someone could walk in for the first time, nervous and unsure, and feel like they belong.
              </p>
            </div>

            <p>
              It's about building gyms strong enough that you would confidently send your own family there. That's the bar.
            </p>

            <p className="text-slate-900 font-semibold pt-2">
              Make gyms better. Because better gyms create better people. And better people create a better world.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <img src="/__mockup/images/landing/founder-hunter.png" alt="Hunter" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Hunter Brashears</p>
              <p className="text-sm text-slate-500">Founder & CEO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
