/**
 * Vignettes potagères.
 *
 * Huit dessins, définis une seule fois en `<symbol>` par `VignetteSprite` et
 * appelés par `<use>`: aucun fichier d'image, aucune requête supplémentaire.
 * Les couleurs sont celles des familles d'aliments (docs/design-system.md).
 *
 * Les vignettes sont purement décoratives — elles accompagnent un nom écrit, ne
 * le remplacent jamais — d'où `aria-hidden` sur chaque usage.
 */

export type VignetteName =
  | 'pomme'
  | 'figue'
  | 'courgette'
  | 'prune'
  | 'chou'
  | 'epinard'
  | 'poire'
  | 'champignon';

/** À rendre une fois par page, dans l'en-tête commun. */
export function VignetteSprite() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <symbol id="v-pomme" viewBox="0 0 32 32">
        <path
          d="M16 11c4-3 10-1 10 6 0 6-4 12-10 12S6 23 6 17c0-7 6-9 10-6z"
          fill="var(--color-famille-fruit)"
        />
        <path d="M16 11V6" stroke="var(--color-famille-coque)" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 8c2-3 5-3 7-2-1 3-4 4-7 2z" fill="var(--color-famille-legume)" />
      </symbol>

      <symbol id="v-figue" viewBox="0 0 32 32">
        <path
          d="M16 9c6 0 9 5 9 10a9 9 0 0 1-18 0c0-5 3-10 9-10z"
          fill="var(--color-famille-proteine)"
        />
        <path
          d="M16 9c0-3 1-5 3-6"
          stroke="var(--color-famille-legume)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M16 6c3-2 6-1 7 0-2 2-5 2-7 0z" fill="var(--color-famille-legume)" />
      </symbol>

      <symbol id="v-courgette" viewBox="0 0 32 32">
        <rect
          x="5"
          y="12"
          width="22"
          height="13"
          rx="6.5"
          fill="var(--color-famille-legume)"
          transform="rotate(-12 16 18)"
        />
        <path
          d="M24 9l3-3"
          stroke="var(--color-famille-cereale)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </symbol>

      <symbol id="v-prune" viewBox="0 0 32 32">
        <ellipse cx="16" cy="19" rx="9" ry="10" fill="var(--color-famille-proteine)" />
        <path
          d="M16 9c1-3 3-4 5-4"
          stroke="var(--color-famille-legume)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </symbol>

      <symbol id="v-chou" viewBox="0 0 32 32">
        <circle cx="16" cy="17" r="11" fill="var(--color-famille-legume)" />
        <path
          d="M16 6v22M6 17h20M9 10l14 14M23 10L9 24"
          stroke="var(--color-saison-wash)"
          strokeWidth="1.5"
          opacity="0.7"
        />
      </symbol>

      <symbol id="v-epinard" viewBox="0 0 32 32">
        <path
          d="M16 27C9 24 5 18 6 8c9-1 15 4 16 12 0 4-2 6-6 7z"
          fill="var(--color-famille-legume)"
        />
        <path
          d="M16 27C14 20 12 14 8 10"
          stroke="var(--color-saison-wash)"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </symbol>

      <symbol id="v-poire" viewBox="0 0 32 32">
        <path
          d="M16 8c3 0 4 3 3 6 3 2 5 5 5 9a8 8 0 0 1-16 0c0-4 2-7 5-9-1-3 0-6 3-6z"
          fill="var(--color-famille-cereale)"
        />
        <path d="M16 8V4" stroke="var(--color-famille-coque)" strokeWidth="2" strokeLinecap="round" />
      </symbol>

      <symbol id="v-champignon" viewBox="0 0 32 32">
        <path d="M6 16c0-6 4-9 10-9s10 3 10 9z" fill="var(--color-famille-coque)" />
        <path d="M13 16h6v9a3 3 0 0 1-6 0z" fill="var(--color-line)" />
      </symbol>
    </svg>
  );
}

export function Vignette({ name, size = 30 }: { name: VignetteName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <use href={'#v-' + name} />
    </svg>
  );
}
