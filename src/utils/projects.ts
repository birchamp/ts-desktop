import { openDatabase } from './database';

export interface ProjectRecord {
  id: string;
  name: string;
  type: string;
  language: string;
  progress: number;
  lastModified: number; // epoch ms
}

const DB_PATH = 'index.sqlite';

async function ensureProjectsTable() {
  const db = await openDatabase(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS app_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    language TEXT NOT NULL,
    progress INTEGER NOT NULL,
    lastModified INTEGER NOT NULL
  );`);
  await db.save();
}

function esc(v: string) {
  return v.replace(/'/g, "''");
}

export async function addProjectToDb(p: ProjectRecord) {
  await ensureProjectsTable();
  const db = await openDatabase(DB_PATH);
  db.exec(`INSERT OR REPLACE INTO app_projects (id, name, type, language, progress, lastModified)
           VALUES ('${esc(p.id)}', '${esc(p.name)}', '${esc(p.type)}', '${esc(p.language)}', ${Math.max(0, p.progress|0)}, ${p.lastModified|0})`);
  await db.save();
}

export async function listProjectsFromDb(): Promise<ProjectRecord[]> {
  await ensureProjectsTable();
  const db = await openDatabase(DB_PATH);
  const rows = db.query<ProjectRecord>(`SELECT id, name, type, language, progress, lastModified FROM app_projects ORDER BY lastModified DESC`);
  return rows;
}

export async function deleteProjectFromDb(id: string) {
  await ensureProjectsTable();
  const db = await openDatabase(DB_PATH);
  db.exec(`DELETE FROM app_projects WHERE id='${esc(id)}'`);
  await db.save();
}

export async function updateProjectInDb(p: ProjectRecord) {
  return addProjectToDb(p);
}

