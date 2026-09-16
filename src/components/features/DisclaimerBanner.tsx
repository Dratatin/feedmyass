import { Banner } from '@/components/ds/Banner';

/**
 * Mention exigée par FR-010 et FR-011, à afficher sur TOUT écran de résultat.
 *
 * Le principe IV de la constitution en fait une obligation permanente: le texte
 * est centralisé ici pour qu'aucun écran ne puisse l'oublier ou le reformuler.
 */
export function DisclaimerBanner() {
  return (
    <Banner title="Estimation informative">
      Ces valeurs sont établies à partir de références nutritionnelles officielles. Ce service ne
      fournit ni diagnostic, ni conseil médical personnalisé. Les situations particulières
      (grossesse, allaitement, pathologie, personnes mineures) ne sont pas couvertes&nbsp;:
      parlez-en à un professionnel de santé.
    </Banner>
  );
}
