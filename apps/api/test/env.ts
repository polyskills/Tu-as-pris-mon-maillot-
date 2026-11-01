import { config } from 'dotenv';

config({ path: new URL('../.env.test', import.meta.url).pathname, override: true, quiet: true });
process.env.NODE_ENV = 'test';
