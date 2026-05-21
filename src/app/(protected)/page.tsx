export default async function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Cellar Book</h1>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Déconnexion
          </button>
        </form>
      </header>

      <main className="px-6 py-12 max-w-4xl mx-auto">
        <div className="text-center space-y-3">
          <p className="text-4xl">🍷</p>
          <h2 className="text-xl font-medium text-zinc-200">Cave vide pour l&#39;instant</h2>
          <p className="text-sm text-zinc-500">
            Phase 0 complète — les fonctionnalités arrivent en Phase 1.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Cave', emoji: '📦', desc: 'Catalogue des vins' },
            { label: 'Boire', emoji: '🥂', desc: 'Apogées & priorités' },
            { label: 'Optimiser', emoji: '📊', desc: 'Analyse prospective' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-2 opacity-50 cursor-not-allowed"
            >
              <p className="text-2xl">{item.emoji}</p>
              <p className="text-sm font-medium text-zinc-300">{item.label}</p>
              <p className="text-xs text-zinc-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
