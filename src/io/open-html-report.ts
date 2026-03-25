import { exec } from 'node:child_process';
import path from 'node:path';

export function getOpenHtmlCommand(filePath: string, platform: NodeJS.Platform = process.platform): string {
  const escapedPath = filePath.replace(/"/g, '\\"');

  if (platform === 'win32') {
    return `cmd /c start "" "${escapedPath}"`;
  }

  if (platform === 'darwin') {
    return `open "${escapedPath}"`;
  }

  return `xdg-open "${escapedPath}"`;
}

export async function openHtmlReport(filePath: string, platform: NodeJS.Platform = process.platform): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const command = getOpenHtmlCommand(resolvedPath, platform);

  await new Promise<void>((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
