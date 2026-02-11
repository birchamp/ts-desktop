import { readJson, writeJson } from '../utils/files';

export interface DraftVerse {
  chapter: number;
  verse: number;
  text: string;
  updatedAt: number;
}

export interface DraftBook {
  bookId: string;
  verses: DraftVerse[];
}

export interface TranslationDraftDocument {
  projectId: string;
  books: Record<string, DraftBook>;
  updatedAt: number;
}

function draftPath(projectId: string): string {
  return `projects/${projectId}/translation-draft.json`;
}

function normalizeBookId(bookId: string): string {
  return (bookId || '').trim().toLowerCase();
}

function verseKey(chapter: number, verse: number): string {
  return `${chapter}:${verse}`;
}

export function createEmptyDraft(projectId: string): TranslationDraftDocument {
  return {
    projectId,
    books: {},
    updatedAt: Date.now(),
  };
}

export async function loadDraft(projectId: string): Promise<TranslationDraftDocument> {
  const loaded = await readJson<TranslationDraftDocument>(draftPath(projectId));
  if (
    !loaded ||
    typeof loaded !== 'object' ||
    loaded.projectId !== projectId ||
    !loaded.books ||
    typeof loaded.books !== 'object'
  ) {
    return createEmptyDraft(projectId);
  }
  return loaded;
}

export async function saveDraft(draft: TranslationDraftDocument): Promise<boolean> {
  const payload: TranslationDraftDocument = {
    ...draft,
    updatedAt: Date.now(),
  };
  return writeJson(draftPath(draft.projectId), payload);
}

export function getVerseText(
  draft: TranslationDraftDocument,
  bookId: string,
  chapter: number,
  verse: number
): string {
  const bookKey = normalizeBookId(bookId);
  const book = draft.books[bookKey];
  if (!book) return '';
  const key = verseKey(chapter, verse);
  const match = book.verses.find(item => verseKey(item.chapter, item.verse) === key);
  return match?.text || '';
}

export function upsertVerseText(
  draft: TranslationDraftDocument,
  bookId: string,
  chapter: number,
  verse: number,
  text: string
): TranslationDraftDocument {
  const bookKey = normalizeBookId(bookId);
  const previousBook = draft.books[bookKey];
  const nextBook: DraftBook = previousBook
    ? {
        ...previousBook,
        verses: [...previousBook.verses],
      }
    : {
        bookId: bookKey,
        verses: [],
      };

  const key = verseKey(chapter, verse);
  const index = nextBook.verses.findIndex(item => verseKey(item.chapter, item.verse) === key);
  const nextText = text.trim();
  if (index >= 0) {
    if (nextText.length === 0) {
      nextBook.verses.splice(index, 1);
    } else {
      nextBook.verses[index] = {
        ...nextBook.verses[index],
        text,
        updatedAt: Date.now(),
      };
    }
  } else if (nextText.length > 0) {
    nextBook.verses.push({
      chapter,
      verse,
      text,
      updatedAt: Date.now(),
    });
  }

  return {
    ...draft,
    books: {
      ...draft.books,
      [bookKey]: nextBook,
    },
    updatedAt: Date.now(),
  };
}

export function listBookVerses(draft: TranslationDraftDocument, bookId: string): DraftVerse[] {
  const bookKey = normalizeBookId(bookId);
  const book = draft.books[bookKey];
  if (!book) return [];
  return [...book.verses].sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });
}

export function summarizeBookDraft(
  draft: TranslationDraftDocument,
  bookId: string,
  sourceVerseCount: number
): { translatedCount: number; sourceVerseCount: number; percent: number } {
  const translatedCount = listBookVerses(draft, bookId).filter(
    item => item.text.trim().length > 0
  ).length;
  const safeSourceCount = Math.max(sourceVerseCount, 0);
  const percent = safeSourceCount > 0 ? Math.round((translatedCount / safeSourceCount) * 100) : 0;
  return {
    translatedCount,
    sourceVerseCount: safeSourceCount,
    percent,
  };
}
