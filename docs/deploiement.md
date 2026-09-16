# Déploiement

## Pourquoi pas GitHub Pages

GitHub Pages ne sert que des fichiers statiques, ce qui imposerait `output: 'export'`.
La documentation de Next 16 embarquée dans le projet range parmi les fonctionnalités non
supportées dans ce mode: les cookies, le proxy, et les route handlers qui s'appuient sur la
requête. C'est le socle de cette application. Le build le confirme: les seize routes sont
marquées `ƒ (Dynamic)`, aucune n'est statique.

Un export statique supprimerait le calcul des besoins, la génération de liste, l'historique,
l'export RGPD, la confirmation d'e-mail et la protection des routes. Il faut donc un hébergeur
capable d'exécuter du code serveur. Ce guide décrit Vercel; Cloudflare et Netlify conviennent
aussi, via un adaptateur.

## Mise en place sur Vercel

### 1. Importer le dépôt

Sur vercel.com, *Add New → Project*, importer `Dratatin/feedmyass`. Le framework est détecté
automatiquement: commande de build `next build`, rien à surcharger. `package.json` déclare
`engines.node >= 22`, que Vercel respecte.

### 2. Variables d'environnement

Trois variables, à définir pour les environnements *Production*, *Preview* et *Development*.

| Variable | Exposée au navigateur | Sans elle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | oui | Le proxy se désactive en silence et l'en-tête affiche l'état visiteur: le site paraît fonctionner, mais personne ne peut se connecter |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | oui | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | **non, jamais** | `DELETE /api/account` échoue: la suppression de compte exigée par FR-029 n'est plus tenue |

La clé *service role* contourne les politiques RLS. Elle ne doit jamais être préfixée
`NEXT_PUBLIC_`, sous peine d'être inlinée dans le bundle navigateur et donc publique. Elle n'est
lue qu'à un seul endroit, `src/app/api/account/route.ts`.

### 3. Base de données

Les migrations et les données de référence ne sont pas jouées par le déploiement. Contre le
projet Supabase cible, une fois:

```bash
supabase db push        # schéma et politiques RLS
npm run seed:reference  # nutrients, reference_intakes, foods, seasonality
```

### 4. URLs de retour Supabase

Sans déclaration, le fournisseur refuse de rediriger: le lien de confirmation d'e-mail
n'atteint jamais `/auth/callback`, et un compte confirmé reste inutilisable.

Deux façons de s'en occuper:

- **Intégration Vercel de Supabase** (recommandée): elle écoute les webhooks de déploiement et
  met à jour les *Redirect URLs* pour le domaine principal comme pour chaque préversion.
- **À la main**, dans Authentication → URL Configuration:
  - *Site URL*: l'URL de production.
  - *Redirect URLs*: `https://<domaine-de-production>/auth/callback` en exact, plus un motif
    pour les préversions, dont l'URL change à chaque déploiement. Supabase accepte les
    caractères génériques (`*` sur un niveau, `**` sur plusieurs), les séparateurs étant `.`
    et `/`. La documentation recommande de garder une URL exacte en production.

### 5. Vérifier après le premier déploiement

1. Ouvrir l'accueil: l'en-tête affiche « Connexion ».
2. Créer un compte, ouvrir le lien reçu par e-mail: il ramène connecté sur l'application.
   C'est le point qui casse en premier si l'étape 4 a été oubliée.
3. Calculer des besoins, enregistrer le résultat, le retrouver dans l'historique.
4. Supprimer le compte: vérifie du même coup la clé *service role*.

C'est le scénario V5 de `specs/001-nutrition-ingredient-planner/quickstart.md`, joué contre
l'environnement déployé.

## Préversions par pull request

Vercel construit une préversion à chaque push sur une branche ouverte en PR, et le déploiement
de production suit les push sur `main`. Aucun fichier de workflow n'est nécessaire: la connexion
du dépôt suffit. Les préversions pointent vers la même base Supabase que la production tant
qu'on ne leur donne pas des variables distinctes — à garder en tête avant de tester une
suppression de compte depuis une préversion.

## Points d'attention

- **Région**: la latence dépend de la distance entre les fonctions Vercel et le projet Supabase.
  Si la base est en Europe, aligner la région du projet Vercel (par exemple `cdg1`, Paris).
- **Aucune intégration continue n'est en place**: rien ne rejoue lint, typecheck et tests avant
  un déploiement. Les commandes de vérification sont listées dans `quickstart.md`.
