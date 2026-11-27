import test from 'node:test';
import assert from 'node:assert/strict';
import { initialData } from '../dist/assets/data/seed.js';
import { monthSpending, registerPurchase, unitPrice } from '../dist/assets/lib/buyingAdvice.js';
import { addToPantry, computeCoverage, enoughForRecipe } from '../dist/assets/lib/planner.js';
import { applyQuickCommand, markOut, markPresent, markStockLow, purchase, shoppingList } from '../dist/assets/lib/shopping.js';

test('Una compra sin cantidad cuenta como gasto y presencia, sin inventar existencias', () => {
  const state = initialData();
  state.groceries.push({ id: 'pendiente', name: 'Patatas', quantity: 1, unit: 'kg' });
  registerPurchase(state, { id: 'compra', date: '2026-11-26', product: 'Patata', store: 'Aldi', unit: 'ud', totalPrice: 3 });

  assert.equal(state.pantry[0].stockStatus, 'available');
  assert.equal(state.pantry[0].quantity, 0);
  assert.equal(state.purchases[0].quantity, undefined);
  assert.equal(unitPrice(state.purchases[0]), null);
  assert.deepEqual(monthSpending(state, '2026-11'), { total: 3, entries: 1 });
  assert.deepEqual(shoppingList(state), []);

  const recipe = { id: 'patata', name: 'Patata', servings: 1, ingredients: [{ name: 'Patata', quantity: 1, unit: 'ud' }] };
  state.recipes.push(recipe);
  state.plan.push({ id: '2026-11-23:comida', date: '2026-11-23', kind: 'comida', recipeId: recipe.id, servings: 1 });
  assert.equal(enoughForRecipe(recipe, state.pantry, 1).ok, false);
  assert.deepEqual(computeCoverage(state, '2026-11-23').missing, recipe.ingredients);
});

test('Queda poco solo marca el estado y Agotado apunta una reposición una sola vez', () => {
  const state = initialData();
  markPresent(state, 'Brócoli');
  const id = state.pantry[0].id;
  markStockLow(state, id);
  assert.equal(state.pantry[0].stockStatus, 'low');
  assert.deepEqual(shoppingList(state), []);

  markOut(state, 'Brócoli', id);
  markOut(state, 'Brócoli', id);
  assert.equal(state.pantry[0].stockStatus, undefined);
  assert.equal(state.pantry[0].quantity, 0);
  assert.equal(shoppingList(state).length, 1);

  markPresent(state, 'Brocoli');
  assert.equal(state.pantry.length, 1);
  assert.equal(state.pantry[0].stockStatus, 'available');
  assert.deepEqual(shoppingList(state), []);
});

test('Marcar un formato agotado conserva las existencias de los otros formatos', () => {
  const state = initialData();
  addToPantry(state, 'Tomate', 3, 'ud');
  addToPantry(state, 'Tomate', 500, 'g');
  markStockLow(state, state.pantry[1].id);
  markOut(state, 'Tomate', state.pantry[1].id);
  assert.deepEqual(state.pantry.map(item => item.quantity), [3, 0]);
  assert.equal(shoppingList(state)[0].unit, 'g');
});

test('El estado manual conserva las cantidades medidas y una nueva cantidad vuelve a ser la referencia', () => {
  const state = initialData();
  purchase(state, 'Huevos', 6, 'ud');
  markPresent(state, 'huevo');
  assert.equal(state.pantry.length, 1);
  assert.equal(state.pantry[0].quantity, 6);
  markStockLow(state, state.pantry[0].id);
  applyQuickCommand(state, 'Me quedan 3 huevos');
  assert.equal(state.pantry[0].quantity, 3);
  assert.equal(state.pantry[0].stockStatus, undefined);

  markStockLow(state, state.pantry[0].id);
  purchase(state, 'Huevos', 6, 'ud');
  assert.equal(state.pantry[0].quantity, 9);
  assert.equal(state.pantry[0].stockStatus, undefined);
});
