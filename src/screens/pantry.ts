import { icon, pill } from '../ui/icons.js';
import { escapeHTML, pretty } from '../lib/helpers.js';
import type { AppData } from '../types.js';

export function pantry(s:AppData):string {
 const sorted=[...s.pantry].sort((a,b)=>a.name.localeCompare(b.name,'es'));
 return `<section class="page-intro"><div class="eyebrow">ALIMENTACIÓN</div><h1>Mi despensa</h1><p>Lo que tienes, lo que falta y lo que ya has cocinado.</p></section>
   <div class="toolbar"><button class="btn btn-primary" data-action="new-pantry">${icon('plus',17)} Añadir producto</button><button class="btn btn-secondary" data-action="go" data-tab="planner">${icon('list',17)} Ver compra</button></div>
   <div class="summary-strip"><div><b>${sorted.filter(x=>x.quantity>0).length}</b><small>Productos disponibles</small></div><div><b>${sorted.filter(x=>x.quantity<=0).length}</b><small>Agotados</small></div><div><b>${s.prepared.reduce((sum,x)=>sum+x.servings,0)}</b><small>Raciones preparadas</small></div></div>
   <div class="section-heading"><h2>Productos</h2>${pill('Actualización manual','muted')}</div>
   <div class="card list-card">${sorted.length===0?`<div class="empty">${icon('fridge',34)}<h3>Tu despensa está vacía</h3><p>Añade tu primera compra. No hemos supuesto qué productos tienes.</p><button class="btn btn-primary" data-action="new-pantry">Añadir producto</button></div>`:
     sorted.map(p=>`<div class="stock-row"><div class="stock-icon ${p.quantity>0?'':'empty-stock'}">${icon(p.quantity>0?'check':'warning',18)}</div><div class="stock-info"><b>${escapeHTML(p.name)}</b><small>${p.quantity>0?`${pretty(p.quantity)} ${p.unit}`:'Agotado'}</small></div>
     <button class="icon-btn" data-action="edit-pantry" data-id="${p.id}" aria-label="Editar ${escapeHTML(p.name)}">${icon('edit',18)}</button>
     ${p.quantity>0?`<button class="icon-btn danger" data-action="deplete-pantry" data-id="${p.id}" title="Marcar agotado" aria-label="Agotado: ${escapeHTML(p.name)}">${icon('minus',18)}</button>`:''}</div>`).join('')}
   </div>
   <div class="section-heading"><h2>Táperes preparados</h2><span>${s.prepared.length} lotes</span></div>
   <div class="card list-card">${s.prepared.length===0?`<div class="empty-sm">${icon('chef',28)}<p>Aquí aparecerán las raciones cuando cocines una receta.</p></div>`:
      s.prepared.map(p=>{const r=s.recipes.find(r=>r.id===p.recipeId);return `<div class="stock-row"><div class="stock-icon">${icon('food',19)}</div><div class="stock-info"><b>${escapeHTML(r?.name??'Receta eliminada')}</b><small>${pretty(p.servings)} ración/es · ${p.location} · ${p.date}</small></div><button class="btn btn-compact" data-action="consume-prepared" data-id="${p.id}">Comer 1</button></div>`}).join('')}
   </div>
   <div class="tip">${icon('info',19)} Marca un producto como agotado cuando se termine. Aparecerá en tu lista de compra. Fotografiar tickets con IA llegará en una siguiente versión.</div>
 `;
}
