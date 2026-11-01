import { execSync } from 'node:child_process';
import { config } from 'dotenv';

/** Applique les migrations sur la base de test avant la série de tests. */
export default function preparation() {
  const { parsed } = config({ path: new URL('../.env.test', import.meta.url).pathname, quiet: true });
  execSync('npx prisma migrate deploy', {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, ...parsed },
    stdio: 'pipe',
  });
}
