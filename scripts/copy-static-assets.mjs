import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());

copyPath('src/config/default-conditions.json', 'dist/src/config/default-conditions.json');
copyPath('src/config/default-order.json', 'dist/src/config/default-order.json');
copyPath('src/render/templates', 'dist/src/render/templates');

function copyPath(fromRelativePath, toRelativePath) {
  const sourcePath = resolve(rootDir, fromRelativePath);
  const destinationPath = resolve(rootDir, toRelativePath);

  mkdirSync(resolve(destinationPath, '..'), { recursive: true });
  cpSync(sourcePath, destinationPath, { recursive: true });
}
