import { compareStores, summarizeStores, type StoreComparison } from '../lib/buyingAdvice.js';
import { escapeHTML, pretty, productKey } from '../lib/helpers.js';
import { icon } from './icons.js';
import type { AppData } from '../types.js';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const dates = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function displayDate(date?: string): string {
  if (!date) return '';
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) ? dates.format(timestamp) : '';
}

function shopRow(row: StoreComparison): string {
  const store = escapeHTML(row.store);
  const paid = row.latestPaid === undefined ? 'Sin precio' : euros.format(row.latestPaid);
  const paidDetails = row.latestPaid === undefined ? '' : [
    row.latestPaidQuantity === undefined
      ? 'Cantidad sin indicar'
      : `${pretty(row.latestPaidQuantity)} ${row.latestPaidUnit ?? ''}`.trim(),
    displayDate(row.latestPaidDate),
  ].filter(Boolean).join(' · ');
  const unitPrice = row.pricePerUnit === undefined ? 'Sin precio comparable' : `${euros.format(row.pricePerUnit)} / ${row.unitPriceFormat ?? row.unitLabel}`;
  const unitPriceDate = row.pricePerUnit === undefined ? '' : displayDate(row.unitPriceDate);
  const ratingDate = displayDate(row.ratingDate);
  return `<li class="shop-comparison-store">
    <div class="shop-comparison-store-heading"><h3>${store}</h3>
      <span class="shop-comparison-rating">
        ${row.rating === undefined ? 'Sin valorar' : `${icon('trophy', 14)} <strong>${row.rating}/5</strong>`}
      </span>
    </div>
    <dl class="shop-comparison-prices">
      <div><dt>Último importe</dt><dd>${paid}</dd>${paidDetails ? `<dd class="shop-comparison-meta">${escapeHTML(paidDetails)}</dd>` : ''}</div>
      <div><dt>Precio por unidad</dt><dd>${escapeHTML(unitPrice)}</dd>${unitPriceDate ? `<dd class="shop-comparison-meta">${unitPriceDate}</dd>` : ''}</div>
    </dl>
    ${row.comment ? `<p class="shop-comparison-comment">«${escapeHTML(row.comment)}»</p>` : ''}
    <div class="shop-comparison-store-footer">
      ${ratingDate ? `<span>Valoraste el ${ratingDate}</span>` : ''}
      <button type="button" class="btn btn-secondary btn-compact" data-action="rate-store-purchase" data-id="${escapeHTML(row.latestPurchaseId)}" aria-label="Valorar la última compra en ${store}">${icon('edit', 16)} Valorar</button>
    </div>
  </li>`;
}

export function shopComparison(state: AppData, selected?: string): string {
  const products = new Map<string, string>();
  for (const purchase of state.purchases ?? []) {
    const product = purchase.product.trim();
    if (product) products.set(productKey(product), product);
  }
  if (!products.size) {
    return '<div class="shop-comparison"><p class="shop-comparison-note">Registra una compra para consultar el precio y guardar tu valoración.</p></div>';
  }

  const name = selected ? products.get(productKey(selected)) : undefined;
  const options = [...products.values()].sort((a, b) => a.localeCompare(b, 'es')).map(product =>
    `<option value="${escapeHTML(product)}"${product === name ? ' selected' : ''}>${escapeHTML(product)}</option>`
  ).join('');
  const picker = `<form class="shop-comparison-picker" id="form-store-comparison">
    <label for="store-comparison-product">Producto</label>
    <div class="shop-comparison-controls">
      <select id="store-comparison-product" name="product" required>
        <option value="" disabled${name ? '' : ' selected'}>Elige un producto</option>${options}
      </select>
      <button type="submit" class="btn btn-primary">Comparar</button>
    </div>
  </form>`;
  if (!name) {
    return `<div class="shop-comparison">${picker}${selected ? '<p class="shop-comparison-note">Todavía no hay compras de ese producto.</p>' : ''}</div>`;
  }

  const rows = compareStores(state, name);
  const { cheapest, bestRated, lowestPaid } = summarizeStores(rows);
  const highlights = [
    { label: 'Menor precio por unidad comparable', stores: cheapest },
    { label: 'Tu mejor valoración', stores: bestRated },
    { label: 'Menor importe pagado sin cantidad', stores: lowestPaid },
  ].filter(highlight => highlight.stores.length);
  const figures = highlights.length ? `<dl class="shop-comparison-highlights">${highlights.map(({ label, stores }) =>
    `<div><dt>${label}</dt><dd>${escapeHTML(stores.join(' · '))}</dd></div>`
  ).join('')}</dl>` : '';
  const detail = rows.length === 1
    ? 'Tienes compras de este producto en un supermercado. Registra otra tienda para comparar.'
    : cheapest.length ? 'Precios y valoraciones de tus compras registradas.'
    : 'Para comparar precios hacen falta compras con la misma unidad o formato.';

  return `<div class="shop-comparison">${picker}
    <section aria-label="Resultados por supermercado">
      <p class="shop-comparison-note">${detail}</p>
      ${figures}
      <ul class="shop-comparison-stores">${rows.map(shopRow).join('')}</ul>
    </section>
  </div>`;
}
