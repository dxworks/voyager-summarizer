import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import AdmZip from 'adm-zip';

export async function readTextFile(filePath: string): Promise<string> {
  const archivePath = parseArchivePath(filePath);
  if (!archivePath) {
    return readFile(filePath, 'utf8');
  }

  const zip = new AdmZip(archivePath.zipFilePath);
  const normalizedEntryPath = normalizeArchiveEntryPath(archivePath.archiveEntryPath);
  const entry = zip.getEntry(normalizedEntryPath);

  if (!entry) {
    throw new Error(`Archive entry '${archivePath.archiveEntryPath}' not found in ${archivePath.zipFilePath}`);
  }

  return zip.readAsText(entry, 'utf8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

interface ArchivePath {
  zipFilePath: string;
  archiveEntryPath: string;
}

function parseArchivePath(filePath: string): ArchivePath | null {
  const separatorIndex = filePath.indexOf('::');
  if (separatorIndex < 0) {
    return null;
  }

  const zipFilePath = filePath.slice(0, separatorIndex).trim();
  const archiveEntryPath = filePath.slice(separatorIndex + 2).trim();

  if (zipFilePath.length === 0 || archiveEntryPath.length === 0) {
    throw new Error(`Invalid archive path '${filePath}'. Expected format '<archive.zip>::<entry-path>'`);
  }

  return {
    zipFilePath,
    archiveEntryPath
  };
}

function normalizeArchiveEntryPath(entryPath: string): string {
  return entryPath.replace(/\\/g, '/').replace(/^\/+/, '');
}
