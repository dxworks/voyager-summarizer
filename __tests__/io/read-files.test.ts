import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileExists, readTextFile, writeTextFile } from '../../src/io/read-files';

describe('read-files io helpers', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'voyager-summarizer-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes and reads UTF-8 text files', async () => {
    const filePath = join(tempDir, 'sample.txt');

    await writeTextFile(filePath, 'line one\nline two');
    const content = await readTextFile(filePath);

    expect(content).toBe('line one\nline two');
  });

  it('returns true for existing readable files', async () => {
    const filePath = join(tempDir, 'existing.txt');

    await writeTextFile(filePath, 'exists');
    const exists = await fileExists(filePath);

    expect(exists).toBe(true);
  });

  it('returns false for missing files', async () => {
    const filePath = join(tempDir, 'missing.txt');
    const exists = await fileExists(filePath);

    expect(exists).toBe(false);
  });
});
