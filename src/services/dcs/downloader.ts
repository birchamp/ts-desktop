import fs, { Dirent } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getUserDataPath } from '../../utils/files';
import { CatalogSearchParams, Door43CatalogEntry, catalogSearch } from './catalog';
import { loadRepositoryManifest, summarizeManifest } from './manifest';
import { DependencyGraph, buildDependencyGraph } from './resourceSchema';

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

export const resourceDownloader = {
  listCached,
  listCatalogResources,
  buildCatalogDependencyGraph,
};
