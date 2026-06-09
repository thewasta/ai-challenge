export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-[var(--color-navy)]">
        Consultor SEO & Marketing Digital
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Plataforma de consultoría multi-agente impulsada por IA
      </p>
      <a
        href="/projects/new"
        className="mt-8 rounded-lg bg-[var(--color-navy)] px-6 py-3 text-white hover:bg-slate-700 transition-colors"
      >
        Crear nuevo proyecto
      </a>
    </main>
  );
}
