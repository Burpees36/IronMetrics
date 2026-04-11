export function FlameContainedFire() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase font-medium">Flame Variation 2 — Contained Fire</p>

        <div className="flex items-center gap-4">
          <div style={{ width: 52, height: 52, background: "#0f172a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C16 0 2 12 2 24C2 34 8 38 16 40C24 38 30 34 30 24C30 12 16 0 16 0Z" fill="#f97316" />
              <path d="M16 10C16 10 8 18 8 26C8 32 11 36 16 38C21 36 24 32 24 26C24 18 16 10 16 10Z" fill="#fb923c" />
              <path d="M16 18C16 18 12 22 12 27C12 32 14 34 16 36C18 34 20 32 20 27C20 22 16 18 16 18Z" fill="#fbbf24" />
              <path d="M16 26C16 26 14 28 14 30C14 32 15 34 16 35C17 34 18 32 18 30C18 28 16 26 16 26Z" fill="#fef3c7" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-0.5px", color: "#0f172a", lineHeight: 1 }}>
              FORGE
            </span>
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-0.5px", lineHeight: 1, background: "linear-gradient(90deg, #f97316, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              OS
            </span>
          </div>
        </div>

        <div className="flex gap-6 items-start mt-2">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">App Store Icon</p>
            <div style={{ width: 120, height: 120, borderRadius: 26, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="#0f172a" />
                <path d="M60 18C60 18 24 42 24 66C24 86 38 96 60 100C82 96 96 86 96 66C96 42 60 18 60 18Z" fill="#f97316" />
                <path d="M60 32C60 32 36 50 36 68C36 82 46 90 60 94C74 90 84 82 84 68C84 50 60 32 60 32Z" fill="#fb923c" />
                <path d="M60 44C60 44 46 56 46 68C46 80 52 86 60 90C68 86 74 80 74 68C74 56 60 44 60 44Z" fill="#fbbf24" />
                <path d="M60 58C60 58 52 64 52 72C52 78 55 84 60 86C65 84 68 78 68 72C68 64 60 58 60 58Z" fill="#fef3c7" />
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
                  <path d="M60 18C60 18 24 42 24 66C24 86 38 96 60 100C82 96 96 86 96 66C96 42 60 18 60 18Z" fill="#f97316" />
                  <path d="M60 32C60 32 36 50 36 68C36 82 46 90 60 94C74 90 84 82 84 68C84 50 60 32 60 32Z" fill="#fb923c" />
                  <path d="M60 44C60 44 46 56 46 68C46 80 52 86 60 90C68 86 74 80 74 68C74 56 60 44 60 44Z" fill="#fbbf24" />
                  <path d="M60 58C60 58 52 64 52 72C52 78 55 84 60 86C65 84 68 78 68 72C68 64 60 58 60 58Z" fill="#fef3c7" />
                </svg>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: "hidden" }}>
                <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M60 20C60 20 26 44 26 66C26 86 40 96 60 100C80 96 94 86 94 66C94 44 60 20 60 20Z" fill="#f97316" />
                  <path d="M60 36C60 36 38 52 38 68C38 82 48 90 60 94C72 90 82 82 82 68C82 52 60 36 60 36Z" fill="#fb923c" />
                  <path d="M60 50C60 50 46 60 46 70C46 80 52 86 60 90C68 86 74 80 74 70C74 60 60 50 60 50Z" fill="#fbbf24" />
                </svg>
              </div>
              <div style={{ width: 29, height: 29, borderRadius: 6, overflow: "hidden" }}>
                <svg width="29" height="29" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M60 22C60 22 28 44 28 66C28 86 42 96 60 100C78 96 92 86 92 66C92 44 60 22 60 22Z" fill="#f97316" />
                  <path d="M60 40C60 40 40 54 40 68C40 82 48 90 60 94C72 90 80 82 80 68C80 54 60 40 60 40Z" fill="#fbbf24" />
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
