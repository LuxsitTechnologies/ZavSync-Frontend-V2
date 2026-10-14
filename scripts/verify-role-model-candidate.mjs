#!/usr/bin/env node
// Record once after review; the verifier only reads and checks this manifest.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const frontend = '/Users/humzamazhar/Documents/Codex/ZavSync-Frontend-V2';
const backend = '/Users/humzamazhar/Documents/ChatGPT/ZavSync-Backend-V2';
const manifestRelative = 'docs/qa/user-requirements-1-22-role-model-candidate.lock.json';
const manifestPath = join(frontend, manifestRelative);
const bases = {
  frontend: '5e69750067abeb3db6ea93ab3af543599052e159',
  backend: 'e93e998ae6cfbcb675805e1006791106260100b4',
};

function git(root, ...args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed in ${root}: ${result.stderr.toString().trim()}`);
  }
  return result.stdout;
}

function hash(data) {
  return createHash('sha256').update(data).digest('hex');
}

function paths(output) {
  return output.toString('utf8').split('\0').filter(Boolean);
}

function snapshot(root, base, exclude = null) {
  const head = git(root, 'rev-parse', 'HEAD').toString().trim();
  if (head !== base) throw new Error(`${root}: HEAD ${head} differs from committed base ${base}`);
  if (git(root, 'diff', '--cached', '--name-only', '-z').length) {
    throw new Error(`${root}: staged changes are not in this reviewed unstaged candidate`);
  }
  const tracked = paths(git(root, 'diff', '--name-only', '-z', 'HEAD'));
  const untracked = paths(git(root, 'ls-files', '--others', '--exclude-standard', '-z'));
  const changed = [...new Set([...tracked, ...untracked])]
    .filter((path) => path !== exclude)
    .sort();
  const inventory = changed.map((path) => {
    const absolute = join(root, path);
    if (!existsSync(absolute)) return { path, state: 'deleted' };
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      return { path, state: 'symlink', target: readlinkSync(absolute) };
    }
    if (!stat.isFile()) throw new Error(`${root}: unsupported candidate entry ${path}`);
    return {
      path,
      state: untracked.includes(path) ? 'new' : 'modified',
      executable: Boolean(stat.mode & 0o111),
      sha256: hash(readFileSync(absolute)),
    };
  });
  return {
    baseCommit: base,
    trackedDiffSha256: hash(git(root, 'diff', '--binary', '--no-ext-diff', 'HEAD')),
    inventory,
  };
}

function candidate() {
  return {
    schema: 1,
    description: 'Uncommitted Requirements 1–22 role-model candidate; no final certified commit exists',
    frontend: snapshot(frontend, bases.frontend, manifestRelative),
    backend: snapshot(backend, bases.backend),
  };
}

try {
  const mode = process.argv[2];
  if (!['record', 'verify'].includes(mode) || process.argv.length !== 3) {
    throw new Error('Usage: node scripts/verify-role-model-candidate.mjs record|verify');
  }
  const actual = candidate();
  if (mode === 'record') {
    writeFileSync(manifestPath, `${JSON.stringify(actual, null, 2)}\n`);
    console.log(`Recorded reviewed candidate: frontend ${actual.frontend.inventory.length} files, backend ${actual.backend.inventory.length} files.`);
  } else {
    if (!existsSync(manifestPath)) throw new Error(`Candidate manifest missing: ${manifestPath}`);
    const recorded = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!isDeepStrictEqual(actual, recorded)) {
      for (const repository of ['frontend', 'backend']) {
        if (!isDeepStrictEqual(actual[repository], recorded[repository])) {
          const expectedFiles = (recorded[repository]?.inventory ?? []).map((file) => file.path);
          const actualFiles = actual[repository].inventory.map((file) => file.path);
          console.error(`${repository} recorded files: ${JSON.stringify(expectedFiles)}`);
          console.error(`${repository} current files:  ${JSON.stringify(actualFiles)}`);
        }
      }
      throw new Error('Candidate inventory, bytes, mode or tracked diff changed; review and explicitly re-record before verification');
    }
    console.log(`Candidate integrity PASS: frontend ${actual.frontend.inventory.length} files; backend ${actual.backend.inventory.length} files; both base commits pinned.`);
  }
} catch (error) {
  console.error(`CANDIDATE INTEGRITY FAILED: ${error.message}`);
  process.exitCode = 1;
}
