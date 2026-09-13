/**
 * Charge .env.local pour les tests qui interrogent la vraie base (RLS,
 * immuabilité): ces règles ne peuvent pas être vérifiées autrement qu'en les
 * exécutant contre Postgres.
 */
import fs from 'node:fs';

if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}
