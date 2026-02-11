const path = require('path');

const DATABASE_PATH = path.join(process.cwd(), 'src/utils/database.ts');
const MIGRATIONS_PATH = path.join(process.cwd(), 'src/utils/migrations.ts');
const FILES_PATH = path.join(process.cwd(), 'src/utils/files.ts');
const PROJECT_REPOSITORY_PATH = path.join(process.cwd(), 'src/services/projectRepository.ts');
const IMPORT_USFM_PATH = path.join(process.cwd(), 'src/utils/import/usfm.ts');
const BACKUP_PATH = path.join(process.cwd(), 'src/services/backup/projectBackup.ts');
const TRANSLATION_DRAFTS_PATH = path.join(process.cwd(), 'src/services/translationDrafts.ts');
const REVIEW_DRAFTS_PATH = path.join(process.cwd(), 'src/services/reviewDrafts.ts');

function createDatabaseHandle(state) {
  const handle = {
    exec: () => {},
    save: async () => true,
    transaction: fn => fn(handle),
    run: (sql, params = []) => {
      if (sql.includes('INSERT OR REPLACE INTO app_projects')) {
        const [id, name, type, language, progress, lastModified] = params;
        state.projects.set(String(id), {
          id: String(id),
          name: String(name),
          type: String(type),
          language: String(language),
          progress: Number(progress),
          lastModified: Number(lastModified),
        });
        return;
      }
      if (sql.includes('INSERT OR REPLACE INTO app_recent_projects')) {
        const [id, name, language, lastOpened] = params;
        state.recent.set(String(id), {
          id: String(id),
          name: String(name),
          language: String(language),
          lastOpened: Number(lastOpened),
        });
        return;
      }
      if (sql.includes('INSERT OR REPLACE INTO app_project_assets')) {
        const [projectId, sourceUsfmPath, parsedJsonPath, updatedAt] = params;
        state.assets.set(String(projectId), {
          projectId: String(projectId),
          sourceUsfmPath: sourceUsfmPath == null ? null : String(sourceUsfmPath),
          parsedJsonPath: parsedJsonPath == null ? null : String(parsedJsonPath),
          updatedAt: Number(updatedAt),
        });
        return;
      }
      if (sql.includes('INSERT OR REPLACE INTO app_project_context')) {
        const [projectId, contextJson, updatedAt] = params;
        state.context.set(String(projectId), {
          projectId: String(projectId),
          contextJson: String(contextJson),
          updatedAt: Number(updatedAt),
        });
        return;
      }
      if (sql.includes('DELETE FROM app_projects WHERE id = ?')) {
        state.projects.delete(String(params[0]));
        return;
      }
      if (sql.includes('DELETE FROM app_recent_projects WHERE id = ?')) {
        state.recent.delete(String(params[0]));
        return;
      }
      if (sql.includes('DELETE FROM app_project_assets WHERE projectId = ?')) {
        state.assets.delete(String(params[0]));
        return;
      }
      if (sql.includes('DELETE FROM app_project_context WHERE projectId = ?')) {
        state.context.delete(String(params[0]));
      }
    },
    get: (sql, params = []) => {
      if (sql.includes('FROM app_projects') && sql.includes('WHERE id = ?')) {
        return state.projects.get(String(params[0])) || null;
      }
      if (sql.includes('FROM app_project_assets') && sql.includes('WHERE projectId = ?')) {
        return state.assets.get(String(params[0])) || null;
      }
      if (sql.includes('FROM app_project_context') && sql.includes('WHERE projectId = ?')) {
        return state.context.get(String(params[0])) || null;
      }
      return null;
    },
    all: (sql, params = []) => {
      if (sql.includes('FROM app_projects')) {
        return [...state.projects.values()].sort((a, b) => b.lastModified - a.lastModified);
      }
      if (sql.includes('FROM app_recent_projects')) {
        const limit = Number(params[0] || 5);
        return [...state.recent.values()]
          .sort((a, b) => b.lastOpened - a.lastOpened)
          .slice(0, limit);
      }
      return [];
    },
  };
  return handle;
}

function createFilesMock(initialAbsolute = {}) {
  const relative = new Map();
  const absolute = new Map(Object.entries(initialAbsolute));

  const writeRaw = (relPath, value) => {
    relative.set(relPath, Buffer.isBuffer(value) ? value : Buffer.from(value));
    return true;
  };

  return {
    ensureDir: jest.fn(async () => true),
    readJson: jest.fn(async relPath => {
      const raw = relative.get(relPath);
      if (!raw) return null;
      try {
        return JSON.parse(Buffer.from(raw).toString('utf8'));
      } catch {
        return null;
      }
    }),
    writeJson: jest.fn(async (relPath, data) =>
      writeRaw(relPath, Buffer.from(JSON.stringify(data), 'utf8'))
    ),
    readFile: jest.fn(async relPath => {
      const raw = relative.get(relPath);
      if (!raw) return null;
      return new Uint8Array(Buffer.from(raw));
    }),
    writeFile: jest.fn(async (relPath, data) => writeRaw(relPath, Buffer.from(data))),
    readText: jest.fn(async relPath => {
      const raw = relative.get(relPath);
      if (!raw) return null;
      return Buffer.from(raw).toString('utf8');
    }),
    writeText: jest.fn(async (relPath, text) => writeRaw(relPath, Buffer.from(text, 'utf8'))),
    readAbsoluteText: jest.fn(async absPath => absolute.get(absPath) || null),
    copyAbsoluteToUserData: jest.fn(async (relPath, absPath) => {
      const raw = absolute.get(absPath);
      if (!raw) return false;
      return writeRaw(relPath, Buffer.from(raw, 'utf8'));
    }),
    __setAbsoluteText: (absPath, text) => {
      absolute.set(absPath, text);
    },
  };
}

