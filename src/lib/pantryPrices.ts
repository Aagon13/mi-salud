import type { PurchaseRecord } from '../types.js';
import { unitPrice } from './buyingAdvice.js';
import { joinKey, toBase, unitGroup } from './helpers.js';
import type { ShoppingItem } from './shopping.js';

const priceUnits = {g: 'kg', ml: 'l', ud: 'ud'} as const;

export interface PantryPrice {
  amount: number;
  unitLabel: 'kg' | 'l' | 'ud';
  group: 'g' | 'ml' | 'ud';
  store: string;
  date: string;
}

export function latestPantryPrices(purchases: readonly PurchaseRecord[]): Map<string, PantryPrice> {
  const prices = new Map<string, PantryPrice>();
  for (const purchase of purchases) {
    const price = unitPrice(purchase);
    if (!price || !Number.isFinite(price.price) || price.price <= 0) continue;

    const key = joinKey(purchase.product, purchase.unit);
    const current = prices.get(key);
    if (current && current.date > purchase.date) continue;
    prices.set(key, {
      amount: price.price,
      unitLabel: priceUnits[price.group],
      group: price.group,
      store: purchase.store,
      date: purchase.date,
    });
  }
  return prices;
}

export function estimateShoppingPrice(item: ShoppingItem, known: PantryPrice | undefined): number | undefined {
  if (!known || known.group !== unitGroup(item.unit)) return undefined;
  const quantity = toBase(item.quantity, item.unit) / toBase(1, known.unitLabel);
  const estimate = known.amount * quantity;
  if (!Number.isFinite(estimate) || estimate <= 0) return undefined;
  return Math.round((estimate + Number.EPSILON * estimate) * 100) / 100;
}
