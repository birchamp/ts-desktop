import yaml from 'js-yaml';
import { Door43RepoContentEntry, getRepositoryContents, getRepositoryFile } from './catalog';

export type ManifestFormat =
  | 'resource-container'
  | 'tcore-resource-container'
  | 'translationcore'
  | 'translationstudio'
  | 'scripture-burrito'
  | 'unknown';

export interface DetectedManifest {
  path: string;
  raw: string;
  parsed: Record<string, unknown>;
  format: ManifestFormat;
}

export interface ManifestSummary {
  identifier?: string;
  language?: string;
  subject?: string;
  version?: string;
  relations: string[];
}

const MANIFEST_CANDIDATES = [
  'manifest.yaml',
  'manifest.yml',
  'manifest.json',
  'metadata.yaml',
  'metadata.yml',
  'metadata.json',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function decodeRepositoryFileContent(file: Door43RepoContentEntry): string | null {
  if (typeof file.content !== 'string') {
    return null;
  }
  if (file.encoding === 'base64') {
    try {
      return Buffer.from(file.content, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  return file.content;
}

function parseManifestRaw(raw: string, fileName: string): Record<string, unknown> | null {
  const isJson = fileName.toLowerCase().endsWith('.json');

  if (isJson) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      // Fall back to YAML parser below.
    }
  }

  try {
    const parsed = yaml.load(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function detectManifestFormat(manifest: Record<string, unknown>): ManifestFormat {
  if (isRecord(manifest.dublin_core)) {
    return 'resource-container';
  }
  if (isRecord(manifest.resource_container)) {
    return 'tcore-resource-container';
  }
  if (isRecord(manifest.meta) && manifest.meta.format === 'scripture burrito') {
    return 'scripture-burrito';
  }
  if (
    isRecord(manifest.project) &&
    isRecord(manifest.resource) &&
    isRecord(manifest.target_language) &&
    typeof manifest.tc_version === 'number'
  ) {
    return 'translationcore';
  }
  if (
    typeof manifest.package_version === 'number' &&
    typeof manifest.format === 'string' &&
    isRecord(manifest.generator)
  ) {
    return 'translationstudio';
  }
  return 'unknown';
}

function pickCandidateFileNames(entries: Door43RepoContentEntry[]): string[] {
  const names = entries
    .filter(entry => entry.type === 'file')
    .map(entry => entry.name)
    .filter(Boolean);
  const seen = new Set(names);
  const ordered: string[] = [];
  MANIFEST_CANDIDATES.forEach(candidate => {
    if (seen.has(candidate)) {
      ordered.push(candidate);
    }
  });
  if (ordered.length > 0) {
    return ordered;
  }
  return MANIFEST_CANDIDATES;
}

export async function loadRepositoryManifest(
  owner: string,
  repo: string,
  options: { ref?: string; baseUrl?: string } = {}
): Promise<DetectedManifest | null> {
  const rootEntries = await getRepositoryContents(owner, repo, options);
  const candidates = pickCandidateFileNames(rootEntries);

  let fallback: DetectedManifest | null = null;
  for (const fileName of candidates) {
    const file = await getRepositoryFile(owner, repo, fileName, options);
    if (!file) continue;
    const raw = decodeRepositoryFileContent(file);
    if (!raw) continue;
    const parsed = parseManifestRaw(raw, fileName);
    if (!parsed) continue;

    const detected: DetectedManifest = {
      path: file.path || fileName,
      raw,
      parsed,
      format: detectManifestFormat(parsed),
    };
    if (detected.format !== 'unknown') {
      return detected;
    }
    if (!fallback) {
      fallback = detected;
    }
  }

  return fallback;
}

export function summarizeManifest(manifest: DetectedManifest | null): ManifestSummary {
  if (!manifest) {
    return { relations: [] };
  }

  const parsed = manifest.parsed;
  const dublinCore = isRecord(parsed.dublin_core) ? parsed.dublin_core : null;
  const dublinLanguageRaw = dublinCore ? dublinCore.language : undefined;
  const dublinLanguage = isRecord(dublinLanguageRaw) ? dublinLanguageRaw : null;
  const targetLanguage = isRecord(parsed.target_language) ? parsed.target_language : null;
  const resource = isRecord(parsed.resource) ? parsed.resource : null;

  const relationsRaw = dublinCore?.relation;
  const relations = Array.isArray(relationsRaw)
    ? relationsRaw.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    identifier:
      (typeof dublinCore?.identifier === 'string' && dublinCore.identifier) ||
      (typeof resource?.id === 'string' && resource.id) ||
      undefined,
    language:
      (typeof dublinLanguage?.identifier === 'string' && dublinLanguage.identifier) ||
      (typeof targetLanguage?.id === 'string' && targetLanguage.id) ||
      undefined,
    subject: typeof dublinCore?.subject === 'string' ? dublinCore.subject : undefined,
    version:
      (typeof dublinCore?.version === 'string' && dublinCore.version) ||
      (typeof resource?.version === 'string' && resource.version) ||
      undefined,
    relations,
  };
}
