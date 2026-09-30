export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
      {/* Header */}
      <header className="w-full border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-950 font-bold text-lg">
              L
            </div>
            <span className="text-xl font-bold tracking-tight">Lianata</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API Online
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400 mb-6">
              <span>🤖</span>
              <span>Powered by AI — Catat keuangan cukup lewat chat</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              <span className="text-white">Lianata </span>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Finance API
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl">
              Backend API untuk aplikasi pencatat keuangan cerdas.
              Kirim pesan seperti{" "}
              <code className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-emerald-400 text-base">
                &quot;beli kopi 25k&quot;
              </code>{" "}
              dan transaksi langsung tercatat otomatis.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-10">
              <a
                href="/api/webhook/telegram"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold text-sm hover:from-emerald-400 hover:to-cyan-400 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.484-.429-.008-1.252-.242-1.865-.442-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.12.098.153.23.168.332.016.102.035.332.02.513z"/>
                </svg>
                Telegram Bot
              </a>
              <a
                href="#api-docs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Dokumentasi API
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: "💬",
                title: "Chat AI",
                desc: "Kirim pesan natural language, AI akan otomatis mengekstrak dan mencatat transaksi.",
              },
              {
                icon: "📱",
                title: "Telegram Bot",
                desc: "Catat keuangan langsung dari Telegram. Gratis, tanpa buka aplikasi.",
              },
              {
                icon: "🔒",
                title: "Aman",
                desc: "JWT authentication, rate limiting, CSRF protection, dan enkripsi password.",
              },
              {
                icon: "📊",
                title: "Laporan Otomatis",
                desc: "Ringkasan pengeluaran & pemasukan harian, mingguan, dan bulanan.",
              },
              {
                icon: "🏷️",
                title: "Kategori Cerdas",
                desc: "AI mengenali kategori otomatis — makanan, transport, belanja, gaji, dll.",
              },
              {
                icon: "⚡",
                title: "Serverless",
                desc: "Dibangun dengan Next.js & Neon PostgreSQL. Deploy di Vercel dalam hitungan detik.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all group"
              >
                <div className="text-2xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-1.5 group-hover:text-emerald-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Chat Demo */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Contoh Penggunaan
          </h2>
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              {/* Chat header */}
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-950 text-xs font-bold">
                  AI
                </div>
                <div>
                  <div className="text-sm font-semibold">Lianata AI</div>
                  <div className="text-xs text-emerald-400">Online</div>
                </div>
              </div>
              {/* Chat messages */}
              <div className="p-5 space-y-4">
                {/* User */}
                <div className="flex justify-end">
                  <div className="bg-emerald-500/20 border border-emerald-500/20 text-emerald-100 px-4 py-2.5 rounded-2xl rounded-tr-md text-sm max-w-[80%]">
                    saya beli kopi 25k
                  </div>
                </div>
                {/* AI */}
                <div className="flex justify-start">
                  <div className="bg-white/[0.05] border border-white/[0.08] text-slate-300 px-4 py-2.5 rounded-2xl rounded-tl-md text-sm max-w-[85%]">
                    ✅ Berhasil mencatat uang keluar sebesar Rp 25.000
                    <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs text-slate-500 space-y-0.5">
                      <div>📝 Beli kopi</div>
                      <div>📁 Makanan &amp; Minuman</div>
                      <div>💸 Pengeluaran</div>
                    </div>
                  </div>
                </div>
                {/* User */}
                <div className="flex justify-end">
                  <div className="bg-emerald-500/20 border border-emerald-500/20 text-emerald-100 px-4 py-2.5 rounded-2xl rounded-tr-md text-sm max-w-[80%]">
                    gajian bulan ini 5jt
                  </div>
                </div>
                {/* AI */}
                <div className="flex justify-start">
                  <div className="bg-white/[0.05] border border-white/[0.08] text-slate-300 px-4 py-2.5 rounded-2xl rounded-tl-md text-sm max-w-[85%]">
                    ✅ Berhasil mencatat uang masuk sebesar Rp 5.000.000
                    <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs text-slate-500 space-y-0.5">
                      <div>💰 Gaji bulanan</div>
                      <div>📁 Gaji</div>
                      <div>📈 Pemasukan</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Input */}
              <div className="px-5 py-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5">
                  <span className="text-sm text-slate-600 flex-1">
                    Ketik transaksi Anda...
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Docs */}
        <section id="api-docs" className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2">Dokumentasi API</h2>
          <p className="text-slate-500 mb-8">
            Base URL:{" "}
            <code className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400 text-sm">
              /api
            </code>
          </p>

          <div className="space-y-3">
            {[
              {
                method: "POST",
                path: "/api/auth/register",
                desc: "Daftar akun baru",
                color: "bg-green-500/10 text-green-400 border-green-500/20",
              },
              {
                method: "POST",
                path: "/api/auth/login",
                desc: "Login dengan email & password",
                color: "bg-green-500/10 text-green-400 border-green-500/20",
              },
              {
                method: "POST",
                path: "/api/auth/whatsapp-login",
                desc: "Login dengan nomor WhatsApp",
                color: "bg-green-500/10 text-green-400 border-green-500/20",
              },
              {
                method: "POST",
                path: "/api/auth/refresh",
                desc: "Refresh access token",
                color: "bg-green-500/10 text-green-400 border-green-500/20",
              },
              {
                method: "GET",
                path: "/api/auth/me",
                desc: "Data user yang sedang login",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              },
              {
                method: "GET",
                path: "/api/auth/telegram",
                desc: "Cek status koneksi Telegram",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              },
              {
                method: "POST",
                path: "/api/chat",
                desc: "Kirim pesan ke AI & catat transaksi otomatis",
                color: "bg-green-500/10 text-green-400 border-green-500/20",
              },
              {
                method: "GET",
                path: "/api/chat/sessions",
                desc: "Daftar sesi chat",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              },
              {
                method: "GET",
                path: "/api/transactions",
                desc: "Daftar transaksi dengan filter & paginasi",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              },
              {
                method: "POST",
                path: "/api/transactions",
                desc: "Buat transaksi manual",
                color: "bg-green-500/10 text-green-400 border-green-500/20",
              },
              {
                method: "GET",
                path: "/api/transactions/summary",
                desc: "Ringkasan keuangan",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              },
              {
                method: "GET",
                path: "/api/categories",
                desc: "Daftar kategori transaksi",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              },
              {
                method: "POST",
                path: "/api/webhook/telegram",
                desc: "Webhook Telegram Bot (otomatis)",
                color: "bg-green-500/10 text-green-400 border-green-500/20",
              },
            ].map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
              >
                <span
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono shrink-0 ${endpoint.color}`}
                >
                  {endpoint.method}
                </span>
                <code className="text-sm text-slate-300 font-mono shrink-0">
                  {endpoint.path}
                </code>
                <span className="text-sm text-slate-600 hidden sm:block">
                  — {endpoint.desc}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Tech Stack</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              "Next.js 16",
              "TypeScript",
              "Tailwind CSS",
              "Drizzle ORM",
              "PostgreSQL (Neon)",
              "OpenRouter AI",
              "Telegram Bot API",
              "JWT Auth",
              "Zod Validation",
              "Vercel",
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-slate-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-950 text-[10px] font-bold">
              L
            </div>
            <span>© 2026 Lianata Finance. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <a href="#api-docs" className="hover:text-slate-400 transition-colors">
              API Docs
            </a>
            <span className="text-slate-800">•</span>
            <span className="text-emerald-500/60 text-xs font-mono">
              v0.1.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
