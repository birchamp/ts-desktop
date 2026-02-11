import { projectRepository } from '../projectRepository';
import { loadDraft } from '../translationDrafts';
import { readAbsoluteText, readJson, readText, writeJson, writeText } from '../../utils/files';
import type { ProjectContextData } from '../projectRepository';

export interface ProjectBackupPayloadV1 {
  format: 'ts-desktop-backup-v1';
  createdAt: number;
  app: {
    name: string;
    version: string;
  };
  project: {
    id: string;
    name: string;
    type: string;
    language: string;
    progress: number;
    lastModified: number;
  };
  context: unknown | null;
  assets: {
    sourceUsfmText: string | null;
    parsedJson: unknown | null;
  };
  draft: unknown | null;
}

function isBackupPayloadV1(value: unknown): value is ProjectBackupPayloadV1 {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.format === 'ts-desktop-backup-v1' && typeof record.project === 'object';
}

function parseContextCandidate(value: unknown): ProjectContextData | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.formatVersion !== 'string') return null;
  if (!candidate.book || typeof candidate.book !== 'object') return null;
  return value as ProjectContextData;
}

export async function buildProjectBackup(projectId: string): Promise<ProjectBackupPayloadV1> {
  const project = await projectRepository.getProjectById(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }

  const [context, assets, draft] = await Promise.all([
    projectRepository.getProjectContext(projectId),
    projectRepository.getProjectAssets(projectId),
    loadDraft(projectId),
  ]);

  const [sourceUsfmText, parsedJson] = await Promise.all([
    assets?.sourceUsfmPath ? readText(assets.sourceUsfmPath) : Promise.resolve(null),
    assets?.parsedJsonPath ? readJson(assets.parsedJsonPath) : Promise.resolve(null),
  ]);

  return {
    format: 'ts-desktop-backup-v1',
    createdAt: Date.now(),
    app: {
      name: 'translationStudio',
      version: '12.1.1',
    },
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      language: project.language,
      progress: project.progress,
      lastModified: project.lastModified,
    },
    context: context?.context ?? null,
    assets: {
      sourceUsfmText,
      parsedJson,
    },
    draft: draft && typeof draft === 'object' ? draft : null,
  };
}

export async function importProjectBackup(absFilePath: string): Promise<{
  projectId: string;
  projectName: string;
}> {
  const text = await readAbsoluteText(absFilePath);
  if (!text) {
    throw new Error('Could not read backup file.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }
  if (!isBackupPayloadV1(parsed)) {
    throw new Error('Unsupported backup format.');
  }

  const payload = parsed as ProjectBackupPayloadV1;
  const newProjectId = Date.now().toString();
  const parsedContext = parseContextCandidate(payload.context);

  await projectRepository.createProject({
    id: newProjectId,
    name: payload.project.name || 'Imported Project',
    type: payload.project.type || 'translation',
    language: payload.project.language || 'en',
    progress: Number.isFinite(payload.project.progress) ? payload.project.progress : 0,
    lastModified: Date.now(),
    context: parsedContext,
  });

  const hasUsfm = typeof payload.assets?.sourceUsfmText === 'string';
  const hasParsedJson =
    payload.assets && Object.prototype.hasOwnProperty.call(payload.assets, 'parsedJson');

  if (hasUsfm) {
    await writeText(`projects/${newProjectId}/source.usfm`, payload.assets.sourceUsfmText || '');
  }
  if (hasParsedJson) {
    await writeJson(`projects/${newProjectId}/parsed.json`, payload.assets.parsedJson || {});
  }

  if (hasUsfm || hasParsedJson) {
    await projectRepository.upsertProjectAssets(newProjectId, {
      sourceUsfmPath: hasUsfm ? `projects/${newProjectId}/source.usfm` : null,
      parsedJsonPath: hasParsedJson ? `projects/${newProjectId}/parsed.json` : null,
      updatedAt: Date.now(),
    });
  }

  if (payload.draft && typeof payload.draft === 'object') {
    const nextDraft = {
      ...(payload.draft as Record<string, unknown>),
      projectId: newProjectId,
      updatedAt: Date.now(),
    };
    await writeJson(`projects/${newProjectId}/translation-draft.json`, nextDraft);
  }

  return {
    projectId: newProjectId,
    projectName: payload.project.name || 'Imported Project',
  };
}
