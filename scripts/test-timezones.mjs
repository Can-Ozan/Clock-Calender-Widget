import { spawnSync } from 'node:child_process';

for (const TZ of ['UTC', 'America/New_York', 'Europe/Berlin', 'Pacific/Auckland']) {
  console.log(`Date utilities in ${TZ}`);
  const result = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', 'tests/DateUtils.test.ts'],
    {
      stdio: 'inherit',
      env: { ...process.env, TZ },
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
