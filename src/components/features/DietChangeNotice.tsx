import { Banner } from '@/components/ds/Banner';

/**
 * Message affiché après un changement de régime (US4).
 *
 * Il rend visible à l'utilisateur ce que le principe III garantit dans le code:
 * changer de régime recompose la liste d'ingrédients et ne touche pas aux
 * besoins. Sans ce message, l'invariant resterait une propriété interne que
 * personne ne constate.
 */
export function DietChangeNotice({ previousDiet, currentDiet }: {
  previousDiet: string;
  currentDiet: string;
}) {
  return (
    <Banner title="Vos besoins n'ont pas changé">
      Vous êtes passé du régime <strong>{previousDiet}</strong> au régime{' '}
      <strong>{currentDiet}</strong>. Seule la liste d&apos;ingrédients est recomposée&nbsp;: vos
      besoins nutritionnels dépendent de votre poids, de votre âge, de votre sexe de référence et de
      votre niveau d&apos;activité, jamais de votre régime.
    </Banner>
  );
}
