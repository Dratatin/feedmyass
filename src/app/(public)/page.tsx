/**
 * Accueil. Écran d'entrée du parcours public: le calcul des besoins et la liste
 * d'ingrédients sont accessibles sans compte (FR-024).
 *
 * Les appels à l'action vers /profil et /besoins seront ajoutés avec ces écrans
 * (tâches T032 et T033). `typedRoutes` refuse tout lien vers une route
 * inexistante, ce qui évite les liens morts.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-12">
      <h1 className="text-display-sm font-semibold text-neutral-900">
        Vos besoins nutritionnels, et de quoi les couvrir
      </h1>
      <p className="text-md text-neutral-600">
        Renseignez votre profil pour obtenir vos besoins journaliers et hebdomadaires, puis la liste
        des ingrédients de saison qui permettent de les couvrir. Aucun compte n&apos;est nécessaire
        pour commencer.
      </p>
      <p className="text-sm text-neutral-500">
        Estimation informative établie à partir de références nutritionnelles officielles. Ce
        service ne fournit ni diagnostic, ni conseil médical personnalisé.
      </p>
    </main>
  );
}
