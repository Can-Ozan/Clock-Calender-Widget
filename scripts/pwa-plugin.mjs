import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function offlinePlugin() {
  let output;
  let base;
  return {
    name: 'clock-calendar-offline',
    apply: 'build',
    configResolved(config) {
      output = resolve(config.root, config.build.outDir);
      base = config.base;
    },
    async closeBundle() {
      const files = (await readdir(output, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name !== 'sw.js')
        .map((entry) =>
          resolve(entry.parentPath, entry.name)
            .slice(output.length + 1)
            .replaceAll('\\', '/'),
        )
        .sort();
      const template = await readFile(new URL('./sw-template.js', import.meta.url), 'utf8');
      const hash = createHash('sha256').update(template).update(base);
      for (const file of files) hash.update(file).update(await readFile(resolve(output, file)));
      const cache = `clock-calendar-${base}-${hash.digest('hex').slice(0, 16)}`;
      const source = template
        .replace("'__CACHE_NAME__'", JSON.stringify(cache))
        .replace("'__PRECACHE__'", JSON.stringify(files.map((file) => `${base}${file}`)))
        .replace("'__BASE__'", JSON.stringify(base));
      await writeFile(resolve(output, 'sw.js'), source);
    },
  };
}
