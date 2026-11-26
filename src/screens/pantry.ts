import { icon } from '../ui/icons.js';
import { assistantCard } from '../ui/assistantCard.js';
import { escapeHTML, joinKey, pretty } from '../lib/helpers.js';
import { estimateShoppingPrice, latestPantryPrices } from '../lib/pantryPrices.js';
import { shoppingList } from '../lib/shopping.js';
import { computeCoverage } from '../lib/planner.js';
import { currentWeek } from '../lib/dates.js';
import type { AppData } from '../types.js';

const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function pantry(s: AppData, voiceOpen = false): string {
  const inventory = [...s.pantry].sort((a, b) =>
    Number(Boolean(b.habitual)) - Number(Boolean(a.habitual)) || a.name.localeCompare(b.name, 'es'));
  const inStock = inventory.filter(item => item.quantity > 0).length;
  const prices = latestPantryPrices(s.purchases ?? []);
  const shopping = shoppingList(s, computeCoverage(s, currentWeek()).missing).map(item => ({
    ...item, estimate: estimateShoppingPrice(item, prices.get(joinKey(item.name, item.unit))),
  }));
  const priced = shopping.filter(item => item.estimate !== undefined);
  const subtotal = priced.reduce((sum, item) => sum + (item.estimate ?? 0), 0);

  const inventoryRows = inventory.map(item => {
    const name = escapeHTML(item.name);
    const id = escapeHTML(item.id);
    const price = prices.get(joinKey(item.name, item.unit));
    const low = item.habitual && item.quantity + 1e-9 < Math.max(0.01, item.minStock ?? 1);
    const stock = item.quantity <= 0 ? '<span class="pantry-stock-low">Agotado</span>'
      : `${pretty(item.quantity)} ${item.unit}${low ? ' · <span class="pantry-stock-low">Queda poco</span>' : ''}`;
    return `<li class="pantry-item pantry-inventory-item">
      <div class="pantry-item-info"><strong>${name}</strong><small>${stock}${item.habitual ? ' · Habitual' : ''}</small></div>
      <div class="pantry-item-price">${price ? `<strong>${euro.format(price.amount)} / ${price.unitLabel}</strong><small>Último precio · ${escapeHTML(price.store)}</small>` : '<small class="pantry-price-missing">Sin precio</small>'}</div>
      <div class="pantry-item-actions">
        <button type="button" class="icon-btn pantry-adjust" data-action="pantry-minus" data-id="${id}" aria-label="Descontar cantidad de ${name}" title="Descontar cantidad">${icon('minus', 17)}</button>
        <button type="button" class="icon-btn pantry-adjust" data-action="pantry-plus" data-id="${id}" aria-label="Aumentar cantidad de ${name}" title="Aumentar cantidad">${icon('plus', 17)}</button>
        <button type="button" class="icon-btn" data-action="edit-pantry" data-id="${id}" aria-label="Editar ${name}" title="Editar producto">${icon('edit', 17)}</button>
        <button type="button" class="icon-btn danger" data-action="delete-pantry" data-id="${id}" aria-label="Eliminar ${name}" title="Eliminar producto">${icon('trash', 17)}</button>
      </div>
    </li>`;
  }).join('');

  const shoppingRows = shopping.map(item => {
    const name = escapeHTML(item.name);
    const itemData = `data-name="${name}" data-qty="${item.quantity}" data-unit="${item.unit}"`;
    return `<li class="pantry-item pantry-shopping-item">
      <div class="pantry-item-info"><strong>${name}</strong><small>${pretty(item.quantity)} ${item.unit} · ${escapeHTML(item.reasons.join(' + '))}</small></div>
      <div class="pantry-item-price">${item.estimate === undefined ? '<small class="pantry-price-missing">Sin precio</small>' : `<strong>${euro.format(item.estimate)}</strong><small>Estimado</small>`}</div>
      <div class="pantry-item-actions">
        <button type="button" class="btn btn-compact" data-action="buy-shopping" ${itemData} aria-label="Marcar ${name} como comprado">${icon('check', 16)} Comprado</button>
        <button type="button" class="icon-btn" data-action="new-purchase" data-stock="true" ${itemData} aria-label="Registrar el precio de ${name}" title="Registrar compra con precio">${icon('wallet', 17)}</button>
        ${item.manualIds.length ? `<button type="button" class="icon-btn danger" data-action="delete-grocery" data-id="${escapeHTML(item.manualIds[0])}" aria-label="Quitar ${name} de la lista" title="Quitar apunte">${icon('trash', 17)}</button>` : ''}
      </div>
    </li>`;
  }).join('');
  const completeEstimate = priced.length === shopping.length;
  const estimate = priced.length ? `<div><b>${completeEstimate ? 'Total estimado' : 'Total estimado parcial'}</b>
    <small>${completeEstimate ? 'Según tus últimas compras' : `${priced.length} de ${shopping.length} con precio`}</small></div><strong>${euro.format(subtotal)}</strong>`
    : '<b>Sin precios registrados</b>';

  const preparedRows = s.prepared.map(item => {
    const recipe = s.recipes.find(recipe => recipe.id === item.recipeId);
    return `<li class="pantry-item">
      <div class="pantry-item-info"><strong>${escapeHTML(recipe?.name ?? 'Receta eliminada')}</strong>
        <small>${pretty(item.servings)} ración/es · ${escapeHTML(item.location)} · ${escapeHTML(item.date)}</small></div>
      <div class="pantry-item-actions"><button type="button" class="btn btn-compact" data-action="consume-prepared" data-id="${escapeHTML(item.id)}">Comer 1</button></div>
    </li>`;
  }).join('');

  return `<div class="pantry-page">
    <header class="pantry-hero">
      <div class="pantry-hero-copy"><h1>Mi despensa</h1></div>
      <nav class="pantry-overview" aria-label="Ir a una sección de Despensa">
        <a class="pantry-overview-link" href="#pantry-inventory">${icon('fridge', 19)}<span class="pantry-overview-label">En casa</span><strong>${inStock}</strong></a>
        <a class="pantry-overview-link" href="#pantry-shopping">${icon('basket', 19)}<span class="pantry-overview-label">Por comprar</span><strong>${shopping.length}</strong></a>
      </nav>
    </header>
    <section class="pantry-entry" aria-labelledby="pantry-entry-title">
      <h2 id="pantry-entry-title">Añadir y registrar</h2>
      <div class="pantry-entry-grid">
        <button type="button" class="pantry-entry-action pantry-entry-primary" data-action="new-pantry"><span class="pantry-entry-icon">${icon('plus', 19)}</span><b>Añadir a despensa</b></button>
        <button type="button" class="pantry-entry-action" data-action="new-grocery"><span class="pantry-entry-icon">${icon('list', 19)}</span><b>Añadir a la lista</b></button>
        <button type="button" class="pantry-entry-action" data-action="new-purchase" data-stock="true"><span class="pantry-entry-icon">${icon('wallet', 19)}</span><b>Registrar compra</b></button>
        <button type="button" class="pantry-entry-action" data-action="open-receipt"><span class="pantry-entry-icon">${icon('camera', 19)}</span><b>Foto de ticket</b></button>
      </div>
      <details class="pantry-voice"${voiceOpen ? ' open' : ''}>
        <summary>${icon('mic', 18)}<b>Añadir por voz</b>${icon('right', 16)}</summary>
        ${assistantCard()}
      </details>
    </section>

    <div class="pantry-columns">
      <section class="pantry-panel" id="pantry-inventory" aria-labelledby="pantry-inventory-title" tabindex="-1">
        <header class="pantry-panel-head"><div class="pantry-panel-title">
          <span class="pantry-section-icon">${icon('fridge', 21)}</span>
          <div><h2 id="pantry-inventory-title">En casa</h2><p>${inStock} de ${inventory.length} con existencias</p></div>
        </div></header>
        ${inventoryRows ? `<ul class="pantry-rows">${inventoryRows}</ul>` : `<div class="pantry-empty">
          ${icon('fridge', 24)}<p>Tu despensa está vacía.</p><button type="button" class="btn btn-secondary" data-action="new-pantry">Añadir producto</button>
        </div>`}
      </section>

      <section class="pantry-panel" id="pantry-shopping" aria-labelledby="pantry-shopping-title" tabindex="-1">
        <header class="pantry-panel-head">
          <div class="pantry-panel-title"><span class="pantry-section-icon">${icon('basket', 21)}</span>
            <div><h2 id="pantry-shopping-title">Lista de la compra</h2><p>${shopping.length} ${shopping.length === 1 ? 'producto pendiente' : 'productos pendientes'}</p></div></div>
          ${shopping.length ? `<button type="button" class="text-link" data-action="copy-shopping" aria-label="Copiar lista">${icon('list', 16)} Copiar</button>` : ''}
        </header>
        ${shoppingRows ? `<div class="pantry-estimate">${estimate}</div><ul class="pantry-rows">${shoppingRows}</ul>` : `<div class="pantry-empty">
          ${icon('check', 24)}<p>No tienes compras pendientes.</p><button type="button" class="btn btn-secondary" data-action="new-grocery">Apuntar producto</button>
        </div>`}
      </section>
    </div>

    <section class="pantry-panel pantry-prepared" aria-labelledby="pantry-prepared-title">
      <header class="pantry-panel-head"><div class="pantry-panel-title">
        <span class="pantry-section-icon">${icon('chef', 21)}</span>
        <div><h2 id="pantry-prepared-title">Táperes preparados</h2><p>${s.prepared.length} ${s.prepared.length === 1 ? 'lote' : 'lotes'}</p></div>
      </div></header>
      ${preparedRows ? `<ul class="pantry-rows">${preparedRows}</ul>` : '<div class="pantry-empty"><p>Aquí aparecerán las raciones cuando cocines una receta.</p></div>'}
    </section>
  </div>`;
}
