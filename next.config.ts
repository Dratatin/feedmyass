import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Routes typées: option stabilisée et remontée au niveau racine depuis Next 15.5.
  typedRoutes: true,

  /**
   * Le worker du solveur est chargé par CHEMIN, pas par import: le traçage de
   * fichiers de Next ne peut pas le déduire, et la sortie de build ne l'embarquait
   * pas.
   *
   * Il faut y joindre javascript-lp-solver. Turbopack INLINE ce paquet dans le
   * chunk de la route, si bien qu'il disparaît de node_modules à la trace: le
   * worker, lui, l'importe pour de vrai et mourrait sur un module introuvable.
   *
   * Sans ces lignes, le worker était absent en production, chaque résolution
   * expirait, la relaxation abandonnait tous les nutriments et la couverture
   * affichée valait 0 % partout — un résultat faux, présenté comme un résultat
   * juste. Le code sait désormais retomber sur une résolution en direct, mais
   * ce repli perd la borne de temps: mieux vaut que le worker soit là.
   */
  outputFileTracingIncludes: {
    '/api/plan': [
      './src/domain/plan/solver-worker.mjs',
      './node_modules/javascript-lp-solver/**',
    ],
    '/api/results': [
      './src/domain/plan/solver-worker.mjs',
      './node_modules/javascript-lp-solver/**',
    ],
  },
};

export default nextConfig;
