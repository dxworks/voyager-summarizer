import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = resolve(process.cwd());
const bundlePath = resolve(rootDir, 'dist/sea/summarizer.bundle.cjs');
const outputDir = resolve(rootDir, 'dist/sea');

const platformName = getPlatformName(process.platform);
const extension = process.platform === 'win32' ? '.exe' : '';
const outputPath = resolve(outputDir, `voyager-summarizer-${platformName}-${process.arch}${extension}`);
const seaConfigPath = resolve(outputDir, 'sea-config.json');

mkdirSync(outputDir, { recursive: true });

const config = {
  main: bundlePath,
  mainFormat: 'commonjs',
  output: outputPath,
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false
};

writeFileSync(seaConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

const buildResult = spawnSync(process.execPath, ['--build-sea', seaConfigPath], {
  cwd: rootDir,
  stdio: 'inherit'
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

console.log(`SEA executable created at ${outputPath}`);
console.log(`SEA configuration saved at ${seaConfigPath}`);

function getPlatformName(platform) {
  if (platform === 'win32') {
    return 'win';
  }

  if (platform === 'darwin') {
    return 'macos';
  }

  if (platform === 'linux') {
    return 'linux';
  }

  throw new Error(`Unsupported platform '${platform}' for SEA output naming`);
}
