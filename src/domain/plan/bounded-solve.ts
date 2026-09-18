import type { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solver from 'javascript-lp-solver';

/**
 * Appel BORNÉ au solveur linéaire.
 *
 * Le simplexe de la bibliothèque peut cycler indéfiniment sur une instance
 * dégénérée (research.md, R16). Comme l'appel est synchrone, rien ne pouvait
 * l'interrompre: un régime végane sans gluten gelait la boucle d'événements de
 * Node, et avec elle toutes les requêtes du serveur.
 *
 * Le calcul part donc dans un worker, que l'on peut terminer. L'appelant l'attend
 * sur `Atomics.wait` avec une échéance, ce qui garde `solvePlan` SYNCHRONE: aucune
 * signature ne change, ni dans le domaine, ni dans les routes, ni dans les tests.
 *
 * REPLI EN DIRECT. Si le worker ne peut pas démarrer — fichier absent de la
 * sortie de build, dépendance non résoluble, plateforme sans `SharedArrayBuffer`
 * — on résout dans le fil principal. On retrouve alors le risque de blocage,
 * rare, mais on rend un résultat JUSTE.
 *
 * Ce repli n'est pas une précaution théorique: sans lui, un worker muet faisait
 * expirer chaque résolution, la relaxation abandonnait tous les nutriments, et
 * l'application affichait une couverture de 0 % pour chacun — un résultat faux,
 * présenté avec le même aplomb qu'un résultat juste. Entre un risque de lenteur
 * et un chiffre faux, le principe II tranche.
 */

/** Taille de la zone d'échange. Un modèle de 250 aliments pèse ~1 Mo en JSON. */
const TAILLE_ECHANGE = 16 * 1024 * 1024;
const CORPS = 4;

const ATTENTE = 0;
const DEMANDE = 1;
// L'état 2 (réponse posée) n'est pas nommé ici: l'appelant ne le teste jamais,
// il se contente de sortir de son attente. Il est décrit dans solver-worker.mjs.

/**
 * Constructeur de worker obtenu à l'EXÉCUTION.
 *
 * L'import statique de `node:worker_threads` suffirait — mais Turbopack analyse
 * alors `new Worker(...)` pour empaqueter le worker, et sur un chemin CALCULÉ il
 * ne sait rien résoudre: il se rabat sur « tous les fichiers du projet ». Il
 * tirait ainsi vitest.config.ts, donc Vite, donc lightningcss, et la compilation
 * échouait sur 47 « Unknown module type ». Le commentaire `turbopackIgnore` n'y
 * change rien à cet endroit.
 *
 * `process.getBuiltinModule` donne le même module sans aucun import analysable:
 * il ne reste qu'un type, effacé à la compilation. Le fichier du worker est
 * embarqué par `outputFileTracingIncludes` (next.config.ts).
 */
const { Worker: ConstructeurWorker } = process.getBuiltinModule('node:worker_threads');
const { existsSync } = process.getBuiltinModule('node:fs');

/**
 * Échéance de la poignée de main, en millisecondes. Le modèle d'essai se résout
 * en une fraction de milliseconde: tout le budget va au démarrage du worker.
 */
const POIGNEE_MAIN_MS = 2_000;

export type BoundedSolution = {
  feasible: boolean;
  valeurs: Record<string, number>;
  /** Vrai quand l'échéance a été atteinte: le modèle n'a PAS été résolu. */
  interrompu: boolean;
};

type Canal = {
  worker: Worker;
  controle: Int32Array;
  donnees: Uint8Array;
  longueur: Int32Array;
};

let canal: Canal | null = null;
/** Passe à vrai dès qu'on sait que le worker est inutilisable ici. */
let sansWorker = false;

const solveDirect = solver.Solve.bind(solver) as (
  model: unknown,
  precision?: number,
) => Record<string, unknown> & { feasible?: boolean };

function enProcessus(
  model: unknown,
  codes: string[],
  precision: number,
): BoundedSolution {
  const solution = solveDirect(model, precision);
  const valeurs: Record<string, number> = {};
  if (solution.feasible) {
    for (const code of codes) {
      const q = solution[code];
      if (typeof q === 'number') valeurs[code] = q;
    }
  }
  return { feasible: Boolean(solution.feasible), valeurs, interrompu: false };
}

/**
 * Chemins possibles du fichier du worker, filtrés sur ce qui existe.
 *
 * Sous Vitest ou en script, `import.meta.url` désigne ce module et le worker est
 * son voisin. Empaqueté par Next, ce module vit dans un chunk: on retombe alors
 * sur le chemin du dépôt, qui est aussi celui que la sortie de build reproduit
 * (`outputFileTracingIncludes`, next.config.ts).
 *
 * Le filtre n'est pas une coquetterie: un `new Worker` sur un fichier absent
 * n'échoue PAS à l'appel, il émet son erreur sur la boucle d'événements — que
 * l'appelant bloque aussitôt sur `Atomics.wait`. Sans filtre, chaque démarrage à
 * froid en production payait la poignée de main jusqu'à son échéance avant
 * seulement de tenter le bon chemin.
 *
 * `existsSync` vient de `process.getBuiltinModule`, comme le constructeur de
 * worker: un `import` de `node:fs` suivi d'un appel sur un chemin calculé est lu
 * par Turbopack comme un accès dynamique au système de fichiers, et il trace
 * alors tout le projet.
 */
function cheminsWorker(): string[] {
  return [
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'solver-worker.mjs'),
    path.join(process.cwd(), 'src', 'domain', 'plan', 'solver-worker.mjs'),
  ].filter((c) => existsSync(c));}

