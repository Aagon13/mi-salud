import { icon } from '../ui/icons.js';
import { assistantCard } from '../ui/assistantCard.js';
import { escapeHTML, pretty } from '../lib/helpers.js';
import { shoppingList } from '../lib/shopping.js';
import { computeCoverage } from '../lib/planner.js';
import { currentWeek } from '../lib/dates.js';
import type { AppData } from '../types.js';

export function pantry(s:AppData):string {
  const sorted=[...s.pantry].sort((a,b)=>Number(Boolean(b.habitual))-Number(Boolean(a.habitual))||a.name.localeCompare(b.name,'es'));
  const shopping=shoppingList(s,computeCoverage(s,currentWeek()).missing);
  return `<section class="page-intro"><div class="eyebrow">ALIMENTACIÓN</div><h1>Mi despensa</h1></section>
    ${assistantCard()}
    <div class="toolbar pantry-toolbar"><button class="btn btn-primary" data-action="new-pantry">${icon('plus',17)} Producto</button><button class="btn btn-secondary" data-action="new-grocery">${icon('list',17)} Lista de compra</button></div>
    <div class="summary-strip"><div><b>${sorted.filter(x=>x.quantity>0).length}</b><small>En casa</small></div><div><b>${sorted.filter(x=>x.habitual).length}</b><small>Habituales</small></div><div><b>${shopping.length}</b><small>Por comprar</small></div></div>
    <div class="section-heading"><h2>Por comprar</h2><button class="text-link" data-action="copy-shopping">${icon('list',15)} Copiar lista</button></div>
    <div class="card list-card">${shopping.length===0?`<div class="empty-sm"><p>No tienes nada pendiente.</p></div>`:
      shopping.map(g=>`<div class="stock-row"><div class="stock-icon empty-stock">${icon('basket',17)}</div><div class="stock-info"><b>${escapeHTML(g.name)}</b><small>${pretty(g.quantity)} ${g.unit} · ${escapeHTML(g.reasons.join(' + '))}</small></div><button class="btn btn-compact" data-action="buy-shopping" data-name="${escapeHTML(g.name)}" data-qty="${g.quantity}" data-unit="${g.unit}">Comprado</button>${g.manualIds.length?`<button class="icon-btn danger" data-action="delete-grocery" data-id="${escapeHTML(g.manualIds[0])}" aria-label="Quitar apunte">${icon('trash',15)}</button>`:''}</div>`).join('')}
    </div>
    <div class="section-heading"><h2>En casa</h2><span>${sorted.length} productos</span></div>
    <div class="card list-card">${sorted.length===0?`<div class="empty"><p>Tu despensa está vacía.</p><button class="btn btn-primary" data-action="new-pantry">Añadir producto</button></div>`:
      sorted.map(p=>`<div class="stock-row"><div class="stock-icon ${p.quantity>0?'':'empty-stock'}">${icon(p.quantity>0?'check':'warning',18)}</div><div class="stock-info"><b>${escapeHTML(p.name)}</b><small>${p.quantity>0?`${pretty(p.quantity)} ${p.unit}`:'Agotado'}${p.habitual?' · habitual':''}</small></div>
       <div class="pantry-row-actions">
         <button class="icon-btn pantry-adjust" data-action="pantry-minus" data-id="${escapeHTML(p.id)}" title="Consumir una unidad" aria-label="Consumir 1 de ${escapeHTML(p.name)}">${icon('minus',18)}</button>
         <button class="icon-btn pantry-adjust" data-action="pantry-plus" data-id="${escapeHTML(p.id)}" title="Añadir una unidad" aria-label="Añadir 1 a ${escapeHTML(p.name)}">${icon('plus',18)}</button>
         <button class="icon-btn" data-action="edit-pantry" data-id="${escapeHTML(p.id)}" title="Editar cantidad y ajustes" aria-label="Editar ${escapeHTML(p.name)}">${icon('edit',18)}</button>
         <button class="icon-btn danger" data-action="delete-pantry" data-id="${escapeHTML(p.id)}" title="Eliminar producto" aria-label="Eliminar ${escapeHTML(p.name)}">${icon('trash',18)}</button>
       </div></div>`).join('')}
    </div>
    <div class="section-heading"><h2>Táperes preparados</h2><span>${s.prepared.length} lotes</span></div>
    <div class="card list-card">${s.prepared.length===0?`<div class="empty-sm">${icon('chef',28)}<p>Aquí aparecerán las raciones cuando cocines una receta.</p></div>`:
       s.prepared.map(p=>{const r=s.recipes.find(r=>r.id===p.recipeId);return `<div class="stock-row"><div class="stock-icon">${icon('food',19)}</div><div class="stock-info"><b>${escapeHTML(r?.name??'Receta eliminada')}</b><small>${pretty(p.servings)} ración/es · ${p.location} · ${p.date}</small></div><button class="btn btn-compact" data-action="consume-prepared" data-id="${escapeHTML(p.id)}">Comer 1</button></div>`}).join('')}
    </div>
    
  `;
}
