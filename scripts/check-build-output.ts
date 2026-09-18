/**
 * Garde-fou de la sortie de build.
 *
 * Le solveur linéaire tourne dans un worker chargé par CHEMIN, jamais par
 * `import`. Le traçage de fichiers de Next ne peut donc pas le déduire, et rien
 * ne signale son absence au moment du build.
 *
 * Ce silence a coûté un déploiement entier: worker absent, chaque résolution
 * expirée, relaxation retirant un à un TOUS les nutriments, et un écran de
 * couverture à 0 % partout — un résultat faux, présenté avec le même aplomb
 * qu'un résultat juste (research.md, R17).
 *
 * Le code sait désormais retomber sur une résolution dans le fil principal, donc
 * le chiffre reste juste. Mais ce repli perd la borne de temps de R16: un modèle
 * dégénéré peut alors geler la boucle d'événements. Ce script vérifie donc que
 * le repli n'a PAS à servir en production.
 *
 * Usage: npm run build && npm run check:build
 */
import fs from 'node:fs';
import path from 'node:path';

/** Ce qu'une route de calcul doit emporter, et pourquoi. */
const ATTENDU: { motif: RegExp; quoi: string; pourquoi: string }[] = [
  {
    motif: /solver-worker\.mjs$/,
    quoi: 'src/domain/plan/solver-worker.mjs',
    pourquoi: "chargé par chemin: le traçage de Next ne le déduit pas",
  },
  {
    motif: /node_modules[\/]javascript-lp-solver[\/]/,
    quoi: 'node_modules/javascript-lp-solver',
    pourquoi: "Turbopack l'inline dans la route, mais le worker l'importe pour de vrai",
  },
];

/** Les routes qui calculent une liste, donc qui appellent le solveur. */
const ROUTES = ['api/plan', 'api/results'];

const traceDe = (route: string) => path.join('.next', 'server', 'app', route, 'route.js.nft.json');

const absentes = ROUTES.filter((r) => !fs.existsSync(traceDe(r)));
if (absentes.length) {
  console.error('Sortie de build introuvable:');
  absentes.forEach((r) => console.error('  ' + traceDe(r)));
  console.error("Lancer `npm run build` d'abord.");
  process.exit(1);
}

let fautes = 0;
for (const route of ROUTES) {
  const { files } = JSON.parse(fs.readFileSync(traceDe(route), 'utf8')) as { files: string[] };
  // La trace liste plusieurs fois le même fichier: compter les doublons ferait
  // croire à une couverture plus large qu'elle ne l'est.
  const uniques = [...new Set(files)];
  for (const { motif, quoi, pourquoi } of ATTENDU) {
    const trouves = uniques.filter((f) => motif.test(f));
    if (trouves.length) {
      console.log('  ' + route.padEnd(14) + quoi.padEnd(42) + trouves.length + ' fichier(s)');
    } else {
      console.error('  ' + route.padEnd(14) + quoi.padEnd(42) + 'ABSENT — ' + pourquoi);
      fautes += 1;
    }
  }
}

console.log('');
if (fautes) {
  console.error(
    fautes +
      ' manque(s) dans la sortie de build. Le solveur retomberait dans le fil ' +
      "principal: le résultat resterait juste, mais sans borne de temps.\n" +
      'Corriger `outputFileTracingIncludes` dans next.config.ts.',
  );
  process.exit(1);
}
console.log('Sortie de build complète: le worker et sa dépendance sont embarqués.');
