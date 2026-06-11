import { Brain, FolderSearch } from "lucide-react";
import type { Metadata } from "next";
import { ProjectCard } from "@/components/ProjectCard";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getProjectsWithMemoryCount } from "@/lib/db-helpers";

export const metadata: Metadata = {
  title: "Memorias — Consultor SEO",
  description: "Explora memorias guardadas por proyecto.",
};

export default async function MemoriesPage() {
  const projectSummaries = await getProjectsWithMemoryCount();

  return (
    <main id="main-content" className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Brain aria-hidden="true" className="size-4" />
          Navega proyectos con memorias persistidas
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Memorias</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Revisa el contexto guardado por proyecto y visualiza cada memoria para ver el detalle
          completo.
        </p>
      </header>

      {projectSummaries.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderSearch aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No hay proyectos con memorias todavía</EmptyTitle>
            <EmptyDescription>
              Crea un proyecto y guarda contexto para empezar a explorar memorias desde aquí.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <p className="text-sm text-muted-foreground">
              Los proyectos de onboarding se ocultan automáticamente.
            </p>
          </EmptyContent>
        </Empty>
      ) : (
        <section
          aria-label="Proyectos con memorias"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {projectSummaries.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              memoryCount={project.memoryCount}
              name={project.name}
            />
          ))}
        </section>
      )}
    </main>
  );
}
