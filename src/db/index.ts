import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const sqlite = new Database("sqlite.db");

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

function setupMemoriesSearch(): void {
  const memoriesTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'memories' LIMIT 1")
    .get();

  if (!memoriesTable) {
    return;
  }

  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
    USING fts5(title, content, content='memories', content_rowid='id');

    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, title, content)
      VALUES (new.id, new.title, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, title, content)
      VALUES ('delete', old.id, old.title, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, title, content)
      VALUES ('delete', old.id, old.title, old.content);
      INSERT INTO memories_fts(rowid, title, content)
      VALUES (new.id, new.title, new.content);
    END;

    INSERT INTO memories_fts(memories_fts) VALUES ('rebuild');
  `);
}

setupMemoriesSearch();

export const db = drizzle(sqlite, { schema });