function setup(initialAbsolute = {}) {
  const state = {
    projects: new Map(),
    recent: new Map(),
    assets: new Map(),
    context: new Map(),
  };
  const filesMock = createFilesMock(initialAbsolute);

  jest.resetModules();
  jest.doMock(DATABASE_PATH, () => ({
    openDatabase: jest.fn(async () => createDatabaseHandle(state)),
  }));
  jest.doMock(MIGRATIONS_PATH, () => ({
    runMigrations: jest.fn(() => false),
  }));
  jest.doMock(FILES_PATH, () => filesMock);

  const { projectRepository } = require(PROJECT_REPOSITORY_PATH);
  const { importUsfm } = require(IMPORT_USFM_PATH);
  const { buildProjectBackup, importProjectBackup } = require(BACKUP_PATH);
  const translationDrafts = require(TRANSLATION_DRAFTS_PATH);
  const reviewDrafts = require(REVIEW_DRAFTS_PATH);

  return {
    projectRepository,
    importUsfm,
    buildProjectBackup,
    importProjectBackup,
    translationDrafts,
    reviewDrafts,
    filesMock,
  };
}

describe('macOS parity evidence integration', () => {
  let dateNowSpy;
  let now;

  beforeEach(() => {
    now = 1710000000000;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      now += 1;
      return now;
    });
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('project lifecycle repository flow supports create/open/recent/delete', async () => {
    const { projectRepository } = setup();

    await projectRepository.createProject({
      id: 'p-01',
      name: 'Genesis Draft',
      language: 'en',
      progress: 10,
      lastModified: 1710000000100,
    });
    await projectRepository.createProject({
      id: 'p-02',
      name: 'Exodus Draft',
      language: 'fr',
      progress: 20,
      lastModified: 1710000000200,
    });

    const opened = await projectRepository.getProjectById('p-01');
    expect(opened).not.toBeNull();
    expect(opened.name).toBe('Genesis Draft');

    await projectRepository.recordRecent({
      id: 'p-01',
      name: 'Genesis Draft',
      language: 'en',
      lastOpened: 1710000000300,
    });
    const recents = await projectRepository.listRecentProjects(5);
    expect(recents[0].id).toBe('p-01');

    await projectRepository.deleteProject('p-01');
    expect(await projectRepository.getProjectById('p-01')).toBeNull();
    const remainingProjects = await projectRepository.listProjects();
    expect(remainingProjects).toHaveLength(1);
    expect(remainingProjects[0].id).toBe('p-02');
  });

  test('usfm import plus backup roundtrip preserves draft and review state', async () => {
    const usfmPath = '/fixtures/01-GEN.usfm';
    const backupPath = '/fixtures/genesis-backup.tstudio';
    const usfm = ['\\id GEN', '\\h Genesis', '\\c 1', '\\v 1 In the beginning.', '\\v 2 The earth.'].join(
      '\n'
    );
    const { importUsfm, buildProjectBackup, importProjectBackup, projectRepository } = setup({
      [usfmPath]: usfm,
    });
    const { loadDraft, saveDraft, upsertVerseText } = require(TRANSLATION_DRAFTS_PATH);
    const { loadReviewDraft, saveReviewDraft, upsertReviewVerse, getReviewVerse } =
      require(REVIEW_DRAFTS_PATH);

    const imported = await importUsfm(usfmPath, 'en');
    expect(imported).not.toBeNull();
    expect(imported.name.toLowerCase()).toContain('genesis');
    expect(await projectRepository.getProjectById(imported.projectId)).not.toBeNull();

    const draft = await loadDraft(imported.projectId);
    const nextDraft = upsertVerseText(draft, 'gen', 1, 1, 'At first, God created.');
    await saveDraft(nextDraft);

    const reviewDraft = await loadReviewDraft(imported.projectId);
    const nextReview = upsertReviewVerse(reviewDraft, 'gen', 1, 1, {
      status: 'approved',
      note: 'Reviewed and approved.',
    });
    await saveReviewDraft(nextReview);

    const backupPayload = await buildProjectBackup(imported.projectId);
    expect(backupPayload.assets.sourceUsfmText).toContain('\\v 1 In the beginning.');
    expect(backupPayload.draft).toBeTruthy();
    expect(backupPayload.review).toBeTruthy();

    const { __setAbsoluteText } = require(FILES_PATH);
    __setAbsoluteText(backupPath, JSON.stringify(backupPayload, null, 2));

    const restored = await importProjectBackup(backupPath);
    expect(restored.projectId).not.toBe(imported.projectId);

    const restoredDraft = await loadDraft(restored.projectId);
    const restoredVerse = restoredDraft.books.gen.verses.find(item => item.chapter === 1 && item.verse === 1);
    expect(restoredVerse.text).toBe('At first, God created.');

    const restoredReviewDraft = await loadReviewDraft(restored.projectId);
    const restoredReview = getReviewVerse(restoredReviewDraft, 'gen', 1, 1);
    expect(restoredReview.status).toBe('approved');
    expect(restoredReview.note).toBe('Reviewed and approved.');
  });

  test('invalid usfm path returns null and does not create project records', async () => {
    const { importUsfm, projectRepository } = setup();
    const imported = await importUsfm('/fixtures/missing.usfm', 'en');
    expect(imported).toBeNull();
    const projects = await projectRepository.listProjects();
    expect(projects).toHaveLength(0);
  });
});
