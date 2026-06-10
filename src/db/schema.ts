import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
