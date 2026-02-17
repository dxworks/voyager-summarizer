import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
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
  await writeFile(filePath, content, 'utf8');
}
