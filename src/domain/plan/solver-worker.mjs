/**
 * Résolution du programme linéaire, à l'écart du fil principal.
 *
 * Le simplexe de javascript-lp-solver peut CYCLER sur une instance dégénérée et
 * ne jamais rendre la main (voir specs/003-catalogue-pertinence/research.md,
 * R16). Un appel synchrone ne s'interrompt pas de l'extérieur: tant que le
 * solveur tournait dans le fil principal, un régime végane sans gluten gelait la
 * boucle d'événements de Node — et donc TOUTES les requêtes du serveur, y
 * compris celles qui ne touchaient pas au calcul.
 *
 * Ici il tourne dans un worker, que l'appelant peut terminer. Le dialogue passe
 * par mémoire partagée et non par `postMessage`: l'appelant est bloqué sur
 * `Atomics.wait` pendant l'attente, donc sa boucle d'événements ne tourne pas et
 * ne pourrait recevoir aucun message.
 *
 * Protocole, sur `controle[0]`:
 *   0  worker en attente d'une demande
 *   1  demande posée par l'appelant
 *   2  réponse posée par le worker
 */
import { workerData } from 'node:worker_threads';
import solver from 'javascript-lp-solver';

const controle = new Int32Array(workerData.controle);
const donnees = new Uint8Array(workerData.donnees);
const decodeur = new TextDecoder();
const encodeur = new TextEncoder();

/** Longueur utile écrite sur les quatre premiers octets de la zone de données. */
const longueur = new Int32Array(workerData.donnees, 0, 1);
const CORPS = 4;

const solve = solver.Solve.bind(solver);

const DEMANDE = 1;

for (;;) {
  // Attendre qu'une demande soit POSÉE, et pas simplement que l'état diffère de
  // zéro. `Atomics.wait` ne bloque que si la valeur observée est celle qu'on lui
  // passe: guetter le zéro faisait repartir le worker aussitôt après sa propre
  // réponse — état 2 — sur une demande déjà traitée, qu'il resolvait en boucle
  // en écrasant la zone d'échange.
  for (;;) {
    const etat = Atomics.load(controle, 0);
    if (etat === DEMANDE) break;
    Atomics.wait(controle, 0, etat);
  }

  let reponse;
  try {
    const modele = JSON.parse(decodeur.decode(donnees.subarray(CORPS, CORPS + longueur[0])));
    const solution = solve(modele.model, modele.precision);
    // Seules les quantités comptent: renvoyer la solution entière ferait passer
    // par la mémoire partagée des tableaux internes du solveur, sans usage.
    reponse = { feasible: Boolean(solution.feasible), valeurs: {} };
    if (solution.feasible) {
      for (const code of modele.codes) {
        const q = solution[code];
        if (typeof q === 'number') reponse.valeurs[code] = q;
      }
    }
  } catch (err) {
    reponse = { feasible: false, valeurs: {}, erreur: String(err?.message ?? err) };
  }

  const brut = encodeur.encode(JSON.stringify(reponse));
  longueur[0] = brut.length;
  donnees.set(brut, CORPS);
  Atomics.store(controle, 0, 2);
  Atomics.notify(controle, 0);
}
