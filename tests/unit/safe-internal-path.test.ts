import { describe, expect, it } from 'vitest';
import { safeInternalPath } from '@/lib/redirects';

/**
 * Garde anti-redirection ouverte (FR-022).
 *
 * La destination après connexion vient d'un paramètre d'URL, donc de
 * l'extérieur. Un attaquant qui pourrait y placer une adresse quelconque
 * renverrait un utilisateur tout juste authentifié vers son propre site.
 */
describe('destination interne sûre', () => {
  it('accepte un chemin interne, avec sa chaîne de requête', () => {
    expect(safeInternalPath('/historique', '/mon-profil')).toBe('/historique');
    expect(safeInternalPath('/historique?page=2', '/mon-profil')).toBe('/historique?page=2');
  });

  it('refuse une URL absolue vers un autre site', () => {
    expect(safeInternalPath('https://ailleurs.example/piege', '/mon-profil')).toBe('/mon-profil');
    expect(safeInternalPath('http://ailleurs.example', '/mon-profil')).toBe('/mon-profil');
  });

  it('refuse les formes que le navigateur lit comme une adresse absolue', () => {
    // Deux barres obliques, ou une barre oblique inverse: le navigateur y voit
    // un nom d'hôte, pas un chemin.
    expect(safeInternalPath('//ailleurs.example', '/mon-profil')).toBe('/mon-profil');
    expect(safeInternalPath('/\\ailleurs.example', '/mon-profil')).toBe('/mon-profil');
  });

  it('refuse un chemin relatif ou une valeur absente', () => {
    expect(safeInternalPath('historique', '/mon-profil')).toBe('/mon-profil');
    expect(safeInternalPath(undefined, '/mon-profil')).toBe('/mon-profil');
    expect(safeInternalPath(['/a', '/b'], '/mon-profil')).toBe('/mon-profil');
  });

  it('refuse de renvoyer vers la connexion, qui boucle', () => {
    expect(safeInternalPath('/connexion', '/mon-profil')).toBe('/mon-profil');
    expect(safeInternalPath('/connexion?next=/donnees', '/mon-profil')).toBe('/mon-profil');
  });
});
