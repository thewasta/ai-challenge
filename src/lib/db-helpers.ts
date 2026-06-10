import type { UIMessage } from "ai";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chats, messages, projects } from "@/db/schema";

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

/**
 * Obtiene un chat con sus mensajes persistidos.
 * Retorna null si el chat no existe.
 */
export async function getChat(chatId: number) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!chat) return null;

  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);

  const parsedMessages: UIMessage[] = messageRows.map((row) => {
    try {
      const data =
        typeof row.messageData === "string" ? JSON.parse(row.messageData) : row.messageData;
      return data as UIMessage;
    } catch (err) {
      console.error(`Failed to parse messageData for message ${row.id}:`, err);
      // Return a minimal valid UIMessage as fallback
      return {
        id: row.id,
        role: "assistant" as const,
        content: "",
        parts: [{ type: "text" as const, text: "[Error al cargar mensaje]" }],
      };
    }
  });

  return {
    ...chat,
    messages: parsedMessages,
  };
}

/**
 * Obtiene todos los mensajes de un chat, ordenados por fecha de creación (ascendente).
 */
export async function getMessagesByChat(chatId: number): Promise<UIMessage[]> {
  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);

  return messageRows.map((row) => {
    try {
      const data =
        typeof row.messageData === "string" ? JSON.parse(row.messageData) : row.messageData;
      return data as UIMessage;
    } catch (err) {
      console.error(`Failed to parse messageData for message ${row.id}:`, err);
      // Skip corrupted rows
      return {
        id: row.id,
        role: "assistant" as const,
        content: "",
        parts: [{ type: "text" as const, text: "[Error al cargar mensaje]" }],
      };
    }
  });
}

/**
 * Guarda un mensaje en la base de datos con UPSERT (deduplicación por message.id).
 */
export async function saveMessage(chatId: number, message: UIMessage): Promise<boolean> {
  try {
    const serializedMessage = JSON.stringify(message);

    await db
      .insert(messages)
      .values({
        id: message.id,
        chatId,
        messageData: serializedMessage,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          messageData: serializedMessage,
        },
      });

    return true;
  } catch (error) {
    console.error("Error saving message:", error);
    return false;
  }
}
