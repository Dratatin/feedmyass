/**
 * Chargement des tables de référence.
 *
 * Règle non négociable (principe II): tout fichier de référence doit porter
 * `_meta.source`, `_meta.version` et `_meta.retrieved_at`. Un fichier qui en
 * manque fait échouer le seed — c'est ce qui empêche une valeur nutritionnelle
 * non traçable d'atteindre la base.
 *
 * Le script utilise la clé service role: il écrit dans des tables dont les
 * politiques RLS n'autorisent que la lecture. Il s'exécute hors application.
 *
 * Usage: npm run seed:reference
 */
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Le script s'exécute hors de Next.js, qui est seul à charger `.env.local`
// automatiquement. Sans cette ligne, l'usage documenté ci-dessus échouait sur
// une variable d'environnement manquante. `playwright.config.ts` fait de même,
// et pour la même raison.
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');

const referenceDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'reference');

type Meta = { source: string; version: string; retrieved_at: string };

type ReferenceFile = {
  name: string;
  table: string;
  /** Clé du tableau de données dans le fichier JSON. */
  key: string;
  conflictTarget: string;
  /** Obligatoire: un fichier absent fait échouer le seed plutôt que de charger une base partielle. */
  required: boolean;
  /** Colonnes de traçabilité que porte la table. nutrients n'en a aucune: c'est un référentiel de libellés, pas de valeurs. */
  traceColumns: Array<'source' | 'version' | 'retrieved_at'>;
  /**
   * 'upsert-prune': met à jour et SUPPRIME les lignes absentes du fichier, par
   * clé technique. 'replace': vide la table puis réinsère, pour les tables à
   * clé composée dont le contenu est entièrement dérivé.
   *
   * Sans élagage, un aliment retiré du fichier de référence resterait en base
   * indéfiniment: le fichier et la base divergeraient en silence, ce qui ruine
   * la traçabilité (principe II).
   */
  strategy: 'upsert-prune' | 'replace';
  /** Clé technique utilisée pour l'élagage. */
  pruneKey?: string;
};

const files: ReferenceFile[] = [
  { name: 'nutrients.json', table: 'nutrients', key: 'nutrients', conflictTarget: 'code', required: true, traceColumns: [], strategy: 'upsert-prune', pruneKey: 'code' },
  { name: 'reference-intakes.json', table: 'reference_intakes', key: 'reference_intakes', conflictTarget: 'nutrient_code,reference_sex,age_min,age_max,kind', required: true, traceColumns: ['source', 'version', 'retrieved_at'], strategy: 'replace' },
  { name: 'foods.json', table: 'foods', key: 'foods', conflictTarget: 'code', required: true, traceColumns: ['source', 'version', 'retrieved_at'], strategy: 'upsert-prune', pruneKey: 'code' },
  { name: 'seasonality.json', table: 'seasonality', key: 'seasonality', conflictTarget: 'food_code,month', required: true, traceColumns: ['source', 'version'], strategy: 'replace' },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

function assertMeta(fileName: string, meta: unknown): asserts meta is Meta {
  const m = meta as Partial<Meta> | undefined;
  const missing = (['source', 'version', 'retrieved_at'] as const).filter((k) => !m?.[k]);
  if (missing.length > 0) {
    throw new Error(
      `${fileName}: _meta incomplet (${missing.join(', ')} manquant). ` +
        "Toute donnée de référence doit porter sa source, sa version et sa date de récupération.",
    );
  }
}

async function loadFile(file: ReferenceFile) {
  const fullPath = path.join(referenceDir, file.name);
  let raw: string;
  try {
    raw = await readFile(fullPath, 'utf8');
  } catch {
    throw new Error(`${file.name}: fichier de référence absent (${fullPath}).`);
  }

  const parsed = JSON.parse(raw) as { _meta?: unknown; [key: string]: unknown };
  assertMeta(file.name, parsed._meta);

  const rows = parsed[file.key];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${file.name}: clé "${file.key}" absente ou vide.`);
  }

  return { meta: parsed._meta, rows: rows as Record<string, unknown>[] };
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  // Tout est lu et validé avant la moindre écriture: un fichier non traçable
  // interrompt le seed sans laisser la base à moitié chargée.
  const loaded = [];
  for (const file of files) {
    const { meta, rows } = await loadFile(file);
    loaded.push({ file, meta, rows });
    console.log(`✓ ${file.name}: ${rows.length} lignes, source ${meta.source} (${meta.version})`);
  }

  for (const { file, meta, rows } of loaded) {
    const withTrace = rows.map((row) => {
      const trace: Record<string, unknown> = {};
      for (const column of file.traceColumns) {
        trace[column] = row[column] ?? meta[column];
      }
      return { ...row, ...trace };
    });

    if (file.strategy === 'replace') {
      // Table entièrement dérivée: on repart d'une table vide pour que son
      // contenu corresponde exactement au fichier de référence.
      const { error: clearError } = await client.from(file.table).delete().gte('version', '');
      if (clearError) throw new Error(`${file.table} (purge): ${clearError.message}`);

      const { error: insertError } = await client.from(file.table).insert(withTrace);
      if (insertError) throw new Error(`${file.table}: ${insertError.message}`);
      console.log(`→ ${file.table}: ${withTrace.length} lignes remplacées`);
      continue;
    }

    const { error } = await client
      .from(file.table)
      .upsert(withTrace, { onConflict: file.conflictTarget });
    if (error) throw new Error(`${file.table}: ${error.message}`);

    const key = file.pruneKey as string;
    const keptKeys = new Set(withTrace.map((row) => String(row[key])));
    const { data: existing, error: readError } = await client.from(file.table).select(key);
    if (readError) throw new Error(`${file.table} (relecture): ${readError.message}`);

    const stale = (existing ?? [])
      .map((row) => String((row as unknown as Record<string, unknown>)[key]))
      .filter((value) => !keptKeys.has(value));

    for (let i = 0; i < stale.length; i += 100) {
      const chunk = stale.slice(i, i + 100);
      const { error: deleteError } = await client.from(file.table).delete().in(key, chunk);
      if (deleteError) throw new Error(`${file.table} (élagage): ${deleteError.message}`);
    }

    console.log(
      `→ ${file.table}: ${withTrace.length} lignes chargées` +
        (stale.length > 0 ? `, ${stale.length} lignes obsolètes supprimées` : ''),
    );
  }

  console.log('Seed terminé.');
}

main().catch((error: unknown) => {
  console.error('Seed interrompu:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
