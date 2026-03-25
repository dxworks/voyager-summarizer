import path from 'node:path';

import { getOpenHtmlCommand, openHtmlReport } from '../../src/io/open-html-report';

const execMock = jest.fn((command: string, callback: (error: Error | null) => void) => callback(null));

jest.mock('node:child_process', () => ({
  exec: (command: string, callback: (error: Error | null) => void) => execMock(command, callback)
}));

describe('open html report', () => {
  beforeEach(() => {
    execMock.mockClear();
  });

  it('builds windows open command', () => {
    const command = getOpenHtmlCommand('C:\\tmp\\summary.html', 'win32');

    expect(command).toBe('cmd /c start "" "C:\\tmp\\summary.html"');
  });

  it('builds mac open command', () => {
    const command = getOpenHtmlCommand('/tmp/summary.html', 'darwin');

    expect(command).toBe('open "/tmp/summary.html"');
  });

  it('builds linux open command', () => {
    const command = getOpenHtmlCommand('/tmp/summary.html', 'linux');

    expect(command).toBe('xdg-open "/tmp/summary.html"');
  });

  it('executes open command with resolved absolute path', async () => {
    await openHtmlReport('summary.html', 'linux');

    expect(execMock).toHaveBeenCalledWith(
      `xdg-open "${path.resolve('summary.html')}"`,
      expect.any(Function)
    );
  });

  it('rejects when open command fails', async () => {
    execMock.mockImplementationOnce((command: string, callback: (error: Error | null) => void) => {
      callback(new Error(`failed to run ${command}`));
    });

    await expect(openHtmlReport('summary.html', 'darwin')).rejects.toThrow('failed to run');
  });
});
