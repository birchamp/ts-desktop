import React from 'react';
import { Alert, Box, Chip, CircularProgress, Divider, Paper, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  ProjectContextRecord,
  ProjectRecord,
  ProjectResourceContext,
  projectRepository,
} from '../../services/projectRepository';
import {
  CatalogResource,
  CachedResource,
  LoadedCatalogSourceText,
  LoadedSupportBundle,
  ParsedTwArticle,
  resourceDownloader,
} from '../../services/dcs/downloader';
import { TnTsvRow, TwlTsvRow } from '../../services/dcs/resourceSchema';

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

function matchesBook(candidate: string, bookId: string): boolean {
  const normalizedCandidate = candidate.trim().toLowerCase();
  const normalizedBook = bookId.trim().toLowerCase();
  if (!normalizedCandidate || !normalizedBook) return false;
  if (normalizedCandidate === normalizedBook) return true;
  const escapedBookId = normalizedBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const separatorPattern = new RegExp(`(^|[._\\-/])${escapedBookId}([._\\-/]|$)`, 'i');
  return separatorPattern.test(normalizedCandidate);
}

function rowsForBook<R>(
  files: Array<{ identifier: string; path: string; rows: R[] }> | undefined | null,
  bookId?: string
): R[] {
  if (!files || files.length === 0) return [];
  if (!bookId) return files.flatMap(file => file.rows);
  const matched = files.filter(
    file => matchesBook(file.identifier, bookId) || matchesBook(file.path, bookId)
  );
  return (matched.length > 0 ? matched : files).flatMap(file => file.rows);
}

function trimSourcePreview(text: string): string {
  const maxLines = 140;
  const lines = text.split(/\r?\n/);
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join('\n')}\n\n...source truncated for preview...`;
}

const TranslationScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [loadingProject, setLoadingProject] = React.useState(false);
  const [projectError, setProjectError] = React.useState<string | null>(null);
  const [project, setProject] = React.useState<ProjectRecord | null>(null);
  const [projectContext, setProjectContext] = React.useState<ProjectContextRecord | null>(null);
  const [loadingResources, setLoadingResources] = React.useState(false);
  const [resourceError, setResourceError] = React.useState<string | null>(null);
  const [resourceNotice, setResourceNotice] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<LoadedCatalogSourceText | null>(null);
  const [cachedSourcePath, setCachedSourcePath] = React.useState<string | null>(null);
  const [cachedSourceBookId, setCachedSourceBookId] = React.useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = React.useState<string | null>(null);
  const [supportBundle, setSupportBundle] = React.useState<LoadedSupportBundle | null>(null);
  const [tnRows, setTnRows] = React.useState<TnTsvRow[]>([]);
  const [twlRows, setTwlRows] = React.useState<TwlTsvRow[]>([]);
  const [twArticles, setTwArticles] = React.useState<ParsedTwArticle[]>([]);

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

  const context = projectContext?.context;
  const book = context?.book;
  const resource = context?.resource;
  const supportSummary = context?.supportSummary;

  React.useEffect(() => {
    if (!resource || resource.source === 'none') {
      setLoadingResources(false);
      setResourceError(null);
      setResourceNotice(null);
      setSource(null);
      setCachedSourcePath(null);
      setCachedSourceBookId(null);
      setSourcePreview(null);
      setSupportBundle(null);
      setTnRows([]);
      setTwlRows([]);
      setTwArticles([]);
      return;
    }

    let cancelled = false;
    const preloadResources = async () => {
      setLoadingResources(true);
      setResourceError(null);
      setResourceNotice(null);

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

          setSource(loadedSource);
          setCachedSourcePath(null);
          setCachedSourceBookId(null);
          setSourcePreview(trimSourcePreview(loadedSource.text));
          setSupportBundle(loadedSupport);
          setTnRows(rowsForBook(loadedSupport.tn?.files, book?.id));
          setTwlRows(rowsForBook(loadedSupport.twl?.files, book?.id));
          setTwArticles(loadedSupport.tw?.files || []);
          return;
        }

        const cachedResource = createCachedResourceFromContext(resource);
        if (!cachedResource) {
          throw new Error('Project context is missing local resource path.');
        }

        const loadedSource = await resourceDownloader.loadCachedSourceText(
          cachedResource,
          book?.id
        );
        if (cancelled) return;

        setSource(null);
        setCachedSourcePath(loadedSource.path);
        setCachedSourceBookId(loadedSource.bookId);
        setSourcePreview(trimSourcePreview(loadedSource.text));
        setSupportBundle(null);
        setTnRows([]);
        setTwlRows([]);
        setTwArticles([]);
        setResourceNotice(
          'TN/TWL/TW pre-loading is currently available for Door43 catalog resources.'
        );
      } catch (e) {
        if (cancelled) return;
        setSource(null);
        setCachedSourcePath(null);
        setCachedSourceBookId(null);
        setSourcePreview(null);
        setSupportBundle(null);
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

  return (
    <Box p={2} display='flex' flexDirection='column' style={{ gap: 12, height: '100%' }}>
      {!projectId && (
        <Alert severity='info'>
          Open a project from Home or create one in New Project to load translation context.
        </Alert>
      )}

      {projectError && <Alert severity='warning'>{projectError}</Alert>}
      {resourceError && <Alert severity='warning'>{resourceError}</Alert>}
      {resourceNotice && <Alert severity='info'>{resourceNotice}</Alert>}

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
        <Paper style={{ width: 320, minWidth: 280, padding: 12, overflow: 'auto' }}>
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
                {supportSummary && (
                  <Chip
                    label={`TN ${supportSummary.tnRows} • TWL ${supportSummary.twlRows} • TW ${supportSummary.twArticles}`}
                    size='small'
                    variant='outlined'
                  />
                )}
              </Box>
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              Book/Chapter/Verse
            </Typography>
          )}
        </Paper>

        <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Source Text</Typography>
          {sourcePreview ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 0.75 }}>
                {source
                  ? `Loaded from ${source.resource.owner}/${source.resource.repo} (${source.path})`
                  : `Loaded from local cache (${cachedSourcePath})`}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                Book: {source?.bookId || cachedSourceBookId || book?.id || 'unknown'}
              </Typography>
              <Box
                component='pre'
                sx={{
                  m: 0,
                  p: 1.25,
                  bgcolor: '#f7f7f7',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.35,
                }}
              >
                {sourcePreview}
              </Box>
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              Source text will load after selecting a project with a resource context.
            </Typography>
          )}
        </Paper>

        <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Support Resources</Typography>
          <Typography variant='body2' color='text.secondary'>
            TN: {tnRows.length} • TWL: {twlRows.length} • TW: {twArticles.length}
          </Typography>
          {supportBundle?.unresolvedRelations?.length ? (
            <Typography variant='caption' color='warning.main'>
              Unresolved relations: {supportBundle.unresolvedRelations.join(', ')}
            </Typography>
          ) : null}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant='subtitle2'>Translation Notes</Typography>
          {tnRows.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No TN rows loaded for this book.
            </Typography>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              {tnRows.slice(0, 12).map((row, index) => (
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
          {twlRows.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No TWL rows loaded for this book.
            </Typography>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              {twlRows.slice(0, 12).map((row, index) => (
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
          {twArticles.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No TW articles loaded.
            </Typography>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              {twArticles.slice(0, 12).map((article, index) => (
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
            Placeholder target editor...
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default TranslationScreen;
