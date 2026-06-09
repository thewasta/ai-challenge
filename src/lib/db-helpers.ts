import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chats, projects } from "@/db/schema";

export interface ChatRow {
  id: number;
  projectId: number;
  title: string;
  createdAt: Date;
}

export interface ProjectWithChats {
  id: number;
  name: string;
  description: string;
  chats: ChatRow[];
}

/**
 * Obtiene todos los proyectos con sus chats anidados,
 * ordenados del más reciente al más antiguo.
 */
export async function getProjectsWithChats(): Promise<ProjectWithChats[]> {
  const projectRows = await db.select().from(projects).orderBy(desc(projects.createdAt));

  const result: ProjectWithChats[] = [];

  for (const project of projectRows) {
    const chatRows = await db
      .select()
      .from(chats)
      .where(eq(chats.projectId, project.id))
      .orderBy(chats.createdAt);

    const projectChats: ChatRow[] = [];
    for (const c of chatRows) {
      projectChats.push({
        id: c.id,
        projectId: c.projectId,
        title: c.title,
        createdAt: c.createdAt,
      });
    }

    result.push({
      id: project.id,
      name: project.name,
      description: project.description,
      chats: projectChats,
    });
  }

  return result;
}

/**
 * Obtiene un proyecto por ID.
 */
export async function getProject(id: number) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
}

/**
 * Obtiene el proyecto más reciente con su primer chat.
 * Útil para redireccionar al usuario al último chat activo.
 */
export async function getLatestProjectWithChat() {
  const project = await db.query.projects.findFirst({
    orderBy: desc(projects.createdAt),
  });

  if (!project) return null;

  const chat = await db.query.chats.findFirst({
    where: eq(chats.projectId, project.id),
    orderBy: chats.createdAt,
  });

  return { project, chat };
}
