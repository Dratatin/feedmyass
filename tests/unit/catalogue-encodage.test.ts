import { describe, expect, it } from 'vitest';
import foodsJson from '@/data/reference/foods.json';
import seasonalityJson from '@/data/reference/seasonality.json';

/**
 * Encodage des libellés et vivacité des fruits et légumes (feature 003).
 *
 * Les millésimes de CIQUAL ne sont pas encodés de la même façon — windows-1252
 * en 2020, UTF-8 avec BOM en 2025 — et décoder les seconds comme les premiers
 * corrompt silencieusement tous les accents. Le défaut ne casse rien: il produit
 * un catalogue lisible en apparence, où « Épinard » s'écrit « Ã‰pinard ».
 */

const foods = foodsJson.foods as { code: string; label: string; is_fruit_vegetable: boolean }[];

describe('encodage des libellés (FR-212)', () => {
  it('ne laisse passer aucune séquence de mojibake', () => {
    // Signatures d'un UTF-8 relu en latin-1: é -> Ã©, è -> Ã¨, à -> Ã .
    const fautifs = foods.filter((f) => /Ã.|Â.|â€/.test(f.label)).map((f) => f.label);
    expect(fautifs).toEqual([]);
  });

  it('porte bien des accents, preuve que le décodage a eu lieu', () => {
    // Un décodage raté dans l'autre sens produirait des libellés sans accent du
    // tout: l'absence de mojibake ne suffit pas à conclure.
    expect(foods.some((f) => /[éèêàçôîû]/i.test(f.label))).toBe(true);
  });
});

describe('vivacité des fruits et légumes (FR-014)', () => {
  /**
   * Un fruit ou légume sans mois de saison ne sera jamais proposé (FR-014). Il
   * y a deux raisons très différentes de se trouver dans ce cas, et une seule
   * est acceptable.
   *
   * Acceptable: l'aliment n'a réellement aucune saison en France — banane,
   * mangue, litchi. L'absence est une information, et l'écran de saison la
   * présente comme telle.
   *
   * Inacceptable: l'espèce n'a pas été appariée au calendrier. C'est un trou de
   * données, et l'aliment serait mort au catalogue sans que personne le voie.
   */
  it('ne garde sans saison que des aliments explicitement sans saison en France', () => {
    const avecSaison = new Set(seasonalityJson.seasonality.map((r) => r.food_code));
    const sansSaison = foods.filter((f) => f.is_fruit_vegetable && !avecSaison.has(f.code));

    // La liste est documentée dans scripts/lib/produce-calendar.mjs; on la
    // reconnaît ici sur l'espèce, sans la dupliquer terme à terme.
    const attendus = /banane|canneberge|citron vert|fruit de la passion|litchi|mangue|pissenlit|pousse de "soja"/i;
    const inattendus = sansSaison.filter((f) => !attendus.test(f.label)).map((f) => f.label);
    expect(inattendus).toEqual([]);
    // Et la section « Sans saison en France » de l'écran de saison doit avoir
    // quelque chose à montrer, sans quoi elle disparaîtrait en silence.
    expect(sansSaison.length).toBeGreaterThan(0);
  });

  it('couvre les douze mois', () => {
    const mois = new Set(seasonalityJson.seasonality.map((r) => r.month));
    expect([...mois].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
