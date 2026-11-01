import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from './env';
import { PrismaClient } from './generated/prisma/client';

// Le pilote « mariadb » fonctionne avec MariaDB et MySQL.
const adapter = new PrismaMariaDb(env.DATABASE_URL.replace(/^mysql:/, 'mariadb:'));

export const prisma = new PrismaClient({ adapter });
