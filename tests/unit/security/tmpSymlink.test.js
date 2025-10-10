import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import tmp from 'tmp';

const realTmpDir = fs.realpathSync(os.tmpdir());
const symlinkName = 'tmp-symlink-security-check';
const symlinkPath = path.join(realTmpDir, symlinkName);
const outsideDir = path.join(process.cwd(), 'tmp-symlink-outside');

function removeSymlink(targetPath) {
  try {
    fs.unlinkSync(targetPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function removeDirectory(targetPath) {
  try {
    fs.rmSync(targetPath, { force: true, recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

describe('tmp symlink mitigation', () => {
  beforeEach(() => {
    fs.mkdirSync(outsideDir, { recursive: true });
    removeSymlink(symlinkPath);
    fs.symlinkSync(outsideDir, symlinkPath, 'dir');
  });

  afterEach(() => {
    removeSymlink(symlinkPath);
    removeDirectory(outsideDir);
  });

  it('rejects directories that resolve outside of the system tmp dir', () => {
    expect(() => tmp.fileSync({ dir: symlinkName })).toThrow(/dir option must be relative/);

    const outsideEntries = fs.readdirSync(outsideDir);
    const hasTmpArtifacts = outsideEntries.some((entry) => entry.startsWith('tmp-'));
    expect(hasTmpArtifacts).toBe(false);
  });
});
