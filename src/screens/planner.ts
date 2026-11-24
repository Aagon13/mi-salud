import { addDays, shortDate, dateLabel } from '../lib/dates.js';
import { computeCoverage } from '../lib/planner.js';
import { escapeHTML, pretty } from '../lib/helpers.js';
import { icon } from '../ui/icons.js';
import { shoppingList } from '../lib/shopping.js';
import type { AppData, MealKind } from '../types.js';

export function planner(s:AppData, start:string):string {
 const cv=computeCoverage(s,start);
 const planned=s.plan.filter(p=>p.date>=start && p.date<=addDays(start,6) && s.recipes.some(r=>r.id===p.recipeId));
 const shopping=shoppingList(s,cv.missing);
 const slots=(date:string,kind:MealKind):string=>{
   const id=`${date}:${kind}`, entry=s.plan.find(p=>p.id===id), chosen=entry?.recipeId??'';
   return `<div class="meal-slot"><div class="meal-side"><span>${kind==='comida'?'COMIDA':'CENA'}</span>${entry?.recipeId?(cv.bySlot[id]?`<small class="available">${icon('check',12)} Disponible</small>`:`<small class="missing">${icon('warning',12)} Faltan ingredientes</small>`):''}</div>
     <select class="meal-select" data-plan="${id}" aria-label="${kind} de ${date}"><option value="">Sin planificar</option>${s.recipes.map(r=>`<option value="${r.id}" ${chosen===r.id?'selected':''}>${escapeHTML(r.name)}</option>`).join('')}</select>
     ${chosen?`<button class="icon-btn" data-action="plan-servings" data-id="${id}" title="Raciones">${entry?.servings??1}× ${icon('edit',14)}</button>`:''}</div>`;
 };
 return `<section class="page-intro"><div class="eyebrow">ALIMENTACIÓN</div><h1>Mi semana</h1><p>Planifica lo que vas a comer y comprueba qué te falta.</p></section>
 <div class="week-pager"><button data-action="week-prev" aria-label="Semana anterior">${icon('left')}</button><strong>${dateLabel(start,{day:'numeric',month:'short'})} – ${dateLabel(addDays(start,6),{day:'numeric',month:'short'})}</strong><button data-action="week-next" aria-label="Semana siguiente">${icon('right')}</button></div>
 <div class="week-overview card"><div class="overview-top"><div><span class="eyebrow">COMIDAS CUBIERTAS</span><h2>${cv.ready}<span>/14</span></h2></div><div class="overview-icon">${icon('calendar',24)}</div></div>
 <div class="track track-green"><div style="width:${cv.ready/cv.total*100}%"></div></div><small>${planned.length} de 14 comidas planificadas. «Cubierta» significa que hay ingredientes suficientes o táperes disponibles; es una estimación.</small></div>
 <div class="section-heading"><h2>Menú semanal</h2><button class="text-link" data-action="go" data-tab="recipes">+ Recetas</button></div>
 <div class="day-list">${Array.from({length:7},(_,i)=>{
   const date=addDays(start,i);return `<div class="day-card"><div class="day-head"><b>${shortDate(date)}</b><span>${date}</span></div>${slots(date,'comida')}${slots(date,'cena')}</div>`;
 }).join('')}</div>
 <div class="section-heading"><h2>Lista de la compra</h2><span>${shopping.length} pendientes</span></div>
 <div class="card list-card"><div class="small-header">${icon('basket',17)} Habituales, apuntes y faltantes del menú (sin duplicados)</div>
 ${shopping.length===0?`<p class="text-muted tiny-pad">Nada pendiente de comprar según la despensa y el menú.</p>`:shopping.map(i=>`<div class="stock-row"><div class="stock-info"><b>${escapeHTML(i.name)}</b><small>${pretty(i.quantity)} ${i.unit} · ${escapeHTML(i.reasons.join(' + '))}</small></div><button class="btn btn-compact" data-action="buy-shopping" data-name="${escapeHTML(i.name)}" data-unit="${i.unit}" data-qty="${i.quantity}">Comprado</button>${i.manualIds.length?`<button class="icon-btn danger" data-action="delete-grocery" data-id="${escapeHTML(i.manualIds[0])}" aria-label="Quitar apunte">${icon('trash',16)}</button>`:''}</div>`).join('')}
 <button class="btn btn-secondary btn-wide" data-action="new-grocery">${icon('plus',17)} Añadir a la lista</button></div>
 <div class="tip">${icon('info',19)} Planificar no descuenta ingredientes. Solo se descuentan al marcar «Cocinar» en una receta. Los productos de la lista se suman a la despensa cuando marcas «Comprado».</div>`;
}
