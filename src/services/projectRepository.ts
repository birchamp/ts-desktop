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

export interface ProjectBookContext {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
}

export interface ProjectResourceContext {
  source: 'cached' | 'catalog' | 'none';
  id: string;
  name: string;
  owner?: string;
  version?: string;
  language?: string;
  repo?: string;
  ref?: string;
  containerPath?: string;
}

export interface ProjectSupportSummary {
  tnRows: number;
  twlRows: number;
  twArticles: number;
  unresolved: number;
}

export interface ProjectContextData {
  formatVersion: string;
  book: ProjectBookContext;
  resource?: ProjectResourceContext | null;
  supportSummary?: ProjectSupportSummary | null;
}

export interface ProjectContextRecord {
  projectId: string;
  context: ProjectContextData;
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
  context?: ProjectContextData | null;
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

function parseProjectContext(contextJson: string): ProjectContextData | null {
  try {
    const parsed = JSON.parse(contextJson);
    if (!parsed || typeof parsed !== 'object') return null;
    const context = parsed as ProjectContextData;
    if (!context.book || typeof context.book !== 'object') return null;
    if (!context.formatVersion || typeof context.formatVersion !== 'string') return null;
    return context;
  } catch {
    return null;
  }
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
          if (input.context) {
            tx.run(
              `INSERT OR REPLACE INTO app_project_context (projectId, contextJson, updatedAt)
             VALUES (?, ?, ?)`,
              normalizeParams([id, JSON.stringify(input.context), lastModified])
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
          tx.run(`DELETE FROM app_project_context WHERE projectId = ?`, [id]);
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

  async upsertProjectContext(
    projectId: string,
    context: ProjectContextData,
    updatedAt = Date.now()
  ): Promise<ProjectContextRecord> {
    await withDatabase(
      db => {
        db.transaction(tx => {
          tx.run(
            `INSERT OR REPLACE INTO app_project_context (projectId, contextJson, updatedAt)
           VALUES (?, ?, ?)`,
            normalizeParams([projectId, JSON.stringify(context), updatedAt])
          );
        });
      },
      { save: true }
    );

    return { projectId, context, updatedAt };
  }

  async getProjectContext(projectId: string): Promise<ProjectContextRecord | null> {
    return withDatabase(db => {
      const row = db.get<{ projectId: string; contextJson: string; updatedAt: number }>(
        `SELECT projectId, contextJson, updatedAt
         FROM app_project_context
         WHERE projectId = ?`,
        [projectId]
      );
      if (!row) return null;
      const context = parseProjectContext(row.contextJson);
      if (!context) return null;
      return {
        projectId: row.projectId,
        context,
        updatedAt: row.updatedAt,
      };
    });
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
