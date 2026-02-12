const fs = require('fs');
const os = require('os');
const path = require('path');

const DOWNLOADER_PATH = path.join(
  process.cwd(),
  'src/services/dcs/downloader.ts'
);
const NET_PATH = path.join(process.cwd(), 'src/utils/net.ts');

function toBase64(content) {
  return Buffer.from(content, 'utf8').toString('base64');
}

function rcManifestYaml({
  identifier,
  language = 'en',
  subject,
  version = '1',
  relation = [],
  projects = [],
}) {
  const relationBlock = relation.map(item => `    - '${item}'`).join('\n');
  const projectsBlock = projects
    .map(project => {
      const sortLine = Number.isFinite(project.sort) ? `\n    sort: ${project.sort}` : '';
      return [
        '  -',
        `    identifier: '${project.identifier}'`,
        `    path: './${project.path}'`,
        sortLine,
      ]
        .join('\n')
        .trimEnd();
    })
    .join('\n');

  return [
    'dublin_core:',
    "  conformsto: 'rc0.2'",
    `  identifier: '${identifier}'`,
    '  language:',
    `    identifier: '${language}'`,
    `  subject: '${subject}'`,
    `  version: '${version}'`,
    '  relation:',
    relationBlock || "    - 'en/none'",
    'projects:',
    projectsBlock || "  -\n    identifier: 'gen'\n    path: './placeholder.tsv'",
    '',
  ].join('\n');
}

function createResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : String(status),
    headers: {},
    data,
  };
}

function createNetMock(handlers) {
  return jest.fn(async url => {
    const parsed = new URL(url);
    const request = {
      url,
      pathname: parsed.pathname,
      params: parsed.searchParams,
    };
    for (const handler of handlers) {
      if (handler.when(request)) {
        return handler.reply(request);
      }
    }
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {},
      data: null,
      error: `No mock matched: ${url}`,
    };
  });
}

function installElectronBridgeMock(options = {}) {
  const userDataPath = options.userDataPath || null;
  global.window = global.window || {};
  global.window.electronAPI = {
    app: {
      getUserDataPath: jest.fn(async () => userDataPath),
    },
    fs: {
      listAbsoluteEntries: jest.fn(async absPath => {
        try {
          const entries = await fs.promises.readdir(String(absPath), { withFileTypes: true });
          return entries.map(entry => ({
            name: entry.name,
            isFile: entry.isFile(),
            isDirectory: entry.isDirectory(),
          }));
        } catch {
          return [];
        }
      }),
      readAbsoluteText: jest.fn(async absPath => {
        try {
          return await fs.promises.readFile(String(absPath), 'utf8');
        } catch {
          return null;
        }
      }),
    },
  };
}

function loadDownloaderWithNetMock(getMock, options = {}) {
  jest.resetModules();
  jest.doMock(NET_PATH, () => ({ get: getMock }));
  installElectronBridgeMock(options);
  const { resourceDownloader } = require(DOWNLOADER_PATH);
  return resourceDownloader;
}

