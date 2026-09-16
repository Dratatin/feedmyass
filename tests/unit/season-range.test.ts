import { describe, expect, it } from 'vitest';
import { seasonRangeLabel, seasonOfMonth, ribbonLabel } from '@/lib/months';

/**
 * Période de disponibilité affichée en trois mots (FR-107, FR-127).
 *
 * Le calendrier de saison ne se lit pas comme une liste triée: un chou frisé
 * disponible en septembre, octobre, décembre et janvier est de saison « Sep →
 * Jan », pas « Jan, Sep, Oct, Déc ». Le passage de décembre à janvier est le
 * cas qui casse toutes les implémentations naïves, d'où ces contrôles.
 */
describe('seasonRangeLabel', () => {
  it('résume une période continue par ses deux bornes', () => {
    expect(seasonRangeLabel([6, 7, 8, 9])).toBe('Juin → Sep');
  });

  it('recolle une période qui enjambe le changement d\'année', () => {
    expect(seasonRangeLabel([9, 10, 11, 12, 1])).toBe('Sep → Jan');
    expect(seasonRangeLabel([12, 1, 2])).toBe('Déc → Fév');
  });

  it('signale une disponibilité discontinue', () => {
    // Le champignon est répertorié en septembre et en novembre: « Sep » seul
    // laisserait croire qu'il disparaît ensuite.
    expect(seasonRangeLabel([9, 11])).toBe('Sep +');
  });

  it('nomme les douze mois plutôt que de les énumérer', () => {
    expect(seasonRangeLabel([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe("Toute l'année");
  });

  it('accepte un mois isolé et une liste vide', () => {
    expect(seasonRangeLabel([3])).toBe('Mar');
    expect(seasonRangeLabel([])).toBe('');
  });

  it('ignore l\'ordre de la liste reçue', () => {
    expect(seasonRangeLabel([8, 6, 9, 7])).toBe(seasonRangeLabel([6, 7, 8, 9]));
  });
});

describe('saisons', () => {
  it('range chaque mois dans sa saison, décembre avec l\'hiver', () => {
    expect(seasonOfMonth(1)).toBe('hiver');
    expect(seasonOfMonth(4)).toBe('printemps');
    expect(seasonOfMonth(7)).toBe('ete');
    expect(seasonOfMonth(10)).toBe('automne');
    expect(seasonOfMonth(12)).toBe('hiver');
  });
});

describe('ribbonLabel', () => {
  it('nomme les mois en toutes lettres pour un lecteur d\'écran (FR-104)', () => {
    expect(ribbonLabel(9, [7, 8, 9])).toBe(
      'De saison en juillet, août, septembre. Mois en cours : septembre.',
    );
  });

  it('se limite à la date du jour quand aucun mois n\'est fourni', () => {
    expect(ribbonLabel(2)).toBe('Calendrier des douze mois, février en cours.');
  });
});
