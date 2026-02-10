import fs, { Dirent } from 'fs';
import path from 'path';
import { getUserDataPath } from '../../utils/files';

export interface CachedResource {
  id: string;
  name: string;
  owner: string;
  version: string;
  language?: string;
  project?: string;
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
    version?: string;
    creator?: string | string[];
  };
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
    manifest.resource?.version ||
    manifest.version ||
    manifest.dublin_core?.version ||
    'unknown'
  );
}

function parseName(manifest: ResourceManifest, fallback: string): string {
  return (
    manifest.resource?.name ||
    manifest.name ||
    manifest.dublin_core?.identifier ||
    fallback
  );
}

function parseId(manifest: ResourceManifest, fallback: string): string {
  return manifest.resource?.id || manifest.resource?.slug || fallback;
}

async function readManifest(manifestPath: string): Promise<ResourceManifest | null> {
  try {
    const raw = await fs.promises.readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as ResourceManifest;
  } catch {
    return null;
  }
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
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const containerPath = path.join(resourcesRoot, entry.name);
        const manifestPath = path.join(containerPath, 'package.json');
        const manifest = await readManifest(manifestPath);

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
          containerPath,
        };
        return item;
      })
  );

  return resources
    .filter((resource): resource is CachedResource => resource !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const resourceDownloader = {
  listCached,
};
