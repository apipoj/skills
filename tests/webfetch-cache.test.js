const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  CACHE_TTL_MS,
  MAX_CONTENT_BYTES,
  MAX_ENTRY_BYTES,
  normalizeUrl,
  cacheKey,
  cacheDir,
  cacheFile,
  extractContent,
  preCheck,
  postStore
} = require('../plugins/spk/scripts/webfetch-cache.cjs');

const URL = 'https://example.com/docs/api';
const PROMPT = 'summarize the auth section';
const NOW_MS = 1780963200000;

function makeCacheDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wfc-'));
}

function cacheOpts(dir, overrides = {}) {
  return { env: {}, cacheDir: dir, now: NOW_MS, ...overrides };
}

function fileFor(dir, url = URL, prompt = PROMPT) {
  return cacheFile(url, prompt, {}, { cacheDir: dir });
}

function validEntry(overrides = {}) {
  return {
    url: URL,
    prompt: PROMPT,
    content: 'Auth uses bearer tokens.',
    fetched_at: NOW_MS / 1000,
    ...overrides
  };
}

function trySymlink(target, link, type) {
  try {
    fs.symlinkSync(target, link, type);
    return true;
  } catch (error) {
    if (error && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return false;
    throw error;
  }
}

function fetchEvent(overrides = {}) {
  return {
    tool_input: { url: URL, prompt: PROMPT },
    tool_response: { result: 'Auth uses bearer tokens.', bytes: 123, code: 200 },
    ...overrides
  };
}

describe('webfetch-cache', () => {
  describe('cache placement', () => {
    test('uses the canonical Claude project root and ignores env cache redirection', async () => {
      const claudeRoot = makeCacheDir();
      const codexRoot = makeCacheDir();
      const attackerDir = makeCacheDir();
      const env = {
        CLAUDE_PROJECT_DIR: claudeRoot,
        CODEX_PROJECT_DIR: codexRoot,
        SPK_WEBFETCH_CACHE_DIR: attackerDir
      };

      const expected = path.join(
        fs.realpathSync(claudeRoot),
        '.claude',
        'spk-webfetch-cache'
      );
      expect(cacheDir(env)).toBe(expected);

      const result = await postStore(fetchEvent(), { env, now: NOW_MS });
      expect(result.stored).toBe(true);
      expect(fs.existsSync(cacheFile(URL, PROMPT, env))).toBe(true);
      expect(fs.readdirSync(attackerDir)).toEqual([]);
      expect(fs.readdirSync(codexRoot)).toEqual([]);
    });

    test('uses the canonical Codex project root when no Claude root is present', () => {
      const codexRoot = makeCacheDir();
      expect(cacheDir({ CODEX_PROJECT_DIR: codexRoot })).toBe(path.join(
        fs.realpathSync(codexRoot),
        '.claude',
        'spk-webfetch-cache'
      ));
    });
  });

  describe('cache identity', () => {
    test('normalizes safe HTTP URLs and rejects unsupported or credentialed URLs', () => {
      expect(normalizeUrl('HTTPS://EXAMPLE.COM:443/docs/api#auth')).toBe(URL);
      expect(normalizeUrl('http://example.com:80/')).toBe('http://example.com/');
      expect(normalizeUrl('file:///tmp/secret')).toBeNull();
      expect(normalizeUrl('https://user:pass@example.com/')).toBeNull();
      expect(normalizeUrl('not a url')).toBeNull();
    });

    test('keys by normalized URL and exact prompt', () => {
      expect(cacheKey(URL, PROMPT)).toMatch(/^[0-9a-f]{32}$/);
      expect(cacheKey(URL, PROMPT)).toBe(
        cacheKey('HTTPS://EXAMPLE.COM:443/docs/api#auth', PROMPT)
      );
      expect(cacheKey(URL, PROMPT)).not.toBe(cacheKey(URL, 'extract code examples'));
      expect(cacheKey(URL, PROMPT)).not.toBe(cacheKey(URL + '?v=2', PROMPT));
      expect(cacheKey(URL, PROMPT)).not.toBe(cacheKey(URL, PROMPT + ' '));
      expect(cacheKey(URL)).toBeNull();
    });
  });

  describe('extractContent', () => {
    test('reads .result from the current WebFetch response shape', () => {
      expect(extractContent({ result: 'body', bytes: 4 })).toBe('body');
    });

    test('falls back through defensive keys and string responses', () => {
      expect(extractContent({ output: 'o' })).toBe('o');
      expect(extractContent({ text: 't' })).toBe('t');
      expect(extractContent('plain string')).toBe('plain string');
      expect(extractContent({ code: 200 })).toBeNull();
      expect(extractContent(undefined)).toBeNull();
    });
  });

  describe('postStore', () => {
    test('stores the host-provided result without performing a network request', async () => {
      const dir = makeCacheDir();
      const injectedFetch = jest.fn(() => {
        throw new Error('hook must never call fetch');
      });
      const globalFetch = jest.spyOn(global, 'fetch').mockImplementation(() => {
        throw new Error('hook must never call global fetch');
      });

      try {
        const result = await postStore(
          fetchEvent({ tool_input: {
            url: 'HTTPS://EXAMPLE.COM:443/docs/api#auth',
            prompt: PROMPT
          } }),
          cacheOpts(dir, { fetchImpl: injectedFetch })
        );
        expect(result).toEqual({
          stored: true,
          reason: 'cached host WebFetch result'
        });
      } finally {
        globalFetch.mockRestore();
      }

      expect(injectedFetch).not.toHaveBeenCalled();
      const entry = JSON.parse(fs.readFileSync(fileFor(dir), 'utf8'));
      expect(entry).toEqual({
        url: URL,
        prompt: PROMPT,
        content: 'Auth uses bearer tokens.',
        fetched_at: NOW_MS / 1000
      });
      expect(fs.readdirSync(dir)).toEqual([`${cacheKey(URL, PROMPT)}.json`]);
    });

    test('stores different prompts in independent entries', async () => {
      const dir = makeCacheDir();
      const secondPrompt = 'extract code examples';
      await postStore(fetchEvent(), cacheOpts(dir));
      await postStore(fetchEvent({
        tool_input: { url: URL, prompt: secondPrompt },
        tool_response: { result: 'Example: fetch("/api").', code: 200 }
      }), cacheOpts(dir));

      expect(fileFor(dir, URL, PROMPT)).not.toBe(fileFor(dir, URL, secondPrompt));
      expect(fs.readdirSync(dir).sort()).toEqual([
        `${cacheKey(URL, PROMPT)}.json`,
        `${cacheKey(URL, secondPrompt)}.json`
      ].sort());
    });

    test('no-ops without a valid URL or content', async () => {
      const dir = makeCacheDir();
      await expect(postStore(
        fetchEvent({ tool_input: {} }),
        cacheOpts(dir)
      )).resolves.toEqual({ stored: false, reason: 'invalid url' });
      await expect(postStore(
        fetchEvent({ tool_input: { url: 'file:///tmp/x', prompt: PROMPT } }),
        cacheOpts(dir)
      )).resolves.toEqual({ stored: false, reason: 'invalid url' });
      await expect(postStore(
        fetchEvent({ tool_input: { url: URL } }),
        cacheOpts(dir)
      )).resolves.toEqual({ stored: false, reason: 'invalid prompt' });
      await expect(postStore(
        fetchEvent({ tool_response: { code: 200 } }),
        cacheOpts(dir)
      )).resolves.toEqual({
        stored: false,
        reason: 'no content in tool_response'
      });
    });

    test('does not cache an explicit failed host response', async () => {
      const dir = makeCacheDir();
      const result = await postStore(fetchEvent({
        tool_response: { result: 'Not found', status: 404 }
      }), cacheOpts(dir));
      expect(result).toEqual({ stored: false, reason: 'host WebFetch failed' });
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    test('respects the SPK_WEBFETCH_CACHE=off kill switch', async () => {
      const result = await postStore(fetchEvent(), cacheOpts(makeCacheDir(), {
        env: { SPK_WEBFETCH_CACHE: 'off' }
      }));
      expect(result).toEqual({ stored: false, reason: 'disabled' });
    });

    test('rejects oversized content without writing', async () => {
      const dir = makeCacheDir();
      const result = await postStore(fetchEvent({
        tool_response: { result: 'x'.repeat(MAX_CONTENT_BYTES + 1) }
      }), cacheOpts(dir));

      expect(result).toEqual({ stored: false, reason: 'content too large' });
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    test('rejects an oversized serialized entry', async () => {
      const dir = makeCacheDir();
      const result = await postStore(fetchEvent({
        tool_input: { url: URL, prompt: 'p'.repeat(MAX_ENTRY_BYTES) }
      }), cacheOpts(dir));

      expect(result).toEqual({ stored: false, reason: 'entry too large' });
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    test('cleans up a random exclusive temp file when atomic rename fails', async () => {
      const dir = makeCacheDir();
      const rename = jest.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
        throw new Error('simulated rename failure');
      });
      try {
        const result = await postStore(fetchEvent(), cacheOpts(dir));
        expect(result).toEqual({ stored: false, reason: 'write failed' });
        expect(fs.readdirSync(dir)).toEqual([]);
      } finally {
        rename.mockRestore();
      }
    });
  });

  describe('preCheck', () => {
    async function storedDir() {
      const dir = makeCacheDir();
      await postStore(fetchEvent(), cacheOpts(dir));
      return dir;
    }

    test('serves a fresh exact-key entry without performing a network request', async () => {
      const dir = await storedDir();
      const injectedFetch = jest.fn(() => {
        throw new Error('hook must never call fetch');
      });
      const globalFetch = jest.spyOn(global, 'fetch').mockImplementation(() => {
        throw new Error('hook must never call global fetch');
      });

      let result;
      try {
        result = await preCheck(
          fetchEvent(),
          cacheOpts(dir, {
            now: NOW_MS + CACHE_TTL_MS - 1,
            fetchImpl: injectedFetch
          })
        );
      } finally {
        globalFetch.mockRestore();
      }

      expect(injectedFetch).not.toHaveBeenCalled();
      expect(result.hit).toBe(true);
      expect(result.payload).toContain('Fresh local cache hit for ' + URL);
      expect(result.payload).toContain('This hook made\nno network request.');
      expect(result.payload).toContain(`Exact WebFetch prompt: ${JSON.stringify(PROMPT)}`);
      expect(result.payload).toContain('Auth uses bearer tokens.');
    });

    test('normalizes the request URL before looking up the exact prompt', async () => {
      const dir = await storedDir();
      const result = await preCheck(fetchEvent({
        tool_input: {
          url: 'HTTPS://EXAMPLE.COM:443/docs/api#different-fragment',
          prompt: PROMPT
        }
      }), cacheOpts(dir));
      expect(result.hit).toBe(true);
    });

    test('different prompts never reuse or block each other', async () => {
      const dir = await storedDir();
      const result = await preCheck(fetchEvent({
        tool_input: { url: URL, prompt: 'extract code examples' }
      }), cacheOpts(dir));
      expect(result).toEqual({ hit: false });

      // Even a copied/tampered entry at the other prompt's key must fail its
      // exact metadata check.
      fs.copyFileSync(
        fileFor(dir, URL, PROMPT),
        fileFor(dir, URL, 'extract code examples')
      );
      await expect(preCheck(fetchEvent({
        tool_input: { url: URL, prompt: 'extract code examples' }
      }), cacheOpts(dir))).resolves.toEqual({ hit: false });
    });

    test('expires and removes entries after the fixed local TTL', async () => {
      const dir = await storedDir();
      const file = fileFor(dir);
      const result = await preCheck(
        fetchEvent(),
        cacheOpts(dir, { now: NOW_MS + CACHE_TTL_MS + 1 })
      );
      expect(result).toEqual({ hit: false });
      expect(fs.existsSync(file)).toBe(false);
    });

    test('rejects an implausibly future-dated entry', async () => {
      const dir = makeCacheDir();
      fs.writeFileSync(fileFor(dir), JSON.stringify(validEntry({
        fetched_at: (NOW_MS + 60 * 60 * 1000) / 1000
      })));
      const result = await preCheck(fetchEvent(), cacheOpts(dir));
      expect(result).toEqual({ hit: false });
      expect(fs.existsSync(fileFor(dir))).toBe(false);
    });

    test('bypasses when there is no cache entry', async () => {
      await expect(preCheck(
        fetchEvent(),
        cacheOpts(makeCacheDir())
      )).resolves.toEqual({ hit: false });
    });

    test('bypasses on corrupt cache file', async () => {
      const dir = makeCacheDir();
      fs.writeFileSync(fileFor(dir), 'not json{');
      await expect(preCheck(
        fetchEvent(),
        cacheOpts(dir)
      )).resolves.toEqual({ hit: false });
    });

    test('bypasses an oversized cache entry without reading it', async () => {
      const dir = makeCacheDir();
      fs.writeFileSync(fileFor(dir), Buffer.alloc(MAX_ENTRY_BYTES + 1, 0x61));
      await expect(preCheck(
        fetchEvent(),
        cacheOpts(dir)
      )).resolves.toEqual({ hit: false });
    });

    test('respects the SPK_WEBFETCH_CACHE=off kill switch', async () => {
      const dir = await storedDir();
      await expect(preCheck(fetchEvent(), cacheOpts(dir, {
        env: { SPK_WEBFETCH_CACHE: 'off' }
      }))).resolves.toEqual({ hit: false });
    });
  });

  describe('filesystem adversaries', () => {
    test('rejects a symlinked cache directory without touching its target', async () => {
      const projectRoot = makeCacheDir();
      const external = makeCacheDir();
      const claudeDir = path.join(projectRoot, '.claude');
      fs.mkdirSync(claudeDir);
      const linkedCache = path.join(claudeDir, 'spk-webfetch-cache');
      if (!trySymlink(
        external,
        linkedCache,
        process.platform === 'win32' ? 'junction' : 'dir'
      )) return;

      const result = await postStore(fetchEvent(), {
        env: { CLAUDE_PROJECT_DIR: projectRoot },
        now: NOW_MS
      });
      expect(result).toEqual({ stored: false, reason: 'write failed' });
      expect(fs.readdirSync(external)).toEqual([]);
    });

    test('rejects a symlinked .claude component', async () => {
      const projectRoot = makeCacheDir();
      const external = makeCacheDir();
      if (!trySymlink(
        external,
        path.join(projectRoot, '.claude'),
        process.platform === 'win32' ? 'junction' : 'dir'
      )) return;

      const result = await postStore(fetchEvent(), {
        env: { CLAUDE_PROJECT_DIR: projectRoot },
        now: NOW_MS
      });
      expect(result).toEqual({ stored: false, reason: 'write failed' });
      expect(fs.readdirSync(external)).toEqual([]);
    });

    test('rejects a non-directory cache component', async () => {
      const projectRoot = makeCacheDir();
      const claudePath = path.join(projectRoot, '.claude');
      fs.writeFileSync(claudePath, 'not a directory');

      const result = await postStore(fetchEvent(), {
        env: { CLAUDE_PROJECT_DIR: projectRoot },
        now: NOW_MS
      });
      expect(result).toEqual({ stored: false, reason: 'write failed' });
      expect(fs.readFileSync(claudePath, 'utf8')).toBe('not a directory');
    });

    test('neither reads nor replaces a symlinked cache entry', async () => {
      const dir = makeCacheDir();
      const externalDir = makeCacheDir();
      const externalFile = path.join(externalDir, 'outside.json');
      const original = JSON.stringify(validEntry({ content: 'outside secret' }));
      fs.writeFileSync(externalFile, original);
      if (!trySymlink(externalFile, fileFor(dir), 'file')) return;

      const pre = await preCheck(fetchEvent(), cacheOpts(dir));
      expect(pre.hit).toBe(false);

      const post = await postStore(fetchEvent(), cacheOpts(dir));
      expect(post).toEqual({ stored: false, reason: 'write failed' });
      expect(fs.readFileSync(externalFile, 'utf8')).toBe(original);
      expect(fs.lstatSync(fileFor(dir)).isSymbolicLink()).toBe(true);
    });

    test('rejects a non-regular cache entry', async () => {
      const dir = makeCacheDir();
      fs.mkdirSync(fileFor(dir));

      const pre = await preCheck(fetchEvent(), cacheOpts(dir));
      expect(pre.hit).toBe(false);

      const post = await postStore(fetchEvent(), cacheOpts(dir));
      expect(post).toEqual({ stored: false, reason: 'write failed' });
      expect(fs.lstatSync(fileFor(dir)).isDirectory()).toBe(true);
    });
  });
});
