"use client";

import { Loader2, Plus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function HomePageClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/projects", { method: "POST" });
      const { project, chat } = await res.json();
      router.push(`/projects/${project.id}/chats/${chat.id}`);
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Zap aria-hidden="true" className="mb-6 size-16 text-primary" />
      <h1 className="text-4xl font-bold text-primary text-center">
        Consultor SEO & Marketing Digital
      </h1>
      <p className="mt-4 text-lg text-muted-foreground text-center max-w-md">
        Plataforma de consultoría multi-agente impulsada por IA
      </p>
      <Button size="lg" className="mt-8" onClick={handleCreate} disabled={isLoading}>
        {isLoading ? (
          <Loader2 aria-hidden="true" className="animate-spin" data-icon="inline-start" />
        ) : (
          <Plus aria-hidden="true" data-icon="inline-start" />
        )}
        Crear primer proyecto
      </Button>
    </main>
  );
}
