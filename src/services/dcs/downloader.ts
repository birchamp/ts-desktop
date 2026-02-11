import fs, { Dirent } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getUserDataPath } from '../../utils/files';
import {
  CatalogSearchParams,
  Door43CatalogEntry,
  catalogSearch,
  getRawFileText,
  getRepositoryContents,
} from './catalog';
import { listManifestProjects, loadRepositoryManifest, summarizeManifest } from './manifest';
import {
  DependencyGraph,
  TnTsvRow,
  TwMarkdownArticle,
  TwlTsvRow,
  buildDependencyGraph,
  parseRelationRef,
  parseTnTsv,
  parseTwArticleMarkdown,
  parseTwlTsv,
  toResourceKey,
} from './resourceSchema';

export interface CachedResource {
  id: string;
  name: string;
  owner: string;
  version: string;
  language?: string;
  project?: string;
  subject?: string;
  relations?: string[];
  manifestType?: string;
  containerPath: string;
}

interface ResourceManifest {
  name?: string;
  version?: string;
  resource?: {
    id?: string;
    slug?: string;
    name?: string;
    version?: string;
  };
  dublin_core?: {
    identifier?: string;
    language?: {
      identifier?: string;
    };
    subject?: string;
    relation?: string[];
    version?: string;
    creator?: string | string[];
  };
  package_version?: number;
  format?: string;
  project?: {
    id?: string;
  };
  target_language?: {
    id?: string;
  };
  projects?: Array<{
    identifier?: string;
    path?: string;
  }>;
}

export interface CatalogResource {
  id: string;
  name: string;
  owner: string;
  repo: string;
  version: string;
  language?: string;
  subject?: string;
  stage?: string;
  relation: string[];
  manifestType?: string;
  ref?: string;
}

interface RepoIdentity {
  owner: string;
  repo: string;
}

export interface ParsedBookRows<T> {
  identifier: string;
  path: string;
  rows: T[];
}

export interface ParsedTwArticle {
  path: string;
  category?: string;
  slug?: string;
  article: TwMarkdownArticle;
}

export interface LoadedResourceRows<T> {
  resource: CatalogResource;
  files: ParsedBookRows<T>[];
}

export interface LoadedTwResource {
  resource: CatalogResource;
  files: ParsedTwArticle[];
}

export interface LoadedSupportBundle {
  primary: CatalogResource;
  tn?: LoadedResourceRows<TnTsvRow> | null;
  twl?: LoadedResourceRows<TwlTsvRow> | null;
  tw?: LoadedTwResource | null;
  unresolvedRelations: string[];
}

export interface LoadedCatalogSourceText {
  resource: CatalogResource;
  bookId: string;
  path: string;
  text: string;
}

export interface LoadedCachedSourceText {
  resource: CachedResource;
  bookId: string;
  path: string;
  text: string;
}

function parseOwner(manifest: ResourceManifest): string {
  const creator = manifest.dublin_core?.creator;
  if (Array.isArray(creator)) {
    return creator.filter(Boolean).join(', ') || 'Unknown';
  }
  if (typeof creator === 'string' && creator.trim().length > 0) {
    return creator;
  }
  return 'Unknown';
}

function parseVersion(manifest: ResourceManifest): string {
  return (
    manifest.resource?.version || manifest.version || manifest.dublin_core?.version || 'unknown'
  );
}

function parseName(manifest: ResourceManifest, fallback: string): string {
  return manifest.resource?.name || manifest.name || manifest.dublin_core?.identifier || fallback;
}

function parseId(manifest: ResourceManifest, fallback: string): string {
  return manifest.resource?.id || manifest.resource?.slug || fallback;
}

function detectLocalManifestType(manifest: ResourceManifest): string {
  if (manifest.dublin_core) return 'resource-container';
  if (typeof manifest.package_version === 'number') return 'translationstudio';
  if (manifest.resource && manifest.target_language && manifest.project) return 'translationcore';
  return 'unknown';
}

function parseRelations(manifest: ResourceManifest): string[] {
  const relations = manifest.dublin_core?.relation;
  if (!Array.isArray(relations)) return [];
  return relations.filter((item): item is string => typeof item === 'string');
}

async function readJsonManifest(manifestPath: string): Promise<ResourceManifest | null> {
  try {
    const raw = await fs.promises.readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as ResourceManifest;
  } catch {
    return null;
  }
}

async function readYamlManifest(manifestPath: string): Promise<ResourceManifest | null> {
  try {
    const raw = await fs.promises.readFile(manifestPath, 'utf8');
    const parsed = yaml.load(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as ResourceManifest;
    }
    return null;
  } catch {
    return null;
  }
}

