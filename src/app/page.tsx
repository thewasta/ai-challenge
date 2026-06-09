import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-primary">Consultor SEO & Marketing Digital</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Plataforma de consultoría multi-agente impulsada por IA
      </p>
      <Button
        size="lg"
        className="mt-8"
        render={<a href="/projects/new">Crear nuevo proyecto</a>}
      />
    </main>
  );
}
