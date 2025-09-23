import schema from '@/config/schema.sql';
import { openDatabase } from './database';

export interface RecentProject {
  id: string;
  name: string;
  language: string;
  lastOpened: number;
}

const DB_PATH = 'index.sqlite';

async function ensureTable() {
  const db = await openDatabase(DB_PATH, schema);
  db.exec(`CREATE TABLE IF NOT EXISTS app_recent_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    lastOpened INTEGER NOT NULL
  );`);
  await db.save();
}

export async function addRecent(project: RecentProject) {
  await ensureTable();
  const db = await openDatabase(DB_PATH);
  db.exec(`INSERT OR REPLACE INTO app_recent_projects (id, name, language, lastOpened)
           VALUES ('${project.id.replace(/'/g, "''")}', '${project.name.replace(/'/g, "''")}', '${project.language.replace(/'/g, "''")}', ${project.lastOpened})`);
  await db.save();
}

export async function listRecents(limit = 5): Promise<RecentProject[]> {
  await ensureTable();
  const db = await openDatabase(DB_PATH);
  const rows = db.query<RecentProject>(`SELECT id, name, language, lastOpened
                                        FROM app_recent_projects
                                        ORDER BY lastOpened DESC
                                        LIMIT ${limit}`);
  return rows;
}

