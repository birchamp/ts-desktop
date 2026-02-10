import { openDatabase, DatabaseHandle, SqlParams } from '../utils/database';
import { runMigrations } from '../utils/migrations';

export interface ProjectRecord {
  id: string;
  name: string;
  type: string;
  language: string;
  progress: number;
  lastModified: number;
}

export interface RecentProjectRecord {
  id: string;
  name: string;
  language: string;
  lastOpened: number;
}

export interface ProjectAssetRecord {
  projectId: string;
  sourceUsfmPath: string | null;
  parsedJsonPath: string | null;
  updatedAt: number;
}

export interface ProjectCreateInput {
  id?: string;
  name: string;
  type?: string;
  language: string;
  progress?: number;
  lastModified?: number;
  lastOpened?: number;
}

const DB_PATH = 'library/index.sqlite';

let migrationsApplied = false;

async function withDatabase<T>(
  fn: (db: DatabaseHandle) => Promise<T> | T,
  { save = false }: { save?: boolean } = {}
): Promise<T> {
  const db = await openDatabase(DB_PATH);
  if (!migrationsApplied) {
    const migrated = runMigrations(db);
    if (migrated) {
      await db.save();
    }
    migrationsApplied = true;
  }
  const result = await fn(db);
  if (save) {
    await db.save();
  }
  return result;
}

function normalizeParams(params: SqlParams | undefined): SqlParams | undefined {
  if (!params) return params;
  if (Array.isArray(params)) {
    return params.map(value => (value instanceof Date ? value.getTime() : value)) as SqlParams;
  }
  const entries = Object.entries(params).map(([key, value]) => [
    key,
    value instanceof Date ? value.getTime() : value,
  ]);
  return Object.fromEntries(entries);
}

export class ProjectRepository {
  async createProject(
    input: ProjectCreateInput,
    options: { recordRecent?: boolean } = {}
  ): Promise<ProjectRecord> {
    const id = input.id ?? Date.now().toString();
    const lastModified = input.lastModified ?? Date.now();
    const lastOpened = input.lastOpened ?? lastModified;
    const progress = input.progress ?? 0;
    const type = input.type ?? 'translation';

    await withDatabase(
      db => {
        db.transaction(tx => {
          tx.run(
            `INSERT OR REPLACE INTO app_projects (id, name, type, language, progress, lastModified)
           VALUES (?, ?, ?, ?, ?, ?)`,
            normalizeParams([id, input.name, type, input.language, progress, lastModified])
          );
          if (options.recordRecent !== false) {
            tx.run(
              `INSERT OR REPLACE INTO app_recent_projects (id, name, language, lastOpened)
             VALUES (?, ?, ?, ?)`,
              normalizeParams([id, input.name, input.language, lastOpened])
            );
          }
        });
      },
      { save: true }
    );

    return {
      id,
      name: input.name,
      type,
      language: input.language,
      progress,
      lastModified,
    };
  }

  async updateProject(
    id: string,
    updates: Partial<Omit<ProjectRecord, 'id'>>
  ): Promise<ProjectRecord | null> {
    const existing = await this.getProjectById(id);
    if (!existing) return null;

    const next: ProjectRecord = {
      ...existing,
      ...updates,
      lastModified: updates.lastModified ?? Date.now(),
    };

    await withDatabase(
      db => {
        db.transaction(tx => {
          tx.run(
            `INSERT OR REPLACE INTO app_projects (id, name, type, language, progress, lastModified)
           VALUES (?, ?, ?, ?, ?, ?)`,
            normalizeParams([
              next.id,
              next.name,
              next.type,
              next.language,
              next.progress,
              next.lastModified,
            ])
          );
        });
      },
      { save: true }
    );

    return next;
  }

  async deleteProject(id: string): Promise<void> {
    await withDatabase(
      db => {
        db.transaction(tx => {
          tx.run(`DELETE FROM app_projects WHERE id = ?`, [id]);
          tx.run(`DELETE FROM app_recent_projects WHERE id = ?`, [id]);
          tx.run(`DELETE FROM app_project_assets WHERE projectId = ?`, [id]);
        });
      },
      { save: true }
    );
  }

  async listProjects(): Promise<ProjectRecord[]> {
    return withDatabase(db =>
      db.all<ProjectRecord>(
        `SELECT id, name, type, language, progress, lastModified
         FROM app_projects
         ORDER BY lastModified DESC`
      )
    );
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    return withDatabase(db =>
      db.get<ProjectRecord>(
        `SELECT id, name, type, language, progress, lastModified
         FROM app_projects
         WHERE id = ?`,
        [id]
      )
    );
  }

  async recordRecent(entry: RecentProjectRecord): Promise<void> {
    await withDatabase(
      db => {
        db.transaction(tx => {
          tx.run(
            `INSERT OR REPLACE INTO app_recent_projects (id, name, language, lastOpened)
           VALUES (?, ?, ?, ?)`,
            normalizeParams([entry.id, entry.name, entry.language, entry.lastOpened])
          );
        });
      },
      { save: true }
    );
  }

  async listRecentProjects(limit = 5): Promise<RecentProjectRecord[]> {
    return withDatabase(db =>
      db.all<RecentProjectRecord>(
        `SELECT id, name, language, lastOpened
         FROM app_recent_projects
         ORDER BY lastOpened DESC
         LIMIT ?`,
        [limit]
      )
    );
  }

  async upsertProjectAssets(
    projectId: string,
    assets: {
      sourceUsfmPath?: string | null;
      parsedJsonPath?: string | null;
      updatedAt?: number;
    }
  ): Promise<ProjectAssetRecord> {
    const existing = await this.getProjectAssets(projectId);
    const next: ProjectAssetRecord = {
      projectId,
      sourceUsfmPath: assets.sourceUsfmPath ?? existing?.sourceUsfmPath ?? null,
      parsedJsonPath: assets.parsedJsonPath ?? existing?.parsedJsonPath ?? null,
      updatedAt: assets.updatedAt ?? Date.now(),
    };

    await withDatabase(
      db => {
        db.transaction(tx => {
          tx.run(
            `INSERT OR REPLACE INTO app_project_assets (projectId, sourceUsfmPath, parsedJsonPath, updatedAt)
           VALUES (?, ?, ?, ?)`,
            normalizeParams([
              next.projectId,
              next.sourceUsfmPath,
              next.parsedJsonPath,
              next.updatedAt,
            ])
          );
        });
      },
      { save: true }
    );

    return next;
  }

  async getProjectAssets(projectId: string): Promise<ProjectAssetRecord | null> {
    return withDatabase(db =>
      db.get<ProjectAssetRecord>(
        `SELECT projectId, sourceUsfmPath, parsedJsonPath, updatedAt
         FROM app_project_assets
         WHERE projectId = ?`,
        [projectId]
      )
    );
  }
}

export const projectRepository = new ProjectRepository();

declare global {
  interface Window {
    projectRepository?: ProjectRepository;
  }
}

if (typeof window !== 'undefined') {
  (window as any).projectRepository = projectRepository;
}
