import type { Route } from 'next';

/**
 * Destination interne sûre.
 *
 * Le parcours de connexion transporte la page demandée dans l'URL
 * (`/connexion?next=/historique`). Utiliser ce paramètre tel quel ouvrirait une
 * redirection ouverte: un lien `?next=https://ailleurs.example` renverrait
 * l'utilisateur fraîchement authentifié vers un site tiers, qui n'aurait plus
 * qu'à imiter cette application pour lui réclamer ses identifiants.
 *
 * Seuls les chemins absolus de CE site sont acceptés. Les navigateurs traitent
 * `//ailleurs.example` et `/\ailleurs.example` comme des URL absolues: ce ne
 * sont donc pas des chemins internes, malgré leur barre oblique initiale.
 */
export function safeInternalPath(value: unknown, fallback: string): Route {
  if (typeof value !== 'string' || value === '') return fallback as Route;
  if (!value.startsWith('/')) return fallback as Route;
  if (/^\/[/\\]/.test(value)) return fallback as Route;
  // Renvoyer vers la connexion après s'être connecté boucle sans fin.
  if (value === '/connexion' || value.startsWith('/connexion?')) return fallback as Route;
  return value as Route;
}
