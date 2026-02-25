#!/usr/bin/env node
/**
 * Fix broken imports left by codemod:
 * Pattern: import {\nimport X from '...';\n  realImport,\n} from '...';
 * The injected import line should be AFTER the closing `} from '...';`
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');

function findJsxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsxFiles(full));
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) results.push(full);
  }
  return results;
}

function fixBrokenImports(src) {
  const lines = src.split('\n');
  let changed = false;
  let i = 0;

  while (i < lines.length) {
    // Detect: a line that is ONLY "import {" (possibly with trailing space)
    if (/^import\s+\{$/.test(lines[i].trimEnd())) {
      // Check next line — if it's a complete import statement, it's broken
      if (i + 1 < lines.length && /^import\s+/.test(lines[i + 1].trimEnd())) {
        // Extract the injected import line(s) — keep consuming while they look like imports
        const injected = [];
        while (i + 1 < lines.length && /^import\s+/.test(lines[i + 1].trimEnd())) {
          injected.push(lines.splice(i + 1, 1)[0]);
          changed = true;
        }
        // Now find the closing `} from '...';` of the multi-line block
        let j = i + 1;
        while (j < lines.length && !/^\}\s+from\s+['"]/.test(lines[j].trimEnd())) j++;
        // Insert injected lines after the closing `} from` line
        if (j < lines.length) {
          lines.splice(j + 1, 0, ...injected);
        } else {
          // fallback: put at end of imports (before first non-import/non-blank)
          lines.splice(i, 0, ...injected);
        }
      }
    }
    i++;
  }

  return changed ? lines.join('\n') : null;
}

const files = findJsxFiles(SRC);
let fixed = 0;
for (const filePath of files) {
  const src = fs.readFileSync(filePath, 'utf8');
  const result = fixBrokenImports(src);
  if (!result) continue;
  fs.writeFileSync(filePath, result, 'utf8');
  console.log(`✓ ${path.relative(SRC, filePath)}`);
  fixed++;
}
console.log(`\nFixed ${fixed} files.`);
