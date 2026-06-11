import type { UIMessage } from "ai";
import { desc, eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import {
  chats,
  type MemoryScope,
  type MemorySearchResult,
  type MemoryTopic,
  memories,
  messages,
  projects,
} from "@/db/schema";

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
  websiteUrl: string;
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
      websiteUrl: project.websiteUrl,
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

export interface InsertMemoryInput {
  projectId: number;
  title: string;
  topic: MemoryTopic;
  scope: MemoryScope;
  content: string;
}

interface RawMemorySearchRow {
  id: number;
  title: string;
  topic: MemoryTopic;
  scope: MemoryScope;
  snippet: string;
  createdAt: number;
  rank: number;
}

const DEFAULT_MEMORY_SEARCH_LIMIT = 10;

function sanitizeFTSQuery(query: string): string | null {
  const tokens = Array.from(query.matchAll(/"([^"]+)"|(\S+)/g), (match) =>
    (match[1] ?? match[2] ?? "")
      .replace(/[(){}[\]^:*+-]/g, " ")
      .replace(/"/g, '""')
      .replace(/\s+/g, " ")
      .trim(),
  ).filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.map((token) => `"${token}"`).join(" ");
}

export async function insertMemory({
  projectId,
  title,
  topic,
  scope,
  content,
}: InsertMemoryInput): Promise<number> {
  const [insertedMemory] = await db
    .insert(memories)
    .values({
      projectId,
      title,
      topic,
      scope,
      content,
      createdAt: new Date(),
    })
    .returning({ id: memories.id });

  return insertedMemory.id;
}

export function searchMemoriesFTS(
  projectId: number,
  query: string,
  limit = DEFAULT_MEMORY_SEARCH_LIMIT,
): MemorySearchResult[] {
  const sanitizedQuery = sanitizeFTSQuery(query);

  if (!sanitizedQuery) {
    return [];
  }

  const statement = sqlite.prepare(`
    SELECT
      m.id,
      m.title,
      m.topic,
      m.scope,
      substr(replace(replace(m.content, char(10), ' '), char(13), ' '), 1, 200) AS snippet,
      m.created_at AS createdAt,
      bm25(memories_fts) AS rank
    FROM memories_fts
    INNER JOIN memories m ON memories_fts.rowid = m.id
    WHERE memories_fts MATCH ?
      AND m.project_id = ?
    ORDER BY rank
    LIMIT ?
  `);

  const rows = statement.all(sanitizedQuery, projectId, limit) as RawMemorySearchRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    topic: row.topic,
    scope: row.scope,
    snippet: row.snippet,
    createdAt: new Date(row.createdAt),
    rank: row.rank,
  }));
}
