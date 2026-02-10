export interface ProjectMeta {
  project: {
    id: string;
    name: string;
  };
  target_language: {
    id: string;
    name: string;
    direction: 'ltr' | 'rtl' | string;
  };
  resource: {
    id: string;
    name: string;
  };
  unique_id: string;
  format: 'usfm' | 'markdown' | string;
  project_type_class: string;
}

export interface TranslationChunkMeta {
  chapter?: number | string;
  verse?: number | string;
  chapterid?: string;
  frameid?: string;
  title?: string;
}

export interface TranslationChunk {
  chunkmeta: TranslationChunkMeta;
  transcontent: string;
  completed?: boolean;
}

function toPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function getChapter(chunk: TranslationChunk): number | null {
  return toPositiveInt(chunk.chunkmeta.chapter) ?? toPositiveInt(chunk.chunkmeta.chapterid);
}

function getVerse(chunk: TranslationChunk): string | null {
  const verse = chunk.chunkmeta.verse ?? chunk.chunkmeta.frameid;
  if (verse == null) return null;
  const normalized = String(verse).trim();
  if (!normalized || normalized === 'title') return null;
  return normalized;
}

function splitUsfmVerseBlocks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed.includes('\\v')) {
    return [trimmed];
  }

  const blocks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const next = trimmed.indexOf('\\v', start + 2);
    if (next === -1) {
      blocks.push(trimmed.substring(start).trim());
      break;
    }
    blocks.push(trimmed.substring(start, next).trim());
    start = next;
  }
  return blocks.filter(Boolean);
}

export function generateUSFM(chunks: TranslationChunk[], meta: ProjectMeta): string {
  const lines: string[] = [];
  const projectId = meta.project.id || 'XXX';
  const projectName = meta.project.name || projectId;
  const resourceName = meta.resource?.name || '';

  lines.push(`\\id ${projectId} ${resourceName}`.trim());
  lines.push('\\ide usfm');
  lines.push(`\\h ${projectName}`);
  lines.push(`\\toc1 ${projectName}`);
  lines.push(`\\toc2 ${projectName}`);
  lines.push(`\\toc3 ${projectId}`);
  lines.push(`\\mt ${projectName}`);

  let currentChapter = 0;
  for (const chunk of chunks) {
    const chapter = getChapter(chunk);
    if (!chapter) continue;

    if (chapter !== currentChapter) {
      lines.push(`\\c ${chapter}`);
      currentChapter = chapter;
    }

    const text = (chunk.transcontent || '').trim();
    if (!text) continue;

    if (text.includes('\\v')) {
      lines.push(...splitUsfmVerseBlocks(text));
      continue;
    }

    const verse = getVerse(chunk);
    if (verse) {
      lines.push(`\\v ${verse} ${text}`);
    } else {
      lines.push(text);
    }
  }

  return `${lines.join('\n').trim()}\n`;
}
