/**
 * Copies the files listed in shared.json from the sibling repositories that keep their originals.
 * Keep the four repositories side by side in one folder, then run, from this one:
 *
 *   npm run sync              shows what differs
 *   npm run sync -- --write   copies the originals over the copies here
 *
 * Change a shared file in the repository that owns it, never in a copy.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const write = process.argv.includes('--write');
const here = process.cwd();
const { from } = JSON.parse(readFileSync(join(here, 'shared.json'), 'utf8'));
let differs = 0;

for (const [repo, files] of Object.entries(from)) {
  const root = join(here, '..', repo);
  if (!existsSync(root)) {
    console.log(`${repo}: not found next to this folder, skipped.`);
    continue;
  }
  for (const file of files) {
    const original = join(root, file);
    if (!existsSync(original)) {
      console.log(`  no longer in ${repo}: ${file}`);
      continue;
    }
    const theirs = readFileSync(original);
    const target = join(here, file);
    const mine = existsSync(target) ? readFileSync(target) : null;
    if (mine && Buffer.compare(mine, theirs) === 0) continue;
    differs += 1;
    console.log(`  ${write ? 'copied' : 'differs'}  ${file}  (from ${repo})`);
    if (write) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, theirs);
    }
  }
}

if (!differs) console.log('Every shared file is up to date.');
else if (!write) console.log(`${differs} shared file(s) differ. Run npm run sync -- --write to copy the originals.`);
