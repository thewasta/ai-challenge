import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const memoryTopics = [
  "seo-strategy",
  "technical-audit",
  "content-plan",
  "project-decision",
  "user-preference",
] as const;

export const memoryScopes = ["project", "personal"] as const;

export type MemoryTopic = (typeof memoryTopics)[number];
export type MemoryScope = (typeof memoryScopes)[number];

/**
 * Projects table: stores brand/project profiles.
 * brand_context is stored as JSON text with buyer persona, product description, and competitors.
 */
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  buyerPersona: text("buyer_persona").notNull().default(""),
  competitors: text("competitors").notNull().default(""),
  websiteUrl: text("website_url").notNull().default(""),
  brandContext: text("brand_context").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

/**
 * Chats table: conversation sessions scoped to a project.
 */
export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Nuevo chat"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

/**
 * Messages table: stores user, assistant, and tool interaction messages.
 * messageData contains the complete UIMessage object serialized as JSON.
 */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  messageData: text("message_data").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const memories = sqliteTable(
  "memories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    topic: text("topic", { enum: memoryTopics }).notNull(),
    scope: text("scope", { enum: memoryScopes }).notNull().default("project"),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    topicCheck: check(
      "memories_topic_check",
      sql`${table.topic} in ('seo-strategy', 'technical-audit', 'content-plan', 'project-decision', 'user-preference')`,
    ),
    scopeCheck: check("memories_scope_check", sql`${table.scope} in ('project', 'personal')`),
  }),
);

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

export interface MemorySearchResult {
  id: number;
  title: string;
  topic: MemoryTopic;
  scope: MemoryScope;
  snippet: string;
  createdAt: Date;
  rank: number;
}