async function readManifest(containerPath: string): Promise<ResourceManifest | null> {
  const packageJsonPath = path.join(containerPath, 'package.json');
  const manifestYamlPath = path.join(containerPath, 'manifest.yaml');
  const manifestYmlPath = path.join(containerPath, 'manifest.yml');

  return (
    (await readJsonManifest(packageJsonPath)) ||
    (await readYamlManifest(manifestYamlPath)) ||
    (await readYamlManifest(manifestYmlPath))
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function parseRepoIdentity(entry: Door43CatalogEntry): RepoIdentity | null {
  const repoRecord = asRecord(entry.repo);
  const ownerRecord = asRecord(entry.owner);
  const repoOwnerRecord = asRecord(repoRecord?.owner);

  const fullName = firstString([
    repoRecord?.full_name,
    (entry as Record<string, unknown>).full_name,
  ]);

  if (fullName && fullName.includes('/')) {
    const [owner, repo] = fullName.split('/');
    if (owner && repo) {
      return { owner, repo };
    }
  }

  const owner = firstString([ownerRecord?.username, repoOwnerRecord?.username, entry.owner]);
  const repo = firstString([
    repoRecord?.name,
    entry.name,
    (entry as Record<string, unknown>).repo_name,
  ]);
  if (!owner || !repo) return null;
  return { owner, repo };
}

function parseCatalogLanguage(entry: Door43CatalogEntry): string | undefined {
  const langRecord = asRecord(entry.language);
  return firstString([entry.lang, entry.language, langRecord?.identifier]);
}

function parseCatalogVersion(entry: Door43CatalogEntry): string {
  const release = asRecord((entry as Record<string, unknown>).release);
  const releaseTag = firstString([release?.tag_name, release?.name]);
  return releaseTag || 'unknown';
}

async function listCached(): Promise<CachedResource[]> {
  const userDataPath = await getUserDataPath();
  if (!userDataPath) {
    return [];
  }

  const resourcesRoot = path.join(userDataPath, 'library', 'resource_containers');
  let entries: Dirent[];
  try {
    entries = await fs.promises.readdir(resourcesRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const resources = await Promise.all(
    entries
      .filter(entry => entry.isDirectory())
      .map(async entry => {
        const containerPath = path.join(resourcesRoot, entry.name);
        const manifest = await readManifest(containerPath);

        if (!manifest) {
          return null;
        }

        const language = manifest.dublin_core?.language?.identifier;
        const identifier = manifest.dublin_core?.identifier;
        const project =
          typeof identifier === 'string' && identifier.includes('_')
            ? identifier.split('_').slice(1).join('_')
            : undefined;

        const item: CachedResource = {
          id: parseId(manifest, entry.name),
          name: parseName(manifest, entry.name),
          owner: parseOwner(manifest),
          version: parseVersion(manifest),
          language,
          project,
          subject: manifest.dublin_core?.subject,
          relations: parseRelations(manifest),
          manifestType: detectLocalManifestType(manifest),
          containerPath,
        };
        return item;
      })
  );

  return resources
    .filter((resource): resource is CachedResource => resource !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function listCatalogResources(
  filters: CatalogSearchParams = {},
  options: { includeManifest?: boolean } = {}
): Promise<CatalogResource[]> {
  const includeManifest = options.includeManifest !== false;
  const entries = await catalogSearch(filters);
  const rows = await Promise.all(
    entries.map(async entry => {
      const identity = parseRepoIdentity(entry);
      if (!identity) {
        return null;
      }

      let relation: string[] = [];
      let manifestType: string | undefined;
      let version = parseCatalogVersion(entry);

      if (includeManifest) {
        const manifest = await loadRepositoryManifest(identity.owner, identity.repo);
        const summary = summarizeManifest(manifest);
        relation = summary.relations;
        manifestType = manifest?.format;
        if (summary.version && summary.version !== 'unknown') {
          version = summary.version;
        }
      }

      const repoRecord = asRecord(entry.repo);
      const defaultBranch = firstString([repoRecord?.default_branch]);
      const name = firstString([entry.title, entry.name, identity.repo]) || identity.repo;

      return {
        id: identity.repo,
        name,
        owner: identity.owner,
        repo: identity.repo,
        version,
        language: parseCatalogLanguage(entry),
        subject: firstString([entry.subject]),
        stage: firstString([entry.stage, entry.released]),
        relation,
        manifestType,
        ref: defaultBranch || 'master',
      } as CatalogResource;
    })
  );

  const resources: CatalogResource[] = [];
  rows.forEach(row => {
    if (row) {
      resources.push(row);
    }
  });
  resources.sort((a, b) => a.name.localeCompare(b.name));
  return resources;
}

function buildCatalogDependencyGraph(resources: CatalogResource[]): DependencyGraph {
  return buildDependencyGraph(resources);
}

function sanitizeRelativePath(relPath: string): string {
  return relPath
    .trim()
    .replace(/^[./]+/, '')
    .replace(/\/+/g, '/');
}

function extensionLower(relPath: string): string {
  return path.extname(relPath).toLowerCase();
}

function basenameLower(relPath: string): string {
  return path.basename(relPath).toLowerCase();
}

function deriveProjectId(relPath: string, fallback: string): string {
  const base = path.basename(relPath).replace(/\.[^.]+$/, '');
  const candidate = base.replace(/^(tn|twl)_/i, '').trim();
  return candidate.length > 0 ? candidate.toLowerCase() : fallback;
}

function normalizeBookId(bookId: string | undefined): string | undefined {
  if (!bookId) return undefined;
  const normalized = bookId.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function matchesBookIdentifier(candidate: string | undefined, normalizedBookId: string): boolean {
  if (!candidate) return false;
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === normalizedBookId) return true;
  const separatorPattern = new RegExp(`(^|[._\\-/])${normalizedBookId}([._\\-/]|$)`, 'i');
  return separatorPattern.test(normalized);
}

function pickCandidatePath(
  paths: string[],
  explicitIds: Record<string, string | undefined>,
  bookId?: string
): { bookId: string; path: string } | null {
  const normalizedBookId = normalizeBookId(bookId);
  if (paths.length === 0) return null;

  if (normalizedBookId) {
    for (const pathItem of paths) {
      const explicitId = explicitIds[pathItem];
      if (matchesBookIdentifier(explicitId, normalizedBookId)) {
        return { bookId: normalizedBookId, path: pathItem };
      }
      if (matchesBookIdentifier(path.basename(pathItem), normalizedBookId)) {
        return { bookId: normalizedBookId, path: pathItem };
      }
    }
  }

  const fallbackPath = paths[0];
  const fallbackId =
    explicitIds[fallbackPath] || deriveProjectId(fallbackPath, normalizedBookId || 'unknown');
  return { bookId: fallbackId, path: fallbackPath };
}

function toCatalogKey(resource: CatalogResource): string | null {
  return toResourceKey({
    id: resource.id,
    language: resource.language,
    relation: resource.relation,
  });
}

function findRelatedResources(
  resource: CatalogResource,
  resources: CatalogResource[]
): {
  resolved: CatalogResource[];
  unresolved: string[];
} {
  const byKey = new Map<string, CatalogResource>();
  resources.forEach(item => {
    const key = toCatalogKey(item);
    if (key) {
      byKey.set(key, item);
    }
  });

  const resolved: CatalogResource[] = [];
  const unresolved: string[] = [];
  resource.relation.forEach(raw => {
    const relation = parseRelationRef(raw);
    if (!relation.key) {
      unresolved.push(raw);
      return;
    }
    const match = byKey.get(relation.key);
    if (match) {
      resolved.push(match);
    } else {
      unresolved.push(raw);
    }
  });

  return {
    resolved: Array.from(new Set(resolved)),
    unresolved: Array.from(new Set(unresolved)),
  };
}

async function listFilesRecursively(
  owner: string,
  repo: string,
  ref: string,
  relPath: string,
  options: { maxDepth?: number } = {}
): Promise<string[]> {
  const maxDepth = options.maxDepth ?? 6;
  if (maxDepth < 0) return [];

  const cleanPath = sanitizeRelativePath(relPath);
  const entries = await getRepositoryContents(owner, repo, {
    ref,
    relPath: cleanPath,
  });
  if (entries.length === 0) {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.type === 'file') {
      files.push(entry.path);
      continue;
    }
    if (entry.type === 'dir' && maxDepth > 0) {
      const nested = await listFilesRecursively(owner, repo, ref, entry.path, {
        maxDepth: maxDepth - 1,
      });
      files.push(...nested);
    }
  }

  return files;
}

async function loadParsedTnResource(
  resource: CatalogResource
): Promise<LoadedResourceRows<TnTsvRow>> {
  const ref = resource.ref || 'master';
  const manifest = await loadRepositoryManifest(resource.owner, resource.repo, { ref });
  const projectEntries = listManifestProjects(manifest);
  const explicitTsv = projectEntries
    .map(item => ({
      identifier: item.identifier || deriveProjectId(item.path, 'unknown'),
      path: sanitizeRelativePath(item.path),
    }))
    .filter(item => extensionLower(item.path) === '.tsv');

  const candidateFiles: { identifier: string; path: string }[] = [];
  const prioritized = explicitTsv.filter(item => basenameLower(item.path).startsWith('tn_'));
  (prioritized.length > 0 ? prioritized : explicitTsv).forEach(item => {
    candidateFiles.push(item);
  });

  const parsedFiles: ParsedBookRows<TnTsvRow>[] = [];
  for (const item of candidateFiles) {
    const text = await getRawFileText(resource.owner, resource.repo, item.path, { ref });
    if (!text) continue;
    parsedFiles.push({
      identifier: item.identifier,
      path: item.path,
      rows: parseTnTsv(text),
    });
  }

  return {
    resource,
    files: parsedFiles,
  };
}

async function loadParsedTwlResource(
  resource: CatalogResource
): Promise<LoadedResourceRows<TwlTsvRow>> {
  const ref = resource.ref || 'master';
  const manifest = await loadRepositoryManifest(resource.owner, resource.repo, { ref });
  const projectEntries = listManifestProjects(manifest);
  const explicitTsv = projectEntries
    .map(item => ({
      identifier: item.identifier || deriveProjectId(item.path, 'unknown'),
      path: sanitizeRelativePath(item.path),
    }))
    .filter(item => extensionLower(item.path) === '.tsv');

  const candidateFiles: { identifier: string; path: string }[] = [];
  const prioritized = explicitTsv.filter(item => basenameLower(item.path).startsWith('twl_'));
  (prioritized.length > 0 ? prioritized : explicitTsv).forEach(item => {
    candidateFiles.push(item);
  });

  const parsedFiles: ParsedBookRows<TwlTsvRow>[] = [];
  for (const item of candidateFiles) {
    const text = await getRawFileText(resource.owner, resource.repo, item.path, { ref });
    if (!text) continue;
    parsedFiles.push({
      identifier: item.identifier,
      path: item.path,
      rows: parseTwlTsv(text),
    });
  }

  return {
    resource,
    files: parsedFiles,
  };
}

async function loadParsedTwResource(resource: CatalogResource): Promise<LoadedTwResource> {
  const ref = resource.ref || 'master';
  const manifest = await loadRepositoryManifest(resource.owner, resource.repo, { ref });
  const projectEntries = listManifestProjects(manifest);
  const projectRoots = projectEntries.map(item => sanitizeRelativePath(item.path)).filter(Boolean);

  const roots = projectRoots.length > 0 ? projectRoots : ['bible'];
  const candidateFiles = new Set<string>();

  for (const root of roots) {
    if (extensionLower(root) === '.md') {
      candidateFiles.add(root);
      continue;
    }
    const files = await listFilesRecursively(resource.owner, resource.repo, ref, root, {
      maxDepth: 8,
    });
    files
      .filter(filePath => extensionLower(filePath) === '.md')
      .forEach(filePath => candidateFiles.add(filePath));
  }

  const parsedFiles: ParsedTwArticle[] = [];
  for (const filePath of Array.from(candidateFiles).sort()) {
    const normalized = sanitizeRelativePath(filePath);
    const text = await getRawFileText(resource.owner, resource.repo, normalized, { ref });
    if (!text) continue;

    const match = normalized.match(/(?:^|\/)bible\/([^/]+)\/([^/]+)\.md$/i);
    parsedFiles.push({
      path: normalized,
      category: match?.[1]?.toLowerCase(),
      slug: match?.[2]?.toLowerCase(),
      article: parseTwArticleMarkdown(text),
    });
  }

  return {
    resource,
    files: parsedFiles,
  };
}

async function loadSupportBundle(
  primary: CatalogResource,
  resources: CatalogResource[]
): Promise<LoadedSupportBundle> {
  const related = findRelatedResources(primary, resources);

  const pickBySuffix = (suffix: string): CatalogResource | null => {
    const needle = `_${suffix}`;
    for (const resource of related.resolved) {
      const id = resource.id.toLowerCase();
      const repo = resource.repo.toLowerCase();
      if (id === suffix || id.endsWith(needle) || repo === suffix || repo.endsWith(needle)) {
        return resource;
      }
    }
    return null;
  };

  const tnResource = pickBySuffix('tn');
  const twlResource = pickBySuffix('twl');
  const twResource = pickBySuffix('tw');

  const [tn, twl, tw] = await Promise.all([
    tnResource ? loadParsedTnResource(tnResource) : Promise.resolve(null),
    twlResource ? loadParsedTwlResource(twlResource) : Promise.resolve(null),
    twResource ? loadParsedTwResource(twResource) : Promise.resolve(null),
  ]);

  return {
    primary,
    tn,
    twl,
    tw,
    unresolvedRelations: related.unresolved,
  };
}

async function loadCatalogSourceText(
  resource: CatalogResource,
  bookId?: string
): Promise<LoadedCatalogSourceText> {
  const ref = resource.ref || 'master';
  const manifest = await loadRepositoryManifest(resource.owner, resource.repo, { ref });
  const projectEntries = listManifestProjects(manifest);

  const explicitUsfm = projectEntries
    .map(item => ({
      identifier: item.identifier?.trim().toLowerCase(),
      path: sanitizeRelativePath(item.path),
    }))
    .filter(item => {
      const ext = extensionLower(item.path);
      return ext === '.usfm' || ext === '.sfm' || ext === '.txt';
    });

  const explicitPathIds: Record<string, string | undefined> = {};
  explicitUsfm.forEach(item => {
    explicitPathIds[item.path] = item.identifier;
  });
  const explicitPaths = explicitUsfm.map(item => item.path);

  let candidate = pickCandidatePath(explicitPaths, explicitPathIds, bookId);
  if (!candidate) {
    const discoveredFiles = await listFilesRecursively(resource.owner, resource.repo, ref, '', {
      maxDepth: 6,
    });
    const usfmFiles = discoveredFiles.filter(filePath => {
      const ext = extensionLower(filePath);
      return ext === '.usfm' || ext === '.sfm' || ext === '.txt';
    });
    candidate = pickCandidatePath(usfmFiles, {}, bookId);
  }

  if (!candidate) {
    throw new Error(`No source USFM found for ${resource.owner}/${resource.repo}.`);
  }

  const text = await getRawFileText(resource.owner, resource.repo, candidate.path, { ref });
  if (!text) {
    throw new Error(
      `Could not load source file ${candidate.path} from ${resource.owner}/${resource.repo}.`
    );
  }

  return {
    resource,
    bookId: candidate.bookId,
    path: candidate.path,
    text,
  };
}

async function loadCachedSourceText(
  resource: CachedResource,
  bookId?: string
): Promise<LoadedCachedSourceText> {
  const manifest = await readManifest(resource.containerPath);
  const projectsRaw = manifest?.projects ?? [];

  const explicitUsfm: Array<{ identifier?: string; path: string }> = [];
  projectsRaw.forEach(item => {
    if (!item || typeof item.path !== 'string') return;
    const cleanPath = sanitizeRelativePath(item.path);
    const ext = extensionLower(cleanPath);
    if (ext !== '.usfm' && ext !== '.sfm' && ext !== '.txt') return;
    explicitUsfm.push({
      identifier:
        typeof item.identifier === 'string' ? item.identifier.trim().toLowerCase() : undefined,
      path: cleanPath,
    });
  });

  const explicitPathIds: Record<string, string | undefined> = {};
  explicitUsfm.forEach(item => {
    explicitPathIds[item.path] = item.identifier;
  });
  const explicitPaths = explicitUsfm.map(item => item.path);

  let candidate = pickCandidatePath(explicitPaths, explicitPathIds, bookId);
  if (!candidate) {
    const discoveredFiles: string[] = [];
    const walk = async (rootPath: string, depth: number): Promise<void> => {
      if (depth > 8) return;
      const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
      for (const entry of entries) {
        const absPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
          await walk(absPath, depth + 1);
          continue;
        }
        const relPath = sanitizeRelativePath(path.relative(resource.containerPath, absPath));
        const ext = extensionLower(relPath);
        if (ext === '.usfm' || ext === '.sfm' || ext === '.txt') {
          discoveredFiles.push(relPath);
        }
      }
    };
    await walk(resource.containerPath, 0);
    candidate = pickCandidatePath(discoveredFiles, {}, bookId);
  }

  if (!candidate) {
    throw new Error(`No source USFM found in ${resource.containerPath}.`);
  }

  const absPath = path.join(resource.containerPath, candidate.path);
  const text = await fs.promises.readFile(absPath, 'utf8');
  return {
    resource,
    bookId: candidate.bookId,
    path: candidate.path,
    text,
  };
}

export const resourceDownloader = {
  listCached,
  listCatalogResources,
  buildCatalogDependencyGraph,
  findRelatedResources,
  loadParsedTnResource,
  loadParsedTwlResource,
  loadParsedTwResource,
  loadSupportBundle,
  loadCatalogSourceText,
  loadCachedSourceText,
};
