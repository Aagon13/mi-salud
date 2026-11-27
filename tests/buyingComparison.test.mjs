import assert from 'node:assert/strict';
import test from 'node:test';
import { initialData } from '../dist/assets/data/seed.js';
import { askBuyingAdvice, compareStores, isBuyingAdviceQuestion, registerPurchase, summarizeStores } from '../dist/assets/lib/buyingAdvice.js';

function add(state, fields) {
  registerPurchase(state, {
    id: String((state.purchases ?? []).length + 1),
    product: 'Manzanas',
    store: 'Aldi',
    date: '2026-11-20',
    unit: 'ud',
    ...fields,
  }, false);
}

test('Conserva el importe más reciente, el precio comparable y la valoración de cada supermercado', () => {
  const state = initialData();
  add(state, { product: 'Manzana', quantity: 500, unit: 'g', totalPrice: 1.25, quality: 5, note: 'Muy crujiente' });
  add(state, { store: 'ALDI', totalPrice: 2.50 });
  add(state, { store: 'Lidl', quantity: 1, unit: 'kg', totalPrice: 2.30, quality: 3 });
  const stores = compareStores(state, 'manzanas');
  assert.equal(stores.length, 2);
  const aldi = stores[0];
  assert.equal(aldi.latestPurchaseId, '2');
  assert.equal(aldi.latestPaid, 2.50);
  assert.equal(aldi.latestPaidQuantity, undefined);
  assert.equal(aldi.pricePerUnit, 2.50);
  assert.equal(aldi.unitLabel, 'kg');
  assert.equal(aldi.unitPriceDate, '2026-11-20');
  assert.equal(aldi.rating, 5);
  assert.equal(aldi.ratingDate, '2026-11-20');
  assert.deepEqual(summarizeStores(stores), {cheapest: ['Lidl'], bestRated: ['ALDI'], lowestPaid: []});
  const advice = askBuyingAdvice(state, '¿En qué supermercado me salió más barata la manzana?');
  assert.equal(advice.cheapest, 'Lidl');
  assert.equal(advice.bestRated, 'ALDI');
  assert.match(advice.answer, /Muy crujiente/);
});

test('Separa lo pagado de las unidades comparables y muestra empates de valoración', () => {
  const state = initialData();
  add(state, { totalPrice: 2.00, quality: 4 });
  add(state, { store: 'Lidl', totalPrice: 1.13, quality: 4 });
  add(state, { store: 'Dia', quantity: 1, unit: 'kg', totalPrice: 0.99 });
  const results = summarizeStores(compareStores(state, 'manzana'));
  assert.deepEqual(results, {cheapest: [], bestRated: ['Aldi', 'Lidl'], lowestPaid: ['Lidl']});
  const answer = askBuyingAdvice(state, '¿Dónde me gustó más la manzana?');
  assert.match(answer.answer, /importe pagado sin cantidad indicada/);
  assert.match(answer.answer, /Aldi y Lidl/);
  assert.equal(answer.cheapest, undefined);
  assert.equal(answer.bestRated, undefined);
});

test('Evita comparar precios de formatos distintos y empata precios visibles iguales', () => {
  const state = initialData();
  add(state, { quantity: 1, label: 'bolsa', totalPrice: 2 });
  add(state, { store: 'Lidl', quantity: 1, label: 'caja', totalPrice: 2.10 });
  assert.deepEqual(summarizeStores(compareStores(state, 'manzanas')).cheapest, []);
  const equal = initialData();
  add(equal, { quantity: 1, unit: 'kg', totalPrice: 4.9 });
  add(equal, { store: 'Lidl', quantity: 500, unit: 'g', totalPrice: 2.45 });
  assert.deepEqual(summarizeStores(compareStores(equal, 'manzanas')).cheapest, ['Aldi', 'Lidl']);
});

test('Distingue preguntas de comparación de órdenes de compra o despensa', () => {
  assert.equal(isBuyingAdviceQuestion('¿Dónde me salió más barato el brócoli?'), true);
  assert.equal(isBuyingAdviceQuestion('¿En qué supermercado me gustó más el pollo?'), true);
  assert.equal(isBuyingAdviceQuestion('¿En qué supermercado es más económico el brócoli?'), true);
  assert.equal(isBuyingAdviceQuestion('Dime cuánto pagué por las manzanas'), true);
  assert.equal(isBuyingAdviceQuestion('Compra Aldi; brócoli 2 euros y patatas 3 euros'), false);
  assert.equal(isBuyingAdviceQuestion('Añade manzanas baratas a la lista'), false);
  assert.equal(isBuyingAdviceQuestion('¿Dónde tengo las manzanas?'), false);
});
