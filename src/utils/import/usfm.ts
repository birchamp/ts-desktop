import USFM from 'usfm-js';
import path from 'path';
import { ensureDir, writeJson, writeText, readAbsoluteText, copyAbsoluteToUserData } from '../files';
import { projectRepository } from '../../services/projectRepository';

export interface UsfmImportResult {
  projectId: string;
  name: string;
  language: string;
  savedPaths: { usfm: string; parsed: string };
}

export async function importUsfm(absFilePath: string, languageFallback = 'en'): Promise<UsfmImportResult | null> {
  const fileName = path.basename(absFilePath);
  const baseName = fileName.replace(/\.usfm$/i, '');
  const id = Date.now().toString();
  const projDir = `projects/${id}`;

  const text = await readAbsoluteText(absFilePath);
  if (!text) return null;

  // Parse USFM to JSON using usfm-js
  let parsed: any = null;
  try {
    // usfm-js API provides toJSON(text, options)
    const anyUSFM: any = USFM as any;
    if (anyUSFM && typeof anyUSFM.toJSON === 'function') {
      parsed = anyUSFM.toJSON(text, { chunk: false });
    } else if (typeof (USFM as any) === 'function') {
      parsed = (USFM as any)(text);
    }
  } catch (_) {
    // ignore parse errors; still keep original file
  }

  await ensureDir(projDir);
  // Copy original file and save parsed JSON if available
  await copyAbsoluteToUserData(`${projDir}/source.usfm`, absFilePath);
  if (parsed) {
    await writeJson(`${projDir}/parsed.json`, parsed);
  } else {
    await writeText(`${projDir}/parsed.json`, JSON.stringify({ error: 'parse-failed' }));
  }

  // Persist project metadata in DB
  await projectRepository.createProject({
    id,
    name: baseName,
    type: 'translation',
    language: languageFallback,
    progress: 0,
    lastModified: Date.now(),
  });

  return {
    projectId: id,
    name: baseName,
    language: languageFallback,
    savedPaths: { usfm: `${projDir}/source.usfm`, parsed: `${projDir}/parsed.json` },
  };
}
