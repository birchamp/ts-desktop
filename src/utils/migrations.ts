import { DatabaseHandle } from './database';

interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseHandle) => void;
}

const META_TABLE_SQL = `CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create-project-and-recent-tables',
    up: db => {
      db.exec(`CREATE TABLE IF NOT EXISTS app_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        language TEXT NOT NULL,
        progress INTEGER NOT NULL,
        lastModified INTEGER NOT NULL
      );`);

      db.exec(`CREATE TABLE IF NOT EXISTS app_recent_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        language TEXT NOT NULL,
        lastOpened INTEGER NOT NULL
      );`);
    },
  },
  {
    version: 2,
    name: 'create-project-assets-table',
    up: db => {
      db.exec(`CREATE TABLE IF NOT EXISTS app_project_assets (
        projectId TEXT PRIMARY KEY,
        sourceUsfmPath TEXT,
        parsedJsonPath TEXT,
        updatedAt INTEGER NOT NULL
      );`);
    },
  },
  {
    version: 3,
    name: 'create-project-context-table',
    up: db => {
      db.exec(`CREATE TABLE IF NOT EXISTS app_project_context (
        projectId TEXT PRIMARY KEY,
        contextJson TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );`);
    },
  },
];

function getCurrentVersion(db: DatabaseHandle): number {
  const row = db.get<{ value: string }>(`SELECT value FROM app_meta WHERE key = 'schemaVersion'`);
  if (!row) return 0;
  const parsed = parseInt(row.value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setCurrentVersion(db: DatabaseHandle, version: number) {
  db.run(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('schemaVersion', ?)`, [
    String(version),
  ]);
}

export function runMigrations(db: DatabaseHandle): boolean {
  db.exec(META_TABLE_SQL);
  const sorted = [...MIGRATIONS].sort((a, b) => a.version - b.version);
  let migrated = false;
  let currentVersion = getCurrentVersion(db);

  for (const migration of sorted) {
    if (migration.version <= currentVersion) continue;
    db.transaction(tx => {
      migration.up(tx);
      setCurrentVersion(tx, migration.version);
    });
    currentVersion = migration.version;
    migrated = true;
  }

  return migrated;
}
