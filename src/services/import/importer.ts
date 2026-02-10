export interface ImportServiceResult {
  projectId: string | null;
  projectName: string | null;
}

function sanitizeProjectId(value: string): string | null {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

function firstMatch(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  if (!match || !match[1]) return null;
  return match[1].trim();
}

export function extractProjectIdFromUSFM(content: string): string | null {
  if (!content || typeof content !== 'string') return null;

  const normalized = content.replace(/\r\n/g, '\n');
  const id =
    firstMatch(normalized, /^\s*\\id\s+([^\s\\]+)/im) ||
    firstMatch(normalized, /^\s*\\toc3\s+([^\s\\]+)/im) ||
    firstMatch(normalized, /^\s*\\h\s+(.+)$/im);

  if (!id) return null;
  return sanitizeProjectId(id);
}

export class ImportService {
  static analyzeUSFM(content: string): ImportServiceResult {
    const projectId = extractProjectIdFromUSFM(content);
    const header = firstMatch(content, /^\s*\\h\s+(.+)$/im);
    return {
      projectId,
      projectName: header || projectId,
    };
  }
}

