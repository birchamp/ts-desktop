import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ProjectContextRecord,
  ProjectRecord,
  ProjectResourceContext,
  projectRepository,
} from '../../services/projectRepository';
import {
  CatalogResource,
  CachedResource,
  ParsedTwArticle,
  resourceDownloader,
} from '../../services/dcs/downloader';
import { TnTsvRow, TwlTsvRow } from '../../services/dcs/resourceSchema';
import {
  TranslationDraftDocument,
  createEmptyDraft,
  getVerseText,
  loadDraft,
  saveDraft,
  summarizeBookDraft,
  upsertVerseText,
} from '../../services/translationDrafts';

interface SourceVerse {
  chapter: number;
  verse: number;
  text: string;
}

function createCatalogResourceFromContext(
  resource: ProjectResourceContext
): CatalogResource | null {
  if (!resource.owner || !resource.repo) return null;
  return {
    id: resource.id,
    name: resource.name,
    owner: resource.owner,
    repo: resource.repo,
    version: resource.version || 'unknown',
    language: resource.language,
    relation: [],
    ref: resource.ref || 'master',
  };
}

function createCachedResourceFromContext(resource: ProjectResourceContext): CachedResource | null {
  if (!resource.containerPath) return null;
  return {
    id: resource.id,
    name: resource.name,
    owner: resource.owner || 'Unknown',
    version: resource.version || 'unknown',
    language: resource.language,
    containerPath: resource.containerPath,
  };
}

function parseSourceVerses(usfmText: string): SourceVerse[] {
  const verses: SourceVerse[] = [];
  const lines = usfmText.split(/\r?\n/);
  let chapter = 1;
  let currentVerse: SourceVerse | null = null;

  const flushCurrent = () => {
    if (!currentVerse) return;
    const text = currentVerse.text.trim();
    if (text.length > 0) {
      verses.push({ ...currentVerse, text });
    }
  };

  lines.forEach(line => {
    const chapterMatch = line.match(/^\s*\\c\s+(\d+)/);
    if (chapterMatch) {
      flushCurrent();
      currentVerse = null;
      chapter = parseInt(chapterMatch[1], 10) || chapter;
      return;
    }

    const verseMatch = line.match(/^\s*\\v\s+(\d+)[^\s]*\s*(.*)$/);
    if (verseMatch) {
      flushCurrent();
      currentVerse = {
        chapter,
        verse: parseInt(verseMatch[1], 10) || 0,
        text: verseMatch[2] || '',
      };
      return;
    }

    if (!currentVerse) return;
    if (/^\s*\\/.test(line)) return;
    currentVerse.text = `${currentVerse.text} ${line.trim()}`.trim();
  });

  flushCurrent();
  return verses.filter(item => item.chapter > 0 && item.verse > 0);
}

function verseMatches(row: TnTsvRow | TwlTsvRow, chapter: number, verse: number): boolean {
  const parsed = row.parsedReference;
  if (parsed.chapter !== chapter) return false;
  if (parsed.verseStart == null) return false;
  const end = parsed.verseEnd ?? parsed.verseStart;
  return verse >= parsed.verseStart && verse <= end;
}

const TranslationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [loadingProject, setLoadingProject] = React.useState(false);
  const [projectError, setProjectError] = React.useState<string | null>(null);
  const [project, setProject] = React.useState<ProjectRecord | null>(null);
  const [projectContext, setProjectContext] = React.useState<ProjectContextRecord | null>(null);

  const [loadingResources, setLoadingResources] = React.useState(false);
  const [resourceError, setResourceError] = React.useState<string | null>(null);
  const [sourceReference, setSourceReference] = React.useState<string | null>(null);
  const [sourceVerses, setSourceVerses] = React.useState<SourceVerse[]>([]);
  const [unresolvedRelations, setUnresolvedRelations] = React.useState<string[]>([]);
  const [tnRows, setTnRows] = React.useState<TnTsvRow[]>([]);
  const [twlRows, setTwlRows] = React.useState<TwlTsvRow[]>([]);
  const [twArticles, setTwArticles] = React.useState<ParsedTwArticle[]>([]);

  const [selectedChapter, setSelectedChapter] = React.useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = React.useState<number | null>(null);

  const [draft, setDraft] = React.useState<TranslationDraftDocument | null>(null);
  const [translationText, setTranslationText] = React.useState('');
  const [editVersion, setEditVersion] = React.useState(0);
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  React.useEffect(() => {
    if (!projectId) {
      setLoadingProject(false);
      setProjectError(null);
      setProject(null);
      setProjectContext(null);
      return;
    }

    let cancelled = false;
    const loadProject = async () => {
      setLoadingProject(true);
      setProjectError(null);
      try {
        const [projectRecord, contextRecord] = await Promise.all([
          projectRepository.getProjectById(projectId),
          projectRepository.getProjectContext(projectId),
        ]);
        if (cancelled) return;
        if (!projectRecord) {
          setProject(null);
          setProjectContext(null);
          setProjectError(`Project ${projectId} was not found.`);
          return;
        }
        setProject(projectRecord);
        setProjectContext(contextRecord);
      } catch (e) {
        if (cancelled) return;
        setProject(null);
        setProjectContext(null);
        setProjectError(e instanceof Error ? e.message : 'Failed to load selected project.');
      } finally {
        if (!cancelled) {
          setLoadingProject(false);
        }
      }
    };

    loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId) {
      setDraft(null);
      setTranslationText('');
      setSaveState('idle');
      setEditVersion(0);
      return;
    }

    let cancelled = false;
    const loadProjectDraft = async () => {
      const loaded = await loadDraft(projectId);
      if (cancelled) return;
      setDraft(loaded);
      setSaveState('idle');
      setEditVersion(0);
    };

    loadProjectDraft();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const context = projectContext?.context;
  const book = context?.book;
  const resource = context?.resource;

  React.useEffect(() => {
    if (!resource || resource.source === 'none') {
      setLoadingResources(false);
      setResourceError(null);
      setSourceReference(null);
      setSourceVerses([]);
      setUnresolvedRelations([]);
      setTnRows([]);
      setTwlRows([]);
      setTwArticles([]);
      return;
    }

    let cancelled = false;
    const preloadResources = async () => {
      setLoadingResources(true);
      setResourceError(null);

      try {
        if (resource.source === 'catalog') {
          const fallbackPrimary = createCatalogResourceFromContext(resource);
          if (!fallbackPrimary) {
            throw new Error('Project context is missing catalog owner/repo details.');
          }

          const catalogResources = await resourceDownloader.listCatalogResources(
            resource.language ? { lang: resource.language, stage: 'prod' } : { stage: 'prod' }
          );

          const primary =
            catalogResources.find(
              item =>
                item.owner.toLowerCase() === fallbackPrimary.owner.toLowerCase() &&
                item.repo.toLowerCase() === fallbackPrimary.repo.toLowerCase()
            ) || fallbackPrimary;

          const [loadedSource, loadedSupport] = await Promise.all([
            resourceDownloader.loadCatalogSourceText(primary, book?.id),
            resourceDownloader.loadSupportBundle(primary, catalogResources),
          ]);

          if (cancelled) return;
          setSourceReference(
            `${loadedSource.resource.owner}/${loadedSource.resource.repo}:${loadedSource.path}`
          );
          setSourceVerses(parseSourceVerses(loadedSource.text));
          setUnresolvedRelations(loadedSupport.unresolvedRelations);
          setTnRows(loadedSupport.tn ? loadedSupport.tn.files.flatMap(file => file.rows) : []);
          setTwlRows(loadedSupport.twl ? loadedSupport.twl.files.flatMap(file => file.rows) : []);
          setTwArticles(loadedSupport.tw?.files || []);
          return;
        }

        const cachedResource = createCachedResourceFromContext(resource);
        if (!cachedResource) {
          throw new Error('Project context is missing local resource path.');
        }

        const cachedResources = await resourceDownloader.listCached();
        const primary =
          cachedResources.find(item => item.containerPath === cachedResource.containerPath) ||
          cachedResource;

        const [loadedSource, loadedSupport] = await Promise.all([
          resourceDownloader.loadCachedSourceText(primary, book?.id),
          resourceDownloader.loadCachedSupportBundle(primary, cachedResources),
        ]);

        if (cancelled) return;
        setSourceReference(loadedSource.path);
        setSourceVerses(parseSourceVerses(loadedSource.text));
        setUnresolvedRelations(loadedSupport.unresolvedRelations);
        setTnRows(loadedSupport.tn ? loadedSupport.tn.files.flatMap(file => file.rows) : []);
        setTwlRows(loadedSupport.twl ? loadedSupport.twl.files.flatMap(file => file.rows) : []);
        setTwArticles(loadedSupport.tw?.files || []);
      } catch (e) {
        if (cancelled) return;
        setSourceReference(null);
        setSourceVerses([]);
        setUnresolvedRelations([]);
        setTnRows([]);
        setTwlRows([]);
        setTwArticles([]);
        setResourceError(e instanceof Error ? e.message : 'Failed to preload project resources.');
      } finally {
        if (!cancelled) {
          setLoadingResources(false);
        }
      }
    };

    preloadResources();
    return () => {
      cancelled = true;
    };
  }, [
    book?.id,
    resource?.containerPath,
    resource?.id,
    resource?.language,
    resource?.name,
    resource?.owner,
    resource?.ref,
    resource?.repo,
    resource?.source,
    resource?.version,
  ]);

  const chapters = React.useMemo(
    () => Array.from(new Set(sourceVerses.map(item => item.chapter))).sort((a, b) => a - b),
    [sourceVerses]
  );

  React.useEffect(() => {
    if (chapters.length === 0) {
      setSelectedChapter(null);
      return;
    }
    setSelectedChapter(current => (current && chapters.includes(current) ? current : chapters[0]));
  }, [chapters]);

  const chapterVerses = React.useMemo(() => {
    if (selectedChapter == null) return [];
    return sourceVerses
      .filter(item => item.chapter === selectedChapter)
      .sort((a, b) => a.verse - b.verse);
  }, [selectedChapter, sourceVerses]);

  React.useEffect(() => {
    if (chapterVerses.length === 0) {
      setSelectedVerse(null);
      return;
    }
    setSelectedVerse(current =>
      current && chapterVerses.some(item => item.verse === current)
        ? current
        : chapterVerses[0].verse
    );
  }, [chapterVerses]);

  React.useEffect(() => {
    if (!draft || !book || selectedChapter == null || selectedVerse == null) {
      setTranslationText('');
      return;
    }
    setTranslationText(getVerseText(draft, book.id, selectedChapter, selectedVerse));
  }, [draft, book, selectedChapter, selectedVerse]);

  React.useEffect(() => {
    if (!projectId || !draft || editVersion === 0) return;

    let cancelled = false;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      const ok = await saveDraft(draft);
      if (cancelled) return;
      setSaveState(ok ? 'saved' : 'error');
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, editVersion, projectId]);

  const selectedSourceVerse = React.useMemo(() => {
    if (selectedChapter == null || selectedVerse == null) return null;
    return (
      sourceVerses.find(item => item.chapter === selectedChapter && item.verse === selectedVerse) ||
      null
    );
  }, [selectedChapter, selectedVerse, sourceVerses]);

  const tnForVerse = React.useMemo(() => {
    if (selectedChapter == null || selectedVerse == null) return [];
    return tnRows.filter(row => verseMatches(row, selectedChapter, selectedVerse));
  }, [selectedChapter, selectedVerse, tnRows]);

  const twlForVerse = React.useMemo(() => {
    if (selectedChapter == null || selectedVerse == null) return [];
    return twlRows.filter(row => verseMatches(row, selectedChapter, selectedVerse));
  }, [selectedChapter, selectedVerse, twlRows]);

  const twForVerse = React.useMemo(() => {
    const slugs = new Set(
      twlForVerse
        .map(item => item.twRcLink?.path?.split('/').pop()?.toLowerCase())
        .filter((item): item is string => Boolean(item))
    );
    if (slugs.size === 0) return twArticles.slice(0, 12);
    return twArticles.filter(item => (item.slug ? slugs.has(item.slug) : false));
  }, [twArticles, twlForVerse]);

  const bookProgress = React.useMemo(() => {
    if (!draft || !book)
      return { translatedCount: 0, sourceVerseCount: sourceVerses.length, percent: 0 };
    return summarizeBookDraft(draft, book.id, sourceVerses.length);
  }, [book, draft, sourceVerses.length]);

  const handleTranslationChange = (nextText: string) => {
    setTranslationText(nextText);
    if (!projectId || !book || selectedChapter == null || selectedVerse == null) return;
    setDraft(current => {
      const base = current || createEmptyDraft(projectId);
      return upsertVerseText(base, book.id, selectedChapter, selectedVerse, nextText);
    });
    setEditVersion(version => version + 1);
    setSaveState('idle');
  };

  const openReview = () => {
    if (!projectId) {
      navigate('/review');
      return;
    }
    navigate(`/review?projectId=${encodeURIComponent(projectId)}`);
  };

  return (
    <Box p={2} display='flex' flexDirection='column' style={{ gap: 12, height: '100%' }}>
      {!projectId && (
        <Alert severity='info'>
          Open a project from Home or create one in New Project to load translation context.
        </Alert>
      )}

      {projectError && <Alert severity='warning'>{projectError}</Alert>}
      {resourceError && <Alert severity='warning'>{resourceError}</Alert>}

      {(loadingProject || loadingResources) && (
        <Box display='flex' alignItems='center' style={{ gap: 8 }}>
          <CircularProgress size={18} />
          <Typography variant='body2'>
            {loadingProject
              ? 'Loading project context...'
              : 'Pre-loading source and support resources...'}
          </Typography>
        </Box>
      )}

      <Box display='flex' style={{ gap: 16, height: '100%' }}>
        <Paper style={{ width: 340, minWidth: 320, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Navigation</Typography>
          {project ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant='subtitle1'>{project.name}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {project.language} • {project.id}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                {book && <Chip label={`Book: ${book.name}`} size='small' color='primary' />}
                {resource && (
                  <Chip
                    label={`Resource: ${resource.name} (${resource.source})`}
                    size='small'
                    variant='outlined'
                  />
                )}
                <Chip
                  label={`Progress: ${bookProgress.translatedCount}/${bookProgress.sourceVerseCount} (${bookProgress.percent}%)`}
                  size='small'
                  variant='outlined'
                />
              </Box>
              <Button variant='outlined' size='small' sx={{ mt: 1.5 }} onClick={openReview}>
                Open Review
              </Button>
            </Box>
          ) : null}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant='subtitle2'>Chapters</Typography>
          <List dense sx={{ maxHeight: 120, overflow: 'auto' }}>
            {chapters.map(chapter => (
              <ListItemButton
                key={`chapter-${chapter}`}
                selected={selectedChapter === chapter}
                onClick={() => setSelectedChapter(chapter)}
              >
                <ListItemText primary={`Chapter ${chapter}`} />
              </ListItemButton>
            ))}
          </List>

          <Typography variant='subtitle2' sx={{ mt: 1 }}>
            Verses
          </Typography>
          <List dense sx={{ maxHeight: 260, overflow: 'auto' }}>
            {chapterVerses.map(verse => (
              <ListItemButton
                key={`verse-${verse.chapter}-${verse.verse}`}
                selected={selectedVerse === verse.verse}
                onClick={() => setSelectedVerse(verse.verse)}
              >
                <ListItemText primary={`${verse.chapter}:${verse.verse}`} />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Source Text</Typography>
          <Typography variant='body2' color='text.secondary'>
            {sourceReference ? `Source: ${sourceReference}` : 'No source loaded'}
          </Typography>
          {selectedSourceVerse ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant='subtitle2'>
                {selectedSourceVerse.chapter}:{selectedSourceVerse.verse}
              </Typography>
              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedSourceVerse.text}
              </Typography>
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              No verse selected.
            </Typography>
          )}
        </Paper>

        <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Support Resources</Typography>
          <Typography variant='body2' color='text.secondary'>
            TN: {tnRows.length} • TWL: {twlRows.length} • TW: {twArticles.length}
          </Typography>
          {unresolvedRelations.length > 0 && (
            <Typography variant='caption' color='warning.main'>
              Unresolved relations: {unresolvedRelations.join(', ')}
            </Typography>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant='subtitle2'>Translation Notes</Typography>
          {tnForVerse.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No TN rows for selected verse.
            </Typography>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              {tnForVerse.slice(0, 10).map((row, index) => (
                <Box key={`${row.id || 'tn'}:${index}`} sx={{ mb: 1 }}>
                  <Typography variant='caption' color='text.secondary'>
                    {row.reference || 'n/a'} • {row.id || 'no-id'}
                  </Typography>
                  <Typography variant='body2'>{row.note || row.quote || '(empty note)'}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant='subtitle2'>Translation Words Links</Typography>
          {twlForVerse.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No TWL rows for selected verse.
            </Typography>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              {twlForVerse.slice(0, 10).map((row, index) => (
                <Box key={`${row.id || 'twl'}:${index}`} sx={{ mb: 1 }}>
                  <Typography variant='caption' color='text.secondary'>
                    {row.reference || 'n/a'} • {row.id || 'no-id'}
                  </Typography>
                  <Typography variant='body2'>
                    {row.origWords || row.twLink || '(empty link)'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant='subtitle2'>Translation Words</Typography>
          {twForVerse.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No TW articles matched selected verse links.
            </Typography>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              {twForVerse.slice(0, 10).map((article, index) => (
                <Box key={`${article.path}:${index}`} sx={{ mb: 1 }}>
                  <Typography variant='caption' color='text.secondary'>
                    {article.category || 'general'} • {article.slug || article.path}
                  </Typography>
                  <Typography variant='body2'>{article.article.title || article.path}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Target Translation</Typography>
          <Typography variant='body2' color='text.secondary'>
            {selectedChapter != null && selectedVerse != null
              ? `Editing ${selectedChapter}:${selectedVerse}`
              : 'Select a verse to edit'}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Save state: {saveState}
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={18}
            maxRows={32}
            sx={{ mt: 1 }}
            value={translationText}
            onChange={event => handleTranslationChange(event.target.value)}
            placeholder='Enter translation text for the selected verse...'
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default TranslationScreen;
