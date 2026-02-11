import { get } from '../../utils/net';

export const DOOR43_BASE_URL = 'https://git.door43.org';
export const DOOR43_API_BASE = `${DOOR43_BASE_URL}/api/v1`;

export interface CatalogSearchParams {
  subject?: string;
  lang?: string;
  owner?: string;
  stage?: string;
  q?: string;
}

export interface Door43RepositoryInfo {
  id?: number;
  name: string;
  full_name?: string;
  default_branch?: string;
  description?: string;
  html_url?: string;
  updated_at?: string;
}

export interface Door43RepoOwner {
  username?: string;
  full_name?: string;
}

export interface Door43CatalogEntry {
  id?: number;
  name?: string;
  title?: string;
  repo?: Door43RepositoryInfo;
  owner?: Door43RepoOwner;
  subject?: string;
  language?: string;
  lang?: string;
  stage?: string;
  released?: string;
  metadata_json_url?: string;
  zipball_url?: string;
  [key: string]: unknown;
}

export interface Door43RepoContentEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | string;
  sha?: string;
  size?: number;
  encoding?: string;
  content?: string;
  download_url?: string;
  url?: string;
}

function normalizeBaseUrl(baseUrl = DOOR43_BASE_URL): string {
  return baseUrl.replace(/\/+$/, '');
}

function buildApiUrl(baseUrl: string, endpoint: string, query?: Record<string, string>): string {
  const root = normalizeBaseUrl(baseUrl);
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${root}${path}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function buildRepoContentsUrl(
  baseUrl: string,
  owner: string,
  repo: string,
  relPath = '',
  ref?: string
): string {
  const encodedPath = relPath
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/');
  const endpoint = encodedPath.length
    ? `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`
    : `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`;
  const query: Record<string, string> = {};
  if (ref) {
    query.ref = ref;
  }
  return buildApiUrl(baseUrl, endpoint, query);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeArrayResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (isRecord(data)) {
    const candidates = ['data', 'results', 'items', 'entries'] as const;
    for (const key of candidates) {
      const child = data[key];
      if (Array.isArray(child)) {
        return child as T[];
      }
    }
  }
  return [];
}

async function requestJson<T>(url: string): Promise<T | null> {
  const response = await get<T>(url, { responseType: 'json' });
  if (!response.ok) {
    return null;
  }
  return response.data;
}

export async function catalogSearch(
  params: CatalogSearchParams,
  baseUrl = DOOR43_BASE_URL
): Promise<Door43CatalogEntry[]> {
  const url = buildApiUrl(baseUrl, '/api/v1/catalog/search', {
    ...(params.subject ? { subject: params.subject } : {}),
    ...(params.lang ? { lang: params.lang } : {}),
    ...(params.owner ? { owner: params.owner } : {}),
    ...(params.q ? { q: params.q } : {}),
    stage: params.stage || 'prod',
  });

  const data = await requestJson<unknown>(url);
  return normalizeArrayResponse<Door43CatalogEntry>(data);
}

export async function listCatalogSubjects(baseUrl = DOOR43_BASE_URL): Promise<string[]> {
  const url = buildApiUrl(baseUrl, '/api/v1/catalog/list/subjects');
  const data = await requestJson<unknown>(url);
  const rows = normalizeArrayResponse<unknown>(data);
  const subjects = rows
    .map(row => {
      if (typeof row === 'string') return row;
      if (!isRecord(row)) return null;
      const subject = row.subject;
      return typeof subject === 'string' ? subject : null;
    })
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(subjects)).sort((a, b) => a.localeCompare(b));
}

export async function listCatalogOwners(baseUrl = DOOR43_BASE_URL): Promise<string[]> {
  const url = buildApiUrl(baseUrl, '/api/v1/catalog/list/owners');
  const data = await requestJson<unknown>(url);
  const rows = normalizeArrayResponse<unknown>(data);
  const owners = rows
    .map(row => {
      if (typeof row === 'string') return row;
      if (!isRecord(row)) return null;
      const owner = row.owner;
      if (typeof owner === 'string') return owner;
      if (isRecord(owner) && typeof owner.username === 'string') return owner.username;
      return null;
    })
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(owners)).sort((a, b) => a.localeCompare(b));
}

export async function listCatalogLanguages(baseUrl = DOOR43_BASE_URL): Promise<string[]> {
  const url = buildApiUrl(baseUrl, '/api/v1/catalog/list/languages');
  const data = await requestJson<unknown>(url);
  const rows = normalizeArrayResponse<unknown>(data);
  const languages = rows
    .map(row => {
      if (typeof row === 'string') return row;
      if (!isRecord(row)) return null;
      const language = row.language;
      if (typeof language === 'string') return language;
      if (isRecord(language) && typeof language.identifier === 'string') return language.identifier;
      const lang = row.lang;
      return typeof lang === 'string' ? lang : null;
    })
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(languages)).sort((a, b) => a.localeCompare(b));
}

export async function getRepositoryInfo(
  owner: string,
  repo: string,
  baseUrl = DOOR43_BASE_URL
): Promise<Door43RepositoryInfo | null> {
  const url = buildApiUrl(
    baseUrl,
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );
  return requestJson<Door43RepositoryInfo>(url);
}

export async function getRepositoryContents(
  owner: string,
  repo: string,
  options: { ref?: string; relPath?: string; baseUrl?: string } = {}
): Promise<Door43RepoContentEntry[]> {
  const url = buildRepoContentsUrl(
    options.baseUrl || DOOR43_BASE_URL,
    owner,
    repo,
    options.relPath || '',
    options.ref
  );
  const data = await requestJson<unknown>(url);
  return normalizeArrayResponse<Door43RepoContentEntry>(data);
}

export async function getRepositoryFile(
  owner: string,
  repo: string,
  relPath: string,
  options: { ref?: string; baseUrl?: string } = {}
): Promise<Door43RepoContentEntry | null> {
  const url = buildRepoContentsUrl(
    options.baseUrl || DOOR43_BASE_URL,
    owner,
    repo,
    relPath,
    options.ref
  );
  const data = await requestJson<unknown>(url);
  if (!data || Array.isArray(data) || !isRecord(data)) {
    return null;
  }
  if (
    typeof data.name !== 'string' ||
    typeof data.path !== 'string' ||
    typeof data.type !== 'string'
  ) {
    return null;
  }
  return {
    name: data.name,
    path: data.path,
    type: data.type,
    sha: typeof data.sha === 'string' ? data.sha : undefined,
    size: typeof data.size === 'number' ? data.size : undefined,
    encoding: typeof data.encoding === 'string' ? data.encoding : undefined,
    content: typeof data.content === 'string' ? data.content : undefined,
    download_url: typeof data.download_url === 'string' ? data.download_url : undefined,
    url: typeof data.url === 'string' ? data.url : undefined,
  };
}

export async function getRawFileText(
  owner: string,
  repo: string,
  relPath: string,
  options: { ref?: string; baseUrl?: string } = {}
): Promise<string | null> {
  const base = normalizeBaseUrl(options.baseUrl || DOOR43_BASE_URL);
  const ref = options.ref || 'master';
  const encodedPath = relPath
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/');
  const url = `${base}/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/raw/branch/${encodeURIComponent(ref)}/${encodedPath}`;
  const response = await get<string>(url, { responseType: 'text' });
  if (!response.ok || typeof response.data !== 'string') {
    return null;
  }
  return response.data;
}
