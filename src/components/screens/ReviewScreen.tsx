import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ProjectContextRecord,
  ProjectRecord,
  projectRepository,
} from '../../services/projectRepository';
import {
  TranslationDraftDocument,
  DraftVerse,
  listBookVerses,
  loadDraft,
} from '../../services/translationDrafts';
import {
  ReviewStatus,
  ReviewDraftDocument,
  getReviewVerse,
  loadReviewDraft,
  saveReviewDraft,
  summarizeReviewBook,
  upsertReviewVerse,
} from '../../services/reviewDrafts';

function statusColor(status: ReviewStatus): 'default' | 'success' | 'warning' {
  if (status === 'approved') return 'success';
  if (status === 'needs-work') return 'warning';
  return 'default';
}

function statusLabel(status: ReviewStatus): string {
  if (status === 'approved') return 'Approved';
  if (status === 'needs-work') return 'Needs Work';
  return 'Pending';
}

const ReviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('projectId') || '';

  const [projects, setProjects] = React.useState<ProjectRecord[]>([]);
  const [project, setProject] = React.useState<ProjectRecord | null>(null);
  const [context, setContext] = React.useState<ProjectContextRecord | null>(null);
  const [draft, setDraft] = React.useState<TranslationDraftDocument | null>(null);
  const [reviewDraft, setReviewDraft] = React.useState<ReviewDraftDocument | null>(null);
  const [reviewNote, setReviewNote] = React.useState('');
  const [reviewVersion, setReviewVersion] = React.useState(0);
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedChapter, setSelectedChapter] = React.useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const loadProjects = async () => {
      const items = await projectRepository.listProjects();
      if (cancelled) return;
      setProjects(items);
      if (!selectedProjectId && items.length > 0) {
        setSearchParams({ projectId: items[0].id });
      }
    };
    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, setSearchParams]);

  React.useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setContext(null);
      setDraft(null);
      setReviewDraft(null);
      setSaveState('idle');
      setReviewVersion(0);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadReviewData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextProject, nextContext, nextDraft, nextReviewDraft] = await Promise.all([
          projectRepository.getProjectById(selectedProjectId),
          projectRepository.getProjectContext(selectedProjectId),
          loadDraft(selectedProjectId),
          loadReviewDraft(selectedProjectId),
        ]);
        if (cancelled) return;
        if (!nextProject) {
          setProject(null);
          setContext(null);
          setDraft(null);
          setReviewDraft(null);
          setSaveState('idle');
          setReviewVersion(0);
          setError(`Project ${selectedProjectId} was not found.`);
          return;
        }
        setProject(nextProject);
        setContext(nextContext);
        setDraft(nextDraft);
        setReviewDraft(nextReviewDraft);
        setSaveState('idle');
        setReviewVersion(0);
      } catch (e) {
        if (cancelled) return;
        setProject(null);
        setContext(null);
        setDraft(null);
        setReviewDraft(null);
        setSaveState('idle');
        setReviewVersion(0);
        setError(e instanceof Error ? e.message : 'Failed to load review data.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReviewData();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const handleProjectSelect = (event: SelectChangeEvent<string>) => {
    const projectId = event.target.value;
    if (!projectId) return;
    setSearchParams({ projectId });
  };

  const bookId = context?.context.book.id || '';
  const verses = React.useMemo(
    () => (draft && bookId ? listBookVerses(draft, bookId) : []),
    [bookId, draft]
  );

  const chapters = React.useMemo(
    () => Array.from(new Set(verses.map(item => item.chapter))).sort((a, b) => a - b),
    [verses]
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
    return verses
      .filter(item => item.chapter === selectedChapter)
      .sort((a, b) => a.verse - b.verse);
  }, [selectedChapter, verses]);

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

  const selectedDraftVerse = React.useMemo(() => {
    if (selectedChapter == null || selectedVerse == null) return null;
    return (
      chapterVerses.find(
        item => item.chapter === selectedChapter && item.verse === selectedVerse
      ) || null
    );
  }, [chapterVerses, selectedChapter, selectedVerse]);

  const selectedReviewVerse = React.useMemo(() => {
    if (!reviewDraft || !bookId || selectedChapter == null || selectedVerse == null) return null;
    return getReviewVerse(reviewDraft, bookId, selectedChapter, selectedVerse);
  }, [bookId, reviewDraft, selectedChapter, selectedVerse]);

  React.useEffect(() => {
    setReviewNote(selectedReviewVerse?.note || '');
  }, [selectedReviewVerse?.chapter, selectedReviewVerse?.note, selectedReviewVerse?.verse]);

  React.useEffect(() => {
    if (!selectedProjectId || !reviewDraft || reviewVersion === 0) return;

    let cancelled = false;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      const ok = await saveReviewDraft(reviewDraft);
      if (cancelled) return;
      setSaveState(ok ? 'saved' : 'error');
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reviewDraft, reviewVersion, selectedProjectId]);

  const reviewSummary = React.useMemo(() => {
    if (!reviewDraft || !bookId) {
      return { approvedCount: 0, needsWorkCount: 0, pendingCount: 0 };
    }
    return summarizeReviewBook(reviewDraft, bookId);
  }, [bookId, reviewDraft]);

  const updateSelectedVerseReview = (status: ReviewStatus, note: string) => {
    if (!reviewDraft || !bookId || selectedChapter == null || selectedVerse == null) return;
    const next = upsertReviewVerse(reviewDraft, bookId, selectedChapter, selectedVerse, {
      status,
      note,
    });
    setReviewDraft(next);
    setReviewVersion(v => v + 1);
  };

  const statusForVerse = (verse: DraftVerse): ReviewStatus => {
    if (!reviewDraft || !bookId) return 'pending';
    const entry = getReviewVerse(reviewDraft, bookId, verse.chapter, verse.verse);
    return entry?.status || 'pending';
  };

  const openTranslate = () => {
    if (!selectedProjectId) {
      navigate('/translate');
      return;
    }
    navigate(`/translate?projectId=${encodeURIComponent(selectedProjectId)}`);
  };

  return (
    <Box p={3} display='flex' flexDirection='column' gap={3}>
      <Typography variant='h5'>Review Queue</Typography>

      <FormControl sx={{ minWidth: 320, maxWidth: 520 }}>
        <InputLabel>Project</InputLabel>
        <Select value={selectedProjectId} onChange={handleProjectSelect} label='Project'>
          {projects.map(item => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity='warning'>{error}</Alert>}
      {loading && <Alert severity='info'>Loading review data...</Alert>}

      {project && (
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <Typography variant='subtitle1'>{project.name}</Typography>
              <Chip label={`${verses.length} translated`} size='small' />
            </Box>

            <Typography variant='body2' color='text.secondary'>
              Language: {project.language.toUpperCase()} • Book:{' '}
              {context?.context.book.name || 'Unknown'}
            </Typography>

            <Box display='flex' gap={1} flexWrap='wrap'>
              <Chip
                label={`Approved ${reviewSummary.approvedCount}`}
                size='small'
                color='success'
              />
              <Chip
                label={`Needs Work ${reviewSummary.needsWorkCount}`}
                size='small'
                color='warning'
              />
              <Chip label={`Pending ${reviewSummary.pendingCount}`} size='small' />
            </Box>

            <Box>
              <Button variant='outlined' size='small' onClick={openTranslate}>
                Open In Translate
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {chapters.length > 0 && (
        <Box display='flex' gap={1} flexWrap='wrap'>
          {chapters.map(chapter => (
            <Button
              key={`review-chapter-${chapter}`}
              size='small'
              variant={chapter === selectedChapter ? 'contained' : 'outlined'}
              onClick={() => setSelectedChapter(chapter)}
            >
              Chapter {chapter}
            </Button>
          ))}
        </Box>
      )}

      <Box display='grid' gridTemplateColumns={{ xs: '1fr', md: '360px 1fr' }} gap={2}>
        <Card>
          <CardContent>
            <Typography variant='subtitle1' gutterBottom>
              Review Queue
            </Typography>
            {chapterVerses.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                No saved translation draft entries found for this chapter.
              </Typography>
            ) : (
              <List dense>
                {chapterVerses.map(item => {
                  const verseStatus = statusForVerse(item);
                  return (
                    <ListItemButton
                      key={`${item.chapter}:${item.verse}`}
                      selected={item.verse === selectedVerse}
                      onClick={() => setSelectedVerse(item.verse)}
                    >
                      <ListItemText
                        primary={`${item.chapter}:${item.verse}`}
                        secondary={item.text.slice(0, 84)}
                      />
                      <Chip
                        label={statusLabel(verseStatus)}
                        size='small'
                        color={statusColor(verseStatus)}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant='subtitle1'>Selected Verse</Typography>
            {!selectedDraftVerse ? (
              <Typography variant='body2' color='text.secondary'>
                Select a verse from the review queue.
              </Typography>
            ) : (
              <>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                  <Typography variant='body2'>
                    {selectedDraftVerse.chapter}:{selectedDraftVerse.verse}
                  </Typography>
                  <Chip
                    label={statusLabel(selectedReviewVerse?.status || 'pending')}
                    size='small'
                    color={statusColor(selectedReviewVerse?.status || 'pending')}
                  />
                </Box>

                <Alert severity='info'>
                  {selectedDraftVerse.text.trim() ||
                    '(No translation text entered for this verse.)'}
                </Alert>

                <TextField
                  label='Reviewer Note'
                  multiline
                  minRows={4}
                  value={reviewNote}
                  onChange={event => setReviewNote(event.target.value)}
                />

                <Box display='flex' gap={1} flexWrap='wrap'>
                  <Button
                    size='small'
                    variant='outlined'
                    color='success'
                    onClick={() => updateSelectedVerseReview('approved', reviewNote)}
                  >
                    Approve Verse
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    color='warning'
                    onClick={() => updateSelectedVerseReview('needs-work', reviewNote)}
                  >
                    Mark Needs Work
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => updateSelectedVerseReview('pending', reviewNote)}
                  >
                    Reset Pending
                  </Button>
                  <Button
                    size='small'
                    variant='contained'
                    onClick={() =>
                      updateSelectedVerseReview(
                        selectedReviewVerse?.status || 'pending',
                        reviewNote
                      )
                    }
                  >
                    Save Note
                  </Button>
                </Box>

                {saveState === 'saving' && (
                  <Typography variant='caption' color='text.secondary'>
                    Saving review...
                  </Typography>
                )}
                {saveState === 'saved' && (
                  <Typography variant='caption' color='success.main'>
                    Review saved.
                  </Typography>
                )}
                {saveState === 'error' && (
                  <Typography variant='caption' color='error.main'>
                    Failed to save review draft.
                  </Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ReviewScreen;
