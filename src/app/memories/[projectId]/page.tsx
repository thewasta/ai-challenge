import { ArrowLeft, Brain } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectMemoriesList } from "@/components/ProjectMemoriesList";
import { Button } from "@/components/ui/button";
import type { MemoryTopic } from "@/db/schema";
import { getMemoriesForProject, getProject } from "@/lib/db-helpers";

const topicLabels: Record<MemoryTopic, string> = {
  "content-plan": "Plan de contenido",
  "project-decision": "Decisión de proyecto",
  "seo-strategy": "Estrategia SEO",
  "technical-audit": "Auditoría técnica",
  "user-preference": "Preferencia del usuario",
};

function buildMemoryTitle(title: string, content: string) {
  const trimmedTitle = title.trim();
  if (trimmedTitle.length > 0) {
    return trimmedTitle.length > 50 ? `${trimmedTitle.slice(0, 50)}…` : trimmedTitle;
  }

  const fallbackTitle = content.trim().slice(0, 50);
  return fallbackTitle.length === 50 ? `${fallbackTitle}…` : fallbackTitle;
}

function buildPreview(content: string) {
  return content.length > 100 ? `${content.slice(0, 100)}…` : content;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);

  if (Number.isNaN(numericProjectId)) {
    return {
      title: "Memorias — Consultor SEO",
      description: "Proyecto no encontrado.",
    };
  }

  const project = await getProject(numericProjectId);

  return {
    title: project ? `${project.name} — Memorias` : "Memorias — Consultor SEO",
    description: project ? `Memorias guardadas para ${project.name}.` : "Proyecto no encontrado.",
  };
}

export default async function ProjectMemoriesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);

  if (Number.isNaN(numericProjectId)) {
    redirect("/memories");
  }

  const project = await getProject(numericProjectId);

  if (!project) {
    redirect("/memories");
  }

  const memories = await getMemoriesForProject(numericProjectId);
  const memoryCards = memories.map((memory) => ({
    content: memory.content,
    createdAt: memory.createdAt.toISOString(),
    id: memory.id,
    preview: buildPreview(memory.content),
    title: buildMemoryTitle(memory.title, memory.content),
    topic: memory.topic,
    topicLabel: topicLabels[memory.topic],
  }));

  return (
    <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-4">
        <Button nativeButton={false} render={<Link href="/memories" />} variant="ghost">
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Volver a proyectos
        </Button>

        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Brain aria-hidden="true" className="size-4" />
            Proyecto seleccionado
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {memoryCards.length === 1
              ? "1 memoria guardada, ordenada de la más reciente a la más antigua."
              : `${memoryCards.length} memorias guardadas, ordenadas de la más reciente a la más antigua.`}
          </p>
        </div>
      </header>

      <ProjectMemoriesList
        initialMemories={memoryCards}
        projectId={numericProjectId}
        projectName={project.name}
      />
    </main>
  );
}
