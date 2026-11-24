import { icon, pill } from '../ui/icons.js';
import { escapeHTML, pretty } from '../lib/helpers.js';
import { shoppingList } from '../lib/shopping.js';
import { computeCoverage } from '../lib/planner.js';
import { currentWeek } from '../lib/dates.js';
import type { AppData } from '../types.js';

export function pantry(s:AppData):string {
  const sorted=[...s.pantry].sort((a,b)=>Number(Boolean(b.habitual))-Number(Boolean(a.habitual))||a.name.localeCompare(b.name,'es'));
  const shopping=shoppingList(s,computeCoverage(s,currentWeek()).missing);
  return `<section class="page-intro"><div class="eyebrow">ALIMENTACIÓN</div><h1>Mi despensa</h1><p>Lo que tienes en casa y lo que necesitas reponer, siempre al día.</p></section>
    <div class="card quick-pantry-card"><div class="section-heading"><h2>Apúntalo en segundos</h2>${pill('Rápido','green')}</div>
      <form id="form-pantry-quick" class="quick-pantry-form"><input name="phrase" maxlength="140" required autocomplete="off" aria-label="Escribe o dicta un movimiento de despensa" placeholder="Se me ha terminado la leche"><button class="btn btn-primary" type="submit">${icon('check',17)} Apuntar</button></form>
      <p>También puedes escribir «He comprado 2 litros de leche». Puedes dictarlo con el micrófono de tu teclado.</p>
    </div>
    <div class="toolbar"><button class="btn btn-primary" data-action="new-pantry">${icon('plus',17)} Añadir producto</button><button class="btn btn-secondary" data-action="new-grocery">${icon('list',17)} Apuntar compra</button></div>
    <div class="summary-strip"><div><b>${sorted.filter(x=>x.quantity>0).length}</b><small>En casa</small></div><div><b>${sorted.filter(x=>x.habitual).length}</b><small>Habituales</small></div><div><b>${shopping.length}</b><small>Por comprar</small></div></div>
    <div class="section-heading"><h2>Lista de la compra</h2><button class="text-link" data-action="copy-shopping">${icon('list',15)} Copiar lista</button></div>
    <div class="card list-card">${shopping.length===0?`<div class="empty-sm">${icon('check',25)}<p>¡Todo al día! Aquí aparecerán tus habituales cuando bajen del mínimo, tus apuntes y los ingredientes que falten para la semana.</p></div>`:
      shopping.map(g=>`<div class="stock-row"><div class="stock-icon empty-stock">${icon('basket',17)}</div><div class="stock-info"><b>${escapeHTML(g.name)}</b><small>${pretty(g.quantity)} ${g.unit} · ${escapeHTML(g.reasons.join(' + '))}</small></div><button class="btn btn-compact" data-action="buy-shopping" data-name="${escapeHTML(g.name)}" data-qty="${g.quantity}" data-unit="${g.unit}">Comprado</button>${g.manualIds.length?`<button class="icon-btn danger" data-action="delete-grocery" data-id="${escapeHTML(g.manualIds[0])}" aria-label="Quitar apunte">${icon('trash',15)}</button>`:''}</div>`).join('')}
    </div>
    <div class="section-heading"><h2>Productos de casa</h2>${pill('Toca ✎ para indicar lo habitual','muted')}</div>
    <div class="card list-card">${sorted.length===0?`<div class="empty">${icon('fridge',34)}<h3>Empieza por tus compras habituales</h3><p>Añade leche, huevos, arroz o lo que compras normalmente. No hemos inventado lo que tienes.</p><button class="btn btn-primary" data-action="new-pantry">Añadir primer producto</button></div>`:
      sorted.map(p=>`<div class="stock-row"><div class="stock-icon ${p.quantity>0?'':'empty-stock'}">${icon(p.quantity>0?'check':'warning',18)}</div><div class="stock-info"><b>${escapeHTML(p.name)} ${p.habitual?'<span class="mini-habitual">Habitual</span>':''}</b><small>${p.quantity>0?`${pretty(p.quantity)} ${p.unit}`:'Agotado'}${p.habitual?` · objetivo ${pretty(Math.max(p.minStock??1,p.restockQuantity??1))} ${p.unit}`:''}</small></div>
       <button class="icon-btn" data-action="edit-pantry" data-id="${escapeHTML(p.id)}" aria-label="Editar ${escapeHTML(p.name)}">${icon('edit',18)}</button>
       ${p.quantity>0?`<button class="icon-btn danger" data-action="deplete-pantry" data-id="${escapeHTML(p.id)}" title="Marcar agotado" aria-label="Agotado: ${escapeHTML(p.name)}">${icon('minus',18)}</button>`:''}</div>`).join('')}
    </div>
    <div class="section-heading"><h2>Táperes preparados</h2><span>${s.prepared.length} lotes</span></div>
    <div class="card list-card">${s.prepared.length===0?`<div class="empty-sm">${icon('chef',28)}<p>Aquí aparecerán las raciones cuando cocines una receta.</p></div>`:
       s.prepared.map(p=>{const r=s.recipes.find(r=>r.id===p.recipeId);return `<div class="stock-row"><div class="stock-icon">${icon('food',19)}</div><div class="stock-info"><b>${escapeHTML(r?.name??'Receta eliminada')}</b><small>${pretty(p.servings)} ración/es · ${p.location} · ${p.date}</small></div><button class="btn btn-compact" data-action="consume-prepared" data-id="${escapeHTML(p.id)}">Comer 1</button></div>`}).join('')}
    </div>
    <div class="tip">${icon('info',19)} La lista se recalcula al agotar, comprar o consumir productos con recetas. Los habituales se reponen al bajar de su mínimo. El reconocimiento de tickets aún no está implementado.</div>
  `;
}