describe('DCS downloader integration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    if (global.window) {
      delete global.window.electronAPI;
    }
  });

  test('listCatalogResources includes manifest-derived relations and metadata', async () => {
    const manifest = rcManifestYaml({
      identifier: 'ult',
      subject: 'Aligned Bible',
      version: '86',
      relation: ['en/tn', 'en/twl', 'en/tw'],
      projects: [{ identifier: 'gen', path: '01-GEN.usfm', sort: 1 }],
    });

    const getMock = createNetMock([
      {
        when: req =>
          req.pathname === '/api/v1/catalog/search' &&
          req.params.get('subject') === 'Aligned Bible' &&
          req.params.get('stage') === 'prod',
        reply: () =>
          createResponse([
            {
              title: 'English ULT',
              subject: 'Aligned Bible',
              lang: 'en',
              repo: {
                name: 'en_ult',
                full_name: 'unfoldingWord/en_ult',
                default_branch: 'master',
              },
              owner: { username: 'unfoldingWord' },
            },
          ]),
      },
      {
        when: req => req.pathname === '/api/v1/repos/unfoldingWord/en_ult/contents',
        reply: () =>
          createResponse([{ name: 'manifest.yaml', path: 'manifest.yaml', type: 'file' }]),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_ult/contents/manifest.yaml',
        reply: () =>
          createResponse({
            name: 'manifest.yaml',
            path: 'manifest.yaml',
            type: 'file',
            encoding: 'base64',
            content: toBase64(manifest),
          }),
      },
    ]);

    const downloader = loadDownloaderWithNetMock(getMock);
    const resources = await downloader.listCatalogResources({ subject: 'Aligned Bible' });

    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({
      id: 'en_ult',
      repo: 'en_ult',
      owner: 'unfoldingWord',
      language: 'en',
      subject: 'Aligned Bible',
      version: '86',
      manifestType: 'resource-container',
    });
    expect(resources[0].relation).toEqual(['en/tn', 'en/twl', 'en/tw']);
  });

  test('loadParsedTnResource parses TN TSV files using manifest project paths', async () => {
    const manifest = rcManifestYaml({
      identifier: 'tn',
      subject: 'Translation Notes',
      relation: ['en/ult', 'en/ust', 'en/ta'],
      projects: [
        { identifier: 'gen', path: 'tn_GEN.tsv', sort: 1 },
        { identifier: 'exo', path: 'tn_EXO.tsv', sort: 2 },
      ],
    });
    const tnGen = [
      'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote',
      '1:1\tabc1\tgrammar\trc://en/ta/man/translate/figs-metaphor\tδοῦλος\t1\tFirst TN note',
    ].join('\n');
    const tnExo = [
      'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote',
      '1:2\tdef2\tculture\trc://en/ta/man/translate/translate-names\tX\t1\tSecond TN note',
    ].join('\n');

    const getMock = createNetMock([
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tn/contents' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse([{ name: 'manifest.yaml', path: 'manifest.yaml', type: 'file' }]),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tn/contents/manifest.yaml' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse({
            name: 'manifest.yaml',
            path: 'manifest.yaml',
            type: 'file',
            encoding: 'base64',
            content: toBase64(manifest),
          }),
      },
      {
        when: req =>
          req.pathname === '/unfoldingWord/en_tn/raw/branch/master/tn_GEN.tsv',
        reply: () => createResponse(tnGen),
      },
      {
        when: req =>
          req.pathname === '/unfoldingWord/en_tn/raw/branch/master/tn_EXO.tsv',
        reply: () => createResponse(tnExo),
      },
    ]);

    const downloader = loadDownloaderWithNetMock(getMock);
    const loaded = await downloader.loadParsedTnResource({
      id: 'en_tn',
      name: 'English TN',
      owner: 'unfoldingWord',
      repo: 'en_tn',
      version: '1',
      language: 'en',
      relation: [],
      ref: 'master',
    });

    expect(loaded.files).toHaveLength(2);
    expect(loaded.files[0].rows[0].id).toBe('abc1');
    expect(loaded.files[0].rows[0].supportRcLink).toMatchObject({
      language: 'en',
      resource: 'ta',
      container: 'man',
      path: 'translate/figs-metaphor',
    });
  });

  test('loadSupportBundle resolves relations and parses TN/TWL/TW resources', async () => {
    const tnManifest = rcManifestYaml({
      identifier: 'tn',
      subject: 'Translation Notes',
      projects: [{ identifier: 'gen', path: 'tn_GEN.tsv', sort: 1 }],
    });
    const twlManifest = rcManifestYaml({
      identifier: 'twl',
      subject: 'Translation Words Links',
      projects: [{ identifier: 'gen', path: 'twl_GEN.tsv', sort: 1 }],
    });
    const twManifest = rcManifestYaml({
      identifier: 'tw',
      subject: 'Translation Words',
      projects: [{ identifier: 'dict', path: 'bible', sort: 1 }],
    });

    const tnTsv = [
      'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote',
      '1:1\tab1\tgrammar\trc://en/ta/man/translate/figs-metaphor\tδοῦλος\t1\tTN note',
    ].join('\n');
    const twlTsv = [
      'Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink',
      '1:1\ttw1\tkt\tλόγος\t1\trc://*/tw/dict/bible/kt/faith',
    ].join('\n');
    const twMd = [
      '# faith',
      '',
      '## Definition',
      'Trust in God.',
      '',
      '## Translation Suggestions',
      'Use a natural term for confidence.',
      '',
    ].join('\n');

    const getMock = createNetMock([
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tn/contents' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse([{ name: 'manifest.yaml', path: 'manifest.yaml', type: 'file' }]),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tn/contents/manifest.yaml' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse({
            name: 'manifest.yaml',
            path: 'manifest.yaml',
            type: 'file',
            encoding: 'base64',
            content: toBase64(tnManifest),
          }),
      },
      {
        when: req =>
          req.pathname === '/unfoldingWord/en_tn/raw/branch/master/tn_GEN.tsv',
        reply: () => createResponse(tnTsv),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_twl/contents' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse([{ name: 'manifest.yaml', path: 'manifest.yaml', type: 'file' }]),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_twl/contents/manifest.yaml' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse({
            name: 'manifest.yaml',
            path: 'manifest.yaml',
            type: 'file',
            encoding: 'base64',
            content: toBase64(twlManifest),
          }),
      },
      {
        when: req =>
          req.pathname === '/unfoldingWord/en_twl/raw/branch/master/twl_GEN.tsv',
        reply: () => createResponse(twlTsv),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tw/contents' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse([{ name: 'manifest.yaml', path: 'manifest.yaml', type: 'file' }]),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tw/contents/manifest.yaml' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse({
            name: 'manifest.yaml',
            path: 'manifest.yaml',
            type: 'file',
            encoding: 'base64',
            content: toBase64(twManifest),
          }),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tw/contents/bible' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse([{ name: 'kt', path: 'bible/kt', type: 'dir' }]),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_tw/contents/bible/kt' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse([{ name: 'faith.md', path: 'bible/kt/faith.md', type: 'file' }]),
      },
      {
        when: req =>
          req.pathname === '/unfoldingWord/en_tw/raw/branch/master/bible/kt/faith.md',
        reply: () => createResponse(twMd),
      },
    ]);

    const downloader = loadDownloaderWithNetMock(getMock);

    const primary = {
      id: 'en_ult',
      name: 'English ULT',
      owner: 'unfoldingWord',
      repo: 'en_ult',
      version: '1',
      language: 'en',
      subject: 'Aligned Bible',
      relation: ['en/tn', 'en/twl', 'en/tw', 'en/ta'],
      ref: 'master',
    };
    const resources = [
      primary,
      {
        id: 'en_tn',
        name: 'English TN',
        owner: 'unfoldingWord',
        repo: 'en_tn',
        version: '1',
        language: 'en',
        subject: 'Translation Notes',
        relation: [],
        ref: 'master',
      },
      {
        id: 'en_twl',
        name: 'English TWL',
        owner: 'unfoldingWord',
        repo: 'en_twl',
        version: '1',
        language: 'en',
        subject: 'Translation Words Links',
        relation: [],
        ref: 'master',
      },
      {
        id: 'en_tw',
        name: 'English TW',
        owner: 'unfoldingWord',
        repo: 'en_tw',
        version: '1',
        language: 'en',
        subject: 'Translation Words',
        relation: [],
        ref: 'master',
      },
    ];

    const bundle = await downloader.loadSupportBundle(primary, resources);

    expect(bundle.tn).not.toBeNull();
    expect(bundle.twl).not.toBeNull();
    expect(bundle.tw).not.toBeNull();
    expect(bundle.tn.files[0].rows[0].id).toBe('ab1');
    expect(bundle.twl.files[0].rows[0].twRcLink).toMatchObject({
      resource: 'tw',
      container: 'dict',
      path: 'bible/kt/faith',
    });
    expect(bundle.tw.files[0]).toMatchObject({
      path: 'bible/kt/faith.md',
      category: 'kt',
      slug: 'faith',
    });
    expect(bundle.unresolvedRelations).toContain('en/ta');
  });

  test('loadCatalogSourceText selects the requested book from manifest projects', async () => {
    const sourceManifest = rcManifestYaml({
      identifier: 'ult',
      subject: 'Aligned Bible',
      projects: [
        { identifier: 'gen', path: '01-GEN.usfm', sort: 1 },
        { identifier: 'exo', path: '02-EXO.usfm', sort: 2 },
      ],
    });
    const exoUsfm = ['\\id EXO', '\\c 1', '\\v 1 Source verse one'].join('\n');

    const getMock = createNetMock([
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_ult/contents' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse([{ name: 'manifest.yaml', path: 'manifest.yaml', type: 'file' }]),
      },
      {
        when: req =>
          req.pathname === '/api/v1/repos/unfoldingWord/en_ult/contents/manifest.yaml' &&
          req.params.get('ref') === 'master',
        reply: () =>
          createResponse({
            name: 'manifest.yaml',
            path: 'manifest.yaml',
            type: 'file',
            encoding: 'base64',
            content: toBase64(sourceManifest),
          }),
      },
      {
        when: req =>
          req.pathname === '/unfoldingWord/en_ult/raw/branch/master/02-EXO.usfm',
        reply: () => createResponse(exoUsfm),
      },
    ]);

    const downloader = loadDownloaderWithNetMock(getMock);
    const loaded = await downloader.loadCatalogSourceText(
      {
        id: 'en_ult',
        name: 'English ULT',
        owner: 'unfoldingWord',
        repo: 'en_ult',
        version: '1',
        language: 'en',
        relation: [],
        ref: 'master',
      },
      'exo'
    );

    expect(loaded).toMatchObject({
      bookId: 'exo',
      path: '02-EXO.usfm',
    });
    expect(loaded.text).toContain('\\id EXO');
  });

  test('loadCachedSourceText and loadCachedSupportBundle parse local linked resources', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdcs-cached-'));
    const write = (relPath, content) => {
      const absPath = path.join(tempRoot, relPath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, content, 'utf8');
      return absPath;
    };

    const ultManifest = rcManifestYaml({
      identifier: 'ult',
      subject: 'Aligned Bible',
      relation: ['en/tn', 'en/twl', 'en/tw'],
      projects: [
        { identifier: 'gen', path: '01-GEN.usfm', sort: 1 },
        { identifier: 'exo', path: '02-EXO.usfm', sort: 2 },
      ],
    });
    const tnManifest = rcManifestYaml({
      identifier: 'tn',
      subject: 'Translation Notes',
      projects: [{ identifier: 'gen', path: 'tn_GEN.tsv', sort: 1 }],
    });
    const twlManifest = rcManifestYaml({
      identifier: 'twl',
      subject: 'Translation Words Links',
      projects: [{ identifier: 'gen', path: 'twl_GEN.tsv', sort: 1 }],
    });
    const twManifest = rcManifestYaml({
      identifier: 'tw',
      subject: 'Translation Words',
      projects: [{ identifier: 'dict', path: 'bible', sort: 1 }],
    });

    const ultPath = path.join(tempRoot, 'en_ult');
    const tnPath = path.join(tempRoot, 'en_tn');
    const twlPath = path.join(tempRoot, 'en_twl');
    const twPath = path.join(tempRoot, 'en_tw');

    write('en_ult/manifest.yaml', ultManifest);
    write('en_ult/01-GEN.usfm', ['\\id GEN', '\\c 1', '\\v 1 Genesis verse'].join('\n'));
    write('en_ult/02-EXO.usfm', ['\\id EXO', '\\c 1', '\\v 1 Exodus verse'].join('\n'));
    write('en_tn/manifest.yaml', tnManifest);
    write(
      'en_tn/tn_GEN.tsv',
      [
        'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote',
        '1:1\tab1\tgrammar\trc://en/ta/man/translate/figs-metaphor\tδοῦλος\t1\tTN note',
      ].join('\n')
    );
    write('en_twl/manifest.yaml', twlManifest);
    write(
      'en_twl/twl_GEN.tsv',
      [
        'Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink',
        '1:1\ttw1\tkt\tλόγος\t1\trc://*/tw/dict/bible/kt/faith',
      ].join('\n')
    );
    write('en_tw/manifest.yaml', twManifest);
    write(
      'en_tw/bible/kt/faith.md',
      ['# faith', '', '## Definition', 'Trust in God.', ''].join('\n')
    );

    const getMock = jest.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {},
      data: null,
      error: 'network not expected',
    }));

    const downloader = loadDownloaderWithNetMock(getMock);
    const resources = [
      {
        id: 'en_ult',
        name: 'English ULT',
        owner: 'unfoldingWord',
        version: '1',
        language: 'en',
        relations: ['en/tn', 'en/twl', 'en/tw'],
        containerPath: ultPath,
      },
      {
        id: 'en_tn',
        name: 'English TN',
        owner: 'unfoldingWord',
        version: '1',
        language: 'en',
        relations: [],
        containerPath: tnPath,
      },
      {
        id: 'en_twl',
        name: 'English TWL',
        owner: 'unfoldingWord',
        version: '1',
        language: 'en',
        relations: [],
        containerPath: twlPath,
      },
      {
        id: 'en_tw',
        name: 'English TW',
        owner: 'unfoldingWord',
        version: '1',
        language: 'en',
        relations: [],
        containerPath: twPath,
      },
    ];

    const loadedSource = await downloader.loadCachedSourceText(resources[0], 'exo');
    expect(loadedSource).toMatchObject({
      bookId: 'exo',
      path: '02-EXO.usfm',
    });
    expect(loadedSource.text).toContain('\\id EXO');

    const bundle = await downloader.loadCachedSupportBundle(resources[0], resources);
    expect(bundle.tn).not.toBeNull();
    expect(bundle.twl).not.toBeNull();
    expect(bundle.tw).not.toBeNull();
    expect(bundle.tn.files[0].rows[0].id).toBe('ab1');
    expect(bundle.twl.files[0].rows[0].id).toBe('tw1');
    expect(bundle.tw.files[0].slug).toBe('faith');
    expect(bundle.unresolvedRelations).toEqual([]);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
