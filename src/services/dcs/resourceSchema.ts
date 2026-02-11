export interface ParsedRelationRef {
  raw: string;
  language?: string;
  identifier?: string;
  version?: string;
  key?: string;
}

export interface ParsedRcLink {
  raw: string;
  language: string;
  resource: string;
  container: string;
  path: string;
  query: Record<string, string>;
}

export interface VerseRef {
  raw: string;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
}

export interface TnTsvRow {
  reference: string;
  id: string;
  tags: string[];
  supportReference: string;
  supportRcLink: ParsedRcLink | null;
  quote: string;
  occurrence: number | null;
  note: string;
  parsedReference: VerseRef;
  raw: Record<string, string>;
}

export interface TwlTsvRow {
  reference: string;
  id: string;
  tags: string[];
  origWords: string;
  occurrence: number | null;
  twLink: string;
  twRcLink: ParsedRcLink | null;
  parsedReference: VerseRef;
  raw: Record<string, string>;
}

export interface TwMarkdownArticle {
  title: string;
  sections: Record<string, string>;
  raw: string;
}

export interface RelationResource {
  id: string;
  name?: string;
  owner?: string;
  language?: string;
  relation?: string[];
}

export interface DependencyNode {
  key: string;
  dependencies: string[];
  unresolved: string[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
}

interface ParsedTsv {
  headers: string[];
  records: Record<string, string>[];
}

function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitTags(value: string): string[] {
  const text = value.trim();
  if (!text) return [];
  return text
    .split(/[;,]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizeHeader(header: string): string {
  return header.replace(/\ufeff/g, '').trim();
}

function parseQueryString(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value) return out;
  value.split('&').forEach(part => {
    if (!part) return;
    const [rawKey, rawVal = ''] = part.split('=');
    const key = decodeURIComponent(rawKey || '').trim();
    if (!key) return;
    out[key] = decodeURIComponent(rawVal || '').trim();
  });
  return out;
}

function parseReference(reference: string): VerseRef {
  const raw = reference.trim();
  const match = raw.match(/^(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) {
    return { raw, chapter: null, verseStart: null, verseEnd: null };
  }
  const chapter = parseInt(match[1], 10);
  const verseStart = parseInt(match[2], 10);
  const verseEnd = match[3] ? parseInt(match[3], 10) : verseStart;
  return { raw, chapter, verseStart, verseEnd };
}

function parseTsv(text: string): ParsedTsv {
  const input = text.replace(/^\ufeff/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (inQuotes && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === '\t') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && input[i + 1] === '\n') {
        i += 1;
      }
      row.push(cell);
      cell = '';
      if (row.some(value => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some(value => value.trim().length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map(normalizeHeader);
  const records: Record<string, string>[] = rows.slice(1).map(values => {
    const out: Record<string, string> = {};
    headers.forEach((header, idx) => {
      out[header] = values[idx] || '';
    });
    return out;
  });

  return { headers, records };
}

function pickField(record: Record<string, string>, candidates: string[]): string {
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key] || '';
    }
  }
  return '';
}

export function parseRelationRef(rawRelation: string): ParsedRelationRef {
  const raw = rawRelation.trim();
  if (!raw) return { raw: rawRelation };

  const [relationPath, queryString = ''] = raw.split('?');
  const parts = relationPath.split('/').filter(Boolean);
  const version = parseQueryString(queryString).v;
  const language = parts[0];
  const identifier = parts[1];

  return {
    raw,
    language,
    identifier,
    version: version || undefined,
    key: language && identifier ? `${language}/${identifier}` : undefined,
  };
}

export function parseRcLink(rawLink: string): ParsedRcLink | null {
  const raw = rawLink.trim();
  const prefix = 'rc://';
  if (!raw.startsWith(prefix)) return null;

  const withoutPrefix = raw.slice(prefix.length);
  const [pathPart, queryString = ''] = withoutPrefix.split('?');
  const pathItems = pathPart.split('/').filter(Boolean);
  if (pathItems.length < 4) return null;

  const [language, resource, container, ...rest] = pathItems;
  return {
    raw,
    language,
    resource,
    container,
    path: rest.join('/'),
    query: parseQueryString(queryString),
  };
}

function deriveIdentifier(resource: RelationResource): string {
  const id = resource.id.trim();
  const lang = resource.language?.trim();
  if (lang && id.startsWith(`${lang}_`)) {
    return id.slice(lang.length + 1);
  }
  const idx = id.indexOf('_');
  if (idx > 0) {
    return id.slice(idx + 1);
  }
  return id;
}

export function toResourceKey(resource: RelationResource): string | null {
  const lang = resource.language?.trim();
  if (!lang) return null;
  const identifier = deriveIdentifier(resource).trim();
  if (!identifier) return null;
  return `${lang}/${identifier}`;
}

export function parseTnTsv(text: string): TnTsvRow[] {
  const parsed = parseTsv(text);
  return parsed.records.map(record => {
    const reference = pickField(record, ['Reference']);
    const supportReference = pickField(record, ['SupportReference', 'Support Reference']);
    return {
      reference,
      id: pickField(record, ['ID', 'Id']),
      tags: splitTags(pickField(record, ['Tags'])),
      supportReference,
      supportRcLink: parseRcLink(supportReference),
      quote: pickField(record, ['Quote']),
      occurrence: parseInteger(pickField(record, ['Occurrence'])),
      note: pickField(record, ['Note']),
      parsedReference: parseReference(reference),
      raw: record,
    };
  });
}

export function parseTwlTsv(text: string): TwlTsvRow[] {
  const parsed = parseTsv(text);
  return parsed.records.map(record => {
    const reference = pickField(record, ['Reference']);
    const twLink = pickField(record, ['TWLink', 'TW Link']);
    return {
      reference,
      id: pickField(record, ['ID', 'Id']),
      tags: splitTags(pickField(record, ['Tags'])),
      origWords: pickField(record, ['OrigWords', 'Orig Words']),
      occurrence: parseInteger(pickField(record, ['Occurrence'])),
      twLink,
      twRcLink: parseRcLink(twLink),
      parsedReference: parseReference(reference),
      raw: record,
    };
  });
}

export function parseTwArticleMarkdown(text: string): TwMarkdownArticle {
  const raw = text.trim();
  const lines = raw.split(/\r?\n/);
  let title = '';
  const sections: Record<string, string> = {};
  let currentSection = 'Body';
  const bodyLines: string[] = [];

  lines.forEach(line => {
    if (!title && line.startsWith('# ')) {
      title = line.slice(2).trim();
      return;
    }
    if (line.startsWith('## ')) {
      currentSection = line.slice(3).trim() || 'Body';
      if (!sections[currentSection]) {
        sections[currentSection] = '';
      }
      return;
    }
    if (sections[currentSection] !== undefined) {
      sections[currentSection] = `${sections[currentSection]}${line}\n`;
    } else {
      bodyLines.push(line);
    }
  });

  const normalizedSections: Record<string, string> = {};
  Object.entries(sections).forEach(([key, value]) => {
    normalizedSections[key] = value.trim();
  });
  if (bodyLines.length > 0 && !normalizedSections.Body) {
    normalizedSections.Body = bodyLines.join('\n').trim();
  }

  return {
    title,
    sections: normalizedSections,
    raw,
  };
}

export function buildDependencyGraph(resources: RelationResource[]): DependencyGraph {
  const keyToNode = new Map<string, RelationResource>();
  resources.forEach(resource => {
    const key = toResourceKey(resource);
    if (key) {
      keyToNode.set(key, resource);
    }
  });

  const nodes: DependencyNode[] = resources.map(resource => {
    const key = toResourceKey(resource) || resource.id;
    const parsedRelations = (resource.relation || []).map(parseRelationRef);
    const dependencies: string[] = [];
    const unresolved: string[] = [];

    parsedRelations.forEach(relation => {
      if (!relation.key) {
        unresolved.push(relation.raw);
        return;
      }
      if (keyToNode.has(relation.key)) {
        dependencies.push(relation.key);
      } else {
        unresolved.push(relation.raw);
      }
    });

    return {
      key,
      dependencies: Array.from(new Set(dependencies)),
      unresolved: Array.from(new Set(unresolved)),
    };
  });

  return { nodes };
}
