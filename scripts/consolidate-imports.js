#!/usr/bin/env node
/**
 * scripts/consolidate-imports.js
 *
 * Second-pass cleanup:
 * - Removes old `import { X } from '@/functions/X'` style imports
 * - Removes old `import { X } from '@/entities/X'` style imports
 * - Removes old `import { X } from '@/integrations/Core'` style imports
 *   (These all resolve to the same files via Vite aliases — consolidate them)
 * - Merges duplicate imports from the same module into one line
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

// Canonical paths after migration
const CANONICAL = {
  '@/api/entities':      /@\/entities\/\w+/,
  '@/api/functions':     /@\/functions\/\w+/,
  '@/api/integrations':  /@\/integrations\/Core/,
};

function transform(src) {
  let out = src;
  // Track what canonical imports already exist with what names
  const canonicalImports = {
    '@/api/entities':     new Set(),
    '@/api/functions':    new Set(),
    '@/api/integrations': new Set(),
  };

  // 1. Collect names from old-style imports and remove those lines
  for (const [canonical, oldPattern] of Object.entries(CANONICAL)) {
    out = out.replace(
      new RegExp(`^import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${oldPattern.source}['"];?\\n?`, 'gm'),
      (_, names) => {
        names.split(',').map(s => s.trim()).filter(Boolean)
             .forEach(n => canonicalImports[canonical].add(n));
        return '';
      }
    );
  }

  if (Object.values(canonicalImports).every(s => s.size === 0)) return null;

  // 2. Merge collected names into existing canonical imports (or add new ones)
  for (const [canonical, newNames] of Object.entries(canonicalImports)) {
    if (newNames.size === 0) continue;

    const existingRe = new RegExp(
      `^(import\\s+\\{)([^}]+)(\\}\\s+from\\s+['"]${canonical.replace('/', '\\/')}['"];?)$`,
      'm'
    );

    if (existingRe.test(out)) {
      // Merge into existing import
      out = out.replace(existingRe, (_, pre, names, post) => {
        const existing = new Set(names.split(',').map(s => s.trim()).filter(Boolean));
        for (const n of newNames) existing.add(n);
        return `${pre} ${[...existing].sort().join(', ')} ${post}`;
      });
    } else {
      // No existing canonical import — inject after last import
      const lines = out.split('\n');
      let last = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^import\s/.test(lines[i].trim())) last = i;
      }
      const newLine = `import { ${[...newNames].sort().join(', ')} } from '${canonical}';`;
      lines.splice(last + 1, 0, newLine);
      out = lines.join('\n');
    }
  }

  return out;
}

const files = findJsxFiles(SRC);
let changed = 0;
for (const filePath of files) {
  const src = fs.readFileSync(filePath, 'utf8');
  // Only process files that have old-style imports
  if (!src.includes("'@/functions/") && !src.includes('"@/functions/') &&
      !src.includes("'@/entities/") && !src.includes('"@/entities/') &&
      !src.includes("'@/integrations/Core") && !src.includes('"@/integrations/Core')) continue;

  const result = transform(src);
  if (!result || result === src) continue;
  fs.writeFileSync(filePath, result, 'utf8');
  console.log(`✓ ${path.relative(SRC, filePath)}`);
  changed++;
}
console.log(`\nDone: ${changed} files consolidated.`);
