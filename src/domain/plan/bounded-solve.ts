import fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * Au-delà de l'échéance, le modèle est déclaré infaisable. Ce n'est pas un aveu
 * d'échec: la relaxation sait traiter ce cas, elle nomme les nutriments hors
 * d'atteinte et l'écran de couverture explique qu'un complément sera sans doute
 * nécessaire. Mieux vaut un écart nommé qu'une page qui ne répond plus.
 */

/** Taille de la zone d'échange. Un modèle de 250 aliments pèse ~1 Mo en JSON. */
const TAILLE_ECHANGE = 16 * 1024 * 1024;
const CORPS = 4;

const ATTENTE = 0;
const DEMANDE = 1;
// L'état 2 (réponse posée) n'est pas nommé ici: l'appelant ne le teste jamais,
// il se contente de sortir de son attente. Il est décrit dans solver-worker.mjs.

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

/**
 * Où trouver le fichier du worker.
 *
 * Sous Vitest ou en script, `import.meta.url` désigne ce module et le worker est
 * son voisin. Sous Next.js, ce module est empaqueté ailleurs et le voisinage ne
 * tient plus: il faut retomber sur le chemin du dépôt. Chercher aux deux
 * endroits évite d'avoir à configurer le traçage de fichiers du bundler, et
 * rate bruyamment plutôt que de laisser un worker introuvable produire une page
 * vide.
 */
function cheminWorker(): string {
  const candidats = [
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'solver-worker.mjs'),
    path.join(process.cwd(), 'src', 'domain', 'plan', 'solver-worker.mjs'),
  ];
  const trouve = candidats.find((c) => fs.existsSync(c));
  if (!trouve) {
    throw new Error(
      'solver-worker.mjs introuvable. Cherché: ' + candidats.join(', '),
    );
  }
  return trouve;
}

function ouvrir(): Canal {
  const controleSab = new SharedArrayBuffer(4);
  const donneesSab = new SharedArrayBuffer(TAILLE_ECHANGE);
  const worker = new Worker(cheminWorker(), {
    workerData: { controle: controleSab, donnees: donneesSab },
  });
  // Sans cela, le worker en attente empêcherait le processus de se terminer.
  worker.unref();
  return {
    worker,
    controle: new Int32Array(controleSab),
    donnees: new Uint8Array(donneesSab),
    longueur: new Int32Array(donneesSab, 0, 1),
  };
}

/**
 * Le worker cyclait: il est inarrêtable autrement. On le termine et on repart
 * d'un canal neuf, sans quoi la mémoire partagée resterait dans un état
 * intermédiaire et la demande suivante attendrait une réponse qui ne viendra
 * jamais.
 */
function fermer(): void {
  if (!canal) return;
  void canal.worker.terminate();
  canal = null;
}

export function solveBounded(
  model: unknown,
  codes: string[],
  precision: number,
  echeanceMs: number,
): BoundedSolution {
  if (!canal) canal = ouvrir();

  const brut = new TextEncoder().encode(JSON.stringify({ model, codes, precision }));
  if (brut.length + CORPS > TAILLE_ECHANGE) {
    // Un modèle qui ne tient pas dans la zone d'échange est un cas qu'on préfère
    // voir plutôt que contourner en silence.
    throw new Error('Modèle trop volumineux pour la zone d\'échange du solveur');
  }

  canal.longueur[0] = brut.length;
  canal.donnees.set(brut, CORPS);
  Atomics.store(canal.controle, 0, DEMANDE);
  Atomics.notify(canal.controle, 0);

  const issue = Atomics.wait(canal.controle, 0, DEMANDE, echeanceMs);
  if (issue === 'timed-out') {
    fermer();
    return { feasible: false, valeurs: {}, interrompu: true };
  }

  const reponse = JSON.parse(
    new TextDecoder().decode(canal.donnees.subarray(CORPS, CORPS + canal.longueur[0])),
  ) as { feasible: boolean; valeurs: Record<string, number> };
  Atomics.store(canal.controle, 0, ATTENTE);
  Atomics.notify(canal.controle, 0);

  return { ...reponse, interrompu: false };
}