/**
 * Ouvre le canal et VÉRIFIE qu'il répond, sur un modèle trivial.
 *
 * Sans cette poignée de main, un worker qui meurt au démarrage — module
 * introuvable, dépendance non résoluble — reste indétectable: ses événements
 * d'erreur arrivent sur la boucle d'événements, que l'appelant bloque pendant
 * son attente. On ne verrait que des expirations, et une couverture à zéro.
 */
function ouvrir(): Canal | null {
  for (const chemin of cheminsWorker()) {
    try {
      const controleSab = new SharedArrayBuffer(4);
      const donneesSab = new SharedArrayBuffer(TAILLE_ECHANGE);
      const worker = new ConstructeurWorker(chemin, {
        workerData: { controle: controleSab, donnees: donneesSab },
      });
      // Sans cela, le worker en attente empêcherait le processus de se terminer.
      worker.unref();
      const neuf: Canal = {
        worker,
        controle: new Int32Array(controleSab),
        donnees: new Uint8Array(donneesSab),
        longueur: new Int32Array(donneesSab, 0, 1),
      };

      const essai = echanger(
        neuf,
        { optimize: 'x', opType: 'max', constraints: { c: { max: 1 } }, variables: { x: { x: 1, c: 1 } } },
        ['x'],
        1e-3,
        POIGNEE_MAIN_MS,
      );
      if (essai && !essai.interrompu) return neuf;
      void worker.terminate();
    } catch {
      // Chemin suivant: le fichier peut simplement ne pas être là.
    }
  }
  return null;
}

/** Un aller-retour avec le worker. `null` si le canal est hors d'usage. */
function echanger(
  c: Canal,
  model: unknown,
  codes: string[],
  precision: number,
  echeanceMs: number,
): BoundedSolution | null {
  const brut = new TextEncoder().encode(JSON.stringify({ model, codes, precision }));
  if (brut.length + CORPS > TAILLE_ECHANGE) return null;

  c.longueur[0] = brut.length;
  c.donnees.set(brut, CORPS);
  Atomics.store(c.controle, 0, DEMANDE);
  Atomics.notify(c.controle, 0);

  if (Atomics.wait(c.controle, 0, DEMANDE, echeanceMs) === 'timed-out') {
    return { feasible: false, valeurs: {}, interrompu: true };
  }

  try {
    const reponse = JSON.parse(
      new TextDecoder().decode(c.donnees.subarray(CORPS, CORPS + c.longueur[0])),
    ) as { feasible: boolean; valeurs: Record<string, number> };
    Atomics.store(c.controle, 0, ATTENTE);
    Atomics.notify(c.controle, 0);
    return { ...reponse, interrompu: false };
  } catch {
    return null;
  }
}

export function solveBounded(
  model: unknown,
  codes: string[],
  precision: number,
  echeanceMs: number,
): BoundedSolution {
  if (sansWorker) return enProcessus(model, codes, precision);

  if (!canal) {
    canal = ouvrir();
    if (!canal) {
      sansWorker = true;
      console.warn(
        '[solveur] worker indisponible, résolution dans le fil principal: ' +
          'le résultat reste juste, mais un modèle dégénéré peut bloquer le calcul. ' +
          'Vérifier que solver-worker.mjs est présent dans la sortie de build.',
      );
      return enProcessus(model, codes, precision);
    }
  }

  const reponse = echanger(canal, model, codes, precision, echeanceMs);

  if (!reponse) {
    // Canal hors d'usage: on le ferme et on bascule en direct pour de bon.
    void canal.worker.terminate();
    canal = null;
    sansWorker = true;
    return enProcessus(model, codes, precision);
  }

  if (reponse.interrompu) {
    // Le worker cyclait: il est inarrêtable autrement. On le termine et on
    // repart d'un canal neuf, sans quoi la mémoire partagée resterait dans un
    // état intermédiaire et la demande suivante attendrait une réponse qui ne
    // viendra jamais.
    void canal.worker.terminate();
    canal = null;
  }

  return reponse;
}
