import test from 'node:test';
import assert from 'node:assert/strict';
import { initialData } from '../dist/assets/data/seed.js';
import { applyVoicePlan, parseVoicePlan } from '../dist/assets/lib/unifiedAssistant.js';

test('Dictado seguido con supermercado y precios sin cantidades', () => {
  const state = initialData();
  const plan = parseVoicePlan(state, 'compra Aldi bolsa brócoli 2€, patatas 3€, esparragos 5euros');
  assert.equal(plan.store, 'Aldi');
  assert.deepEqual(plan.items.map(item => [item.command.name, item.totalPrice, item.quantityUnknown]), [
    ['brócoli', 2, true],
    ['patatas', 3, true],
    ['esparragos', 5, true],
  ]);
  assert.equal(plan.items[0].label, 'bolsa');
  applyVoicePlan(state, plan);
  assert.deepEqual(state.purchases.map(item => item.quantity), [undefined, undefined, undefined]);
  assert.equal(state.purchases.reduce((sum, item) => sum + item.totalPrice, 0), 10);
  assert.deepEqual(state.pantry.map(item => [item.name, item.quantity]), [
    ['brócoli', 0],
    ['patatas', 0],
    ['esparragos', 0],
  ]);
});

test('Separa precios seguidos sin comas y conserva cantidades indicadas', () => {
  const plan = parseVoicePlan(initialData(), 'compra aldi bolsa de brócoli 2,25 euros patata 3 € y 1 kilo de espárragos 5 euros.');
  assert.equal(plan.store, 'Aldi');
  assert.deepEqual(plan.items.map(item => [item.command.name, item.totalPrice, item.quantityUnknown]), [
    ['brócoli', 2.25, true],
    ['patata', 3, true],
    ['espárragos', 5, undefined],
  ]);
  assert.deepEqual(plan.items[2].command, { action: 'bought', name: 'espárragos', quantity: 1, unit: 'kg' });
});

test('Interpreta precio por pieza si el dictado indica cuántas hay', () => {
  const plan = parseVoicePlan(initialData(), 'He comprado dos yogures a 1,50 euros cada uno en Lidl.');
  assert.equal(plan.store, 'Lidl');
  assert.deepEqual(plan.items[0].command, { action: 'bought', name: 'yogures', quantity: 2, unit: 'ud' });
  assert.equal(plan.items[0].totalPrice, 3);
  assert.throws(() => parseVoicePlan(initialData(), 'Compra Aldi yogures 1,50 euros cada uno'), /cuántas unidades/);
});

test('Acepta importes en palabras sin separar manualmente cada compra', () => {
  const plan = parseVoicePlan(initialData(), 'Compra Aldi bolsa brócoli dos euros patatas tres euros y espárragos cinco euros');
  assert.deepEqual(plan.items.map(item => [item.command.name, item.totalPrice]), [
    ['brócoli', 2],
    ['patatas', 3],
    ['espárragos', 5],
  ]);
  const decimals = parseVoicePlan(initialData(), 'Compra Aldi pan un euro con veinte patatas 2 euros con 50 arroz dos euros y cuarenta y cinco céntimos harina dos euros con cuarenta y dos');
  assert.deepEqual(decimals.items.map(item => [item.command.name, item.totalPrice]), [
    ['pan', 1.20],
    ['patatas', 2.50],
    ['arroz', 2.45],
    ['harina', 2.42],
  ]);
});

test('Rechaza importes ambiguos o inválidos antes de cambiar datos', () => {
  const state = initialData();
  const before = structuredClone(state);
  for (const message of [
    'Compra Aldi patatas y espárragos 5 euros en total',
    'Compra Aldi 2 patatas y espárragos 5 €',
    'Compra Aldi patatas -2€',
    'Compra Aldi patatas 2,500 euros',
    'Compra Aldi patatas por muchos euros',
    'Compra Aldi patatas por menos dos euros',
    'Compra Aldi patatas 2 euros y en total 2 euros',
    'Compra Aldi patatas 2 €; espárragos 3 € en Lidl',
  ]) {
    assert.throws(() => parseVoicePlan(state, message), Error, message);
    assert.deepEqual(state, before);
  }
});
