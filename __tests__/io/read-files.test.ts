import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import AdmZip from 'adm-zip';
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

  it('creates missing parent directories when writing files', async () => {
    const filePath = join(tempDir, 'nested', 'reports', 'summary.md');

    await writeTextFile(filePath, '# summary');
    const content = await readTextFile(filePath);

    expect(content).toBe('# summary');
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

  it('reads UTF-8 text file from a zip archive entry path', async () => {
    const zipPath = join(tempDir, 'results.zip');
    const zip = new AdmZip();
    zip.addFile('reports/insider-summary.md', Buffer.from('# insider\nstatus: success', 'utf8'));
    zip.writeZip(zipPath);

    const content = await readTextFile(`${zipPath}::reports/insider-summary.md`);

    expect(content).toBe('# insider\nstatus: success');
  });

  it('reads zip entry when archive path uses backslashes', async () => {
    const zipPath = join(tempDir, 'results.zip');
    const zip = new AdmZip();
    zip.addFile('reports/voyager.lock.yml', Buffer.from('mission: x\ntools: []\n', 'utf8'));
    zip.writeZip(zipPath);

    const content = await readTextFile(`${zipPath}::reports\\voyager.lock.yml`);

    expect(content).toContain('mission: x');
  });

  it('throws a clear error when archive entry is missing', async () => {
    const zipPath = join(tempDir, 'results.zip');
    const zip = new AdmZip();
    zip.addFile('reports/insider-summary.md', Buffer.from('# insider', 'utf8'));
    zip.writeZip(zipPath);

    await expect(readTextFile(`${zipPath}::reports/missing.md`)).rejects.toThrow(
      `Archive entry 'reports/missing.md' not found in ${zipPath}`
    );
  });

  it('throws a clear error for invalid archive path syntax', async () => {
    await expect(readTextFile('C:\\tmp\\results.zip::')).rejects.toThrow(
      "Invalid archive path 'C:\\tmp\\results.zip::'. Expected format '<archive.zip>::<entry-path>'"
    );
  });
});
