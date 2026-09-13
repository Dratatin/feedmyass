import type { Needs } from '@/domain/types';

/**
 * Transport du résultat entre l'écran de saisie et l'écran de résultats.
 *
 * Stockage de session du navigateur, volontairement provisoire: le mode invité
 * prévoit un stockage serveur à durée de vie courte (décision R8), qui arrivera
 * avec le rattachement au compte (T056). Cette couche isole les écrans de ce
 * changement à venir.
 *
 * L'API est celle d'un store externe (`subscribe` + `getSnapshot`) pour être
 * consommée par `useSyncExternalStore`: c'est la façon prévue par React de lire
 * une source hors React sans provoquer de rendus en cascade.
 */

const KEY = 'feedmyass.needs';

export type StoredNeeds = {
  needs: Needs;
  disclaimer: string;
  profileSummary: string;
};

// getSnapshot doit renvoyer une référence stable tant que la donnée n'a pas
// changé, sinon React boucle. On mémorise donc la chaîne brute et l'objet parsé.
let cachedRaw: string | null = null;
let cachedValue: StoredNeeds | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function storeNeeds(value: StoredNeeds): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
    notify();
  } catch {
    // Stockage indisponible (navigation privée, cookies bloqués): l'écran de
    // résultats invitera simplement à refaire la saisie.
  }
}

export function subscribeNeeds(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function getNeedsSnapshot(): StoredNeeds | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as StoredNeeds) : null;
    } catch {
      cachedValue = null;
    }
  }
  return cachedValue;
}

/** Instantané côté serveur: aucune session navigateur au rendu initial. */
export function getNeedsServerSnapshot(): StoredNeeds | null {
  return null;
}
