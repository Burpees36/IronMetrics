export function FlameEmberGradient() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase font-medium">Flame Variation 1 — Ember Gradient</p>

        <div className="flex items-center gap-4">
          <svg width="48" height="58" viewBox="0 0 48 58" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ember1" x1="24" y1="0" x2="24" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fbbf24" />
                <stop offset="0.5" stopColor="#f97316" />
                <stop offset="1" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            <path d="M24 0C24 0 4 18 4 34C4 48 13 55 24 58C35 55 44 48 44 34C44 18 24 0 24 0Z" fill="url(#ember1)" />
            <path d="M24 16C24 16 14 26 14 36C14 44 18 50 24 53C30 50 34 44 34 36C34 26 24 16 24 16Z" fill="#0f172a" opacity="0.9" />
            <path d="M24 26C24 26 19 32 19 37C19 42 21 46 24 48C27 46 29 42 29 37C29 32 24 26 24 26Z" fill="#f97316" />
            <path d="M24 34C24 34 22 36 22 38C22 40 23 42 24 43C25 42 26 40 26 38C26 36 24 34 24 34Z" fill="#fbbf24" />
          </svg>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "30px", letterSpacing: "-0.5px", color: "#0f172a", lineHeight: 1 }}>
              FORGE<span style={{ color: "#f97316" }}>OS</span>
            </span>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 400, fontSize: "10px", letterSpacing: "3px", color: "#94a3b8", textTransform: "uppercase", marginTop: "3px" }}>
              Gym Operating System
            </span>
          </div>
        </div>

        <div className="flex gap-6 items-start mt-2">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">App Store Icon</p>
            <div style={{ width: 120, height: 120, borderRadius: 26, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="#0f172a" />
                <defs>
                  <linearGradient id="ember1b" x1="60" y1="15" x2="60" y2="105" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#fbbf24" />
                    <stop offset="0.5" stopColor="#f97316" />
                    <stop offset="1" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
                <path d="M60 15C60 15 28 40 28 62C28 82 42 95 60 100C78 95 92 82 92 62C92 40 60 15 60 15Z" fill="url(#ember1b)" />
                <path d="M60 35C60 35 42 50 42 64C42 76 49 84 60 88C71 84 78 76 78 64C78 50 60 35 60 35Z" fill="#0f172a" />
                <path d="M60 48C60 48 50 58 50 66C50 74 54 80 60 83C66 80 70 74 70 66C70 58 60 48 60 48Z" fill="#f97316" />
                <path d="M60 60C60 60 56 64 56 68C56 72 58 76 60 78C62 76 64 72 64 68C64 64 60 60 60 60Z" fill="#fbbf24" />
              </svg>
            </div>
            <p className="text-[8px] text-slate-300">1024 x 1024 · No transparency</p>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Small Sizes</p>
            <div className="flex gap-3 items-end">
              <div style={{ width: 60, height: 60, borderRadius: 13, overflow: "hidden" }}>
                <svg width="60" height="60" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <defs><linearGradient id="ember1c" x1="60" y1="15" x2="60" y2="105" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fbbf24" /><stop offset="0.5" stopColor="#f97316" /><stop offset="1" stopColor="#dc2626" /></linearGradient></defs>
                  <path d="M60 15C60 15 28 40 28 62C28 82 42 95 60 100C78 95 92 82 92 62C92 40 60 15 60 15Z" fill="url(#ember1c)" />
                  <path d="M60 35C60 35 42 50 42 64C42 76 49 84 60 88C71 84 78 76 78 64C78 50 60 35 60 35Z" fill="#0f172a" />
                  <path d="M60 48C60 48 50 58 50 66C50 74 54 80 60 83C66 80 70 74 70 66C70 58 60 48 60 48Z" fill="#f97316" />
                </svg>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: "hidden" }}>
                <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <defs><linearGradient id="ember1d" x1="60" y1="15" x2="60" y2="105" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fbbf24" /><stop offset="0.5" stopColor="#f97316" /><stop offset="1" stopColor="#dc2626" /></linearGradient></defs>
                  <path d="M60 15C60 15 28 40 28 62C28 82 42 95 60 100C78 95 92 82 92 62C92 40 60 15 60 15Z" fill="url(#ember1d)" />
                  <path d="M60 35C60 35 42 50 42 64C42 76 49 84 60 88C71 84 78 76 78 64C78 50 60 35 60 35Z" fill="#0f172a" />
                  <path d="M60 48C60 48 50 58 50 66C50 74 54 80 60 83C66 80 70 74 70 66C70 58 60 48 60 48Z" fill="#f97316" />
                </svg>
              </div>
              <div style={{ width: 29, height: 29, borderRadius: 6, overflow: "hidden" }}>
                <svg width="29" height="29" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <defs><linearGradient id="ember1e" x1="60" y1="20" x2="60" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fbbf24" /><stop offset="0.5" stopColor="#f97316" /><stop offset="1" stopColor="#dc2626" /></linearGradient></defs>
                  <path d="M60 20C60 20 30 42 30 62C30 80 43 93 60 98C77 93 90 80 90 62C90 42 60 20 60 20Z" fill="url(#ember1e)" />
                  <path d="M60 40C60 40 44 52 44 64C44 76 50 84 60 88C70 84 76 76 76 64C76 52 60 40 60 40Z" fill="#0f172a" />
                  <path d="M60 52C60 52 50 60 50 68C50 76 54 82 60 85C66 82 70 76 70 68C70 60 60 52 60 52Z" fill="#f97316" />
                </svg>
              </div>
            </div>
            <p className="text-[8px] text-slate-300">60pt · 40pt · 29pt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
