/** Vérification rapide des repositories de référence contre la base. */
import { fetchNutrients, fetchReferenceIntakes, fetchFoods, fetchReferenceVersions } from '../src/data/repositories/reference';

const main = async () => {
  const nutrients = await fetchNutrients();
  console.log('nutriments          :', nutrients.length, '| prioritaires:', nutrients.filter((n) => n.isPriority).length);

  const intakes = await fetchReferenceIntakes('female', 34);
  console.log('apports femme 34 ans:', intakes.length);
  const iron = intakes.find((i) => i.nutrientCode === 'iron');
  const protein = intakes.find((i) => i.nutrientCode === 'protein');
  const lipids = intakes.find((i) => i.nutrientCode === 'lipids');
  console.log('  fer      :', iron?.value, iron?.kind, iron?.basis);
  console.log('  protéines:', protein?.value, protein?.kind, protein?.basis);
  console.log('  lipides  :', lipids?.value, '->', lipids?.valueMax, lipids?.basis);

  const all = await fetchFoods();
  const january = await fetchFoods(1);
  const august = await fetchFoods(8);
  console.log('aliments (sans filtre saison) :', all.length);
  console.log('aliments disponibles en janvier:', january.length);
  console.log('aliments disponibles en août   :', august.length);
  const tomatoJan = january.find((f) => f.label.startsWith('Tomate'));
  const tomatoAug = august.find((f) => f.label.startsWith('Tomate'));
  console.log('  tomate en janvier:', tomatoJan ? 'PRÉSENTE (problème)' : 'absente (correct)');
  console.log('  tomate en août   :', tomatoAug ? 'présente (correct)' : 'ABSENTE (problème)');

  console.log('versions de référence:', JSON.stringify(await fetchReferenceVersions()));
};

main().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
