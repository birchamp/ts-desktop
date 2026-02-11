import { readJson, writeJson } from '../utils/files';

export type ReviewStatus = 'pending' | 'approved' | 'needs-work';

export interface ReviewVerse {
  chapter: number;
  verse: number;
  status: ReviewStatus;
  note: string;
  updatedAt: number;
}

export interface ReviewBook {
  bookId: string;
  verses: ReviewVerse[];
}

export interface ReviewDraftDocument {
  projectId: string;
  books: Record<string, ReviewBook>;
  updatedAt: number;
}

function reviewDraftPath(projectId: string): string {
  return `projects/${projectId}/review-draft.json`;
}

function normalizeBookId(bookId: string): string {
  return (bookId || '').trim().toLowerCase();
}

function verseKey(chapter: number, verse: number): string {
  return `${chapter}:${verse}`;
}

export function createEmptyReviewDraft(projectId: string): ReviewDraftDocument {
  return {
    projectId,
    books: {},
    updatedAt: Date.now(),
  };
}

export async function loadReviewDraft(projectId: string): Promise<ReviewDraftDocument> {
  const loaded = await readJson<ReviewDraftDocument>(reviewDraftPath(projectId));
  if (
    !loaded ||
    typeof loaded !== 'object' ||
    loaded.projectId !== projectId ||
    !loaded.books ||
    typeof loaded.books !== 'object'
  ) {
    return createEmptyReviewDraft(projectId);
  }
  return loaded;
}

export async function saveReviewDraft(draft: ReviewDraftDocument): Promise<boolean> {
  const payload: ReviewDraftDocument = {
    ...draft,
    updatedAt: Date.now(),
  };
  return writeJson(reviewDraftPath(draft.projectId), payload);
}

export function getReviewVerse(
  draft: ReviewDraftDocument,
  bookId: string,
  chapter: number,
  verse: number
): ReviewVerse | null {
  const bookKey = normalizeBookId(bookId);
  const book = draft.books[bookKey];
  if (!book) return null;
  const key = verseKey(chapter, verse);
  const match = book.verses.find(item => verseKey(item.chapter, item.verse) === key);
  return match || null;
}

export function upsertReviewVerse(
  draft: ReviewDraftDocument,
  bookId: string,
  chapter: number,
  verse: number,
  next: { status: ReviewStatus; note?: string }
): ReviewDraftDocument {
  const bookKey = normalizeBookId(bookId);
  const previousBook = draft.books[bookKey];
  const nextBook: ReviewBook = previousBook
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
  if (index >= 0) {
    nextBook.verses[index] = {
      ...nextBook.verses[index],
      status: next.status,
      note: next.note ?? nextBook.verses[index].note,
      updatedAt: Date.now(),
    };
  } else {
    nextBook.verses.push({
      chapter,
      verse,
      status: next.status,
      note: next.note || '',
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

export function listReviewVerses(draft: ReviewDraftDocument, bookId: string): ReviewVerse[] {
  const bookKey = normalizeBookId(bookId);
  const book = draft.books[bookKey];
  if (!book) return [];
  return [...book.verses].sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });
}

export function summarizeReviewBook(
  draft: ReviewDraftDocument,
  bookId: string
): { approvedCount: number; needsWorkCount: number; pendingCount: number } {
  const verses = listReviewVerses(draft, bookId);
  const approvedCount = verses.filter(item => item.status === 'approved').length;
  const needsWorkCount = verses.filter(item => item.status === 'needs-work').length;
  const pendingCount = verses.filter(item => item.status === 'pending').length;
  return {
    approvedCount,
    needsWorkCount,
    pendingCount,
  };
}
