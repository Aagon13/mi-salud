import test from 'node:test';
import assert from 'node:assert/strict';
import { recipePantryStatus } from '../dist/assets/lib/planner.js';

function status(ingredients, pantry) {
  const recipe = { id: 'batido', name: 'Batido', servings: 2, ingredients };
  return recipePantryStatus(recipe, pantry);
}

function stock(name, quantity, unit, stockStatus) {
  return { id: name, name, quantity, unit, stockStatus, updatedAt: '2026-11-27T12:00:00Z' };
}

test('Una receta habitual combina ingredientes repetidos y unidades equivalentes', () => {
  const ingredients = [
    { name: 'Plátano', quantity: 1, unit: 'ud' },
    { name: 'Leche', quantity: 0.2, unit: 'l' },
    { name: 'Leche', quantity: 100, unit: 'ml' },
  ];
  const pantry = [stock('platanos', 1, 'ud'), stock('Leche', 0.25, 'l')];

  assert.deepEqual(status(ingredients, pantry), {
    missing: [{ name: 'Leche', quantity: 50, unit: 'ml' }],
    check: [],
  });
});

test('Se avisa cuando un ingrediente está agotado o no figura en la despensa', () => {
  const ingredients = [
    { name: 'Avena', quantity: 0.05, unit: 'kg' },
    { name: 'Cacao', quantity: 10, unit: 'g' },
  ];

  assert.deepEqual(status(ingredients, [stock('Avena', 0, 'g')]), {
    missing: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Cacao', quantity: 10, unit: 'g' },
    ],
    check: [],
  });
});

test('La presencia sin cantidad y el estado queda poco piden revisar antes de afirmar que falta', () => {
  const ingredients = [
    { name: 'Plátano', quantity: 2, unit: 'ud' },
    { name: 'Yogur', quantity: 1, unit: 'ud' },
    { name: 'Leche', quantity: 100, unit: 'ml' },
  ];
  const pantry = [
    stock('Plátano', 0, 'ud', 'available'),
    stock('Yogur', 2, 'ud', 'low'),
    stock('Leche', 1, 'ud'),
  ];

  assert.deepEqual(status(ingredients, pantry), {
    missing: [],
    check: ['Plátano', 'Yogur', 'Leche'],
  });
});

test('Si la cantidad medida es suficiente, una compra sin medir no genera aviso', () => {
  const ingredients = [{ name: 'Leche', quantity: 150, unit: 'ml' }];
  const pantry = [stock('Leche', 0.2, 'l', 'available'), stock('Leche', 0, 'ud', 'available')];

  assert.deepEqual(status(ingredients, pantry), { missing: [], check: [] });
});
