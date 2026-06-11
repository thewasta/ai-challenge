import type { UIMessage } from "ai";
import { count, desc, eq, max, notLike } from "drizzle-orm";
import { db, sqlite } from "@/db";
import {
  chats,
  type Memory,
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

export interface ProjectMemorySummary {
  id: number;
  name: string;
  memoryCount: number;
  latestMemoryCreatedAt: Date;
}

interface RawMemorySearchRow {
  id: number;
  title: string;
  topic: MemoryTopic;
  scope: MemoryScope;
  content: string;
  createdAt: number;
  rank: number;
}

const DEFAULT_MEMORY_SEARCH_LIMIT = 10;

const FTS_STOP_WORDS = new Set([
  "a",
  "al",
  "ante",
  "con",
  "contra",
  "de",
  "del",
  "desde",
  "el",
  "en",
  "entre",
  "hacia",
  "hasta",
  "la",
  "las",
  "lo",
  "los",
  "para",
  "por",
  "que",
  "se",
  "sin",
  "sobre",
  "su",
  "sus",
  "un",
  "una",
  "unos",
  "unas",
  "y",
  "o",
  "u",
  "es",
  "son",
  "nos",
  "estamos",
  "vamos",
  "pensar",
  "tipo",
  "como",
  "este",
  "esta",
  "esto",
]);

function sanitizeFTSQuery(query: string): string | null {
  const tokens = Array.from(query.matchAll(/"([^"]+)"|(\S+)/g), (match) =>
    (match[1] ?? match[2] ?? "")
      .replace(/[(){}[\]^:*+-]/g, " ")
      .replace(/"/g, '""')
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase(),
  ).filter((token) => token.length >= 3 && !FTS_STOP_WORDS.has(token));

  const unique = [...new Set(tokens)];
  if (unique.length === 0) return null;

  return unique.map((token) => `"${token}"`).join(" OR ");
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

export async function getProjectsWithMemoryCount(): Promise<ProjectMemorySummary[]> {
  const latestMemoryCreatedAt = max(memories.createdAt);

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      memoryCount: count(memories.id),
      latestMemoryCreatedAt,
    })
    .from(projects)
    .innerJoin(memories, eq(memories.projectId, projects.id))
    .where(notLike(projects.name, "Proyecto #%"))
    .groupBy(projects.id, projects.name)
    .orderBy(desc(latestMemoryCreatedAt));

  return rows.flatMap((row) => {
    if (!row.latestMemoryCreatedAt) {
      return [];
    }

    return [
      {
        id: row.id,
        name: row.name,
        memoryCount: row.memoryCount,
        latestMemoryCreatedAt: row.latestMemoryCreatedAt,
      },
    ];
  });
}

export async function getMemoriesForProject(projectId: number): Promise<Memory[]> {
  return db
    .select()
    .from(memories)
    .where(eq(memories.projectId, projectId))
    .orderBy(desc(memories.createdAt));
}

export const getMemoriesByProject = getMemoriesForProject;

export async function deleteMemory(id: number): Promise<void> {
  await db.delete(memories).where(eq(memories.id, id));
}

export interface ProjectProfileLike {
  description: string;
  websiteUrl: string;
  buyerPersona: string;
  competitors: string;
}

export function isProjectProfileComplete(project: ProjectProfileLike | null | undefined): boolean {
  if (!project) return false;

  return (
    (project.description ?? "").trim().length > 0 &&
    (project.websiteUrl ?? "").trim().length > 0 &&
    (project.buyerPersona ?? "").trim().length > 0 &&
    (project.competitors ?? "").trim().length > 0
  );
}

export function searchMemoriesFTS(
  projectId: number,
  query: string,
  limit = DEFAULT_MEMORY_SEARCH_LIMIT,
): MemorySearchResult[] {
  const sanitizedQuery = sanitizeFTSQuery(query);

  console.log("Sanitized FTS query:", sanitizedQuery);

  if (!sanitizedQuery) {
    return [];
  }

  const statement = sqlite.prepare(`
    SELECT
      m.id,
      m.title,
      m.topic,
      m.scope,
      m.content AS content,
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

  console.log(`FTS search for "${query}" returned ${rows.length} results.`);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    topic: row.topic,
    scope: row.scope,
    content: row.content,
    createdAt: new Date(row.createdAt),
    rank: row.rank,
  }));
}
