import { escapeHTML, pretty } from '../lib/helpers.js';
import { icon, pill } from '../ui/icons.js';
import type { AppData } from '../types.js';

function safePhoto(photo?:string):string|undefined {
 return photo && /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo) ? photo : undefined;
}
export function recipes(s:AppData):string {
 return `<section class="page-intro"><div class="eyebrow">ALIMENTACIÓN</div><h1>Mis recetas</h1><p>Tus platos, sus ingredientes y los táperes que puedes preparar.</p></section>
 <div class="toolbar"><button class="btn btn-primary" data-action="new-recipe">${icon('plus',17)} Guardar receta</button><button class="btn btn-secondary" data-action="go" data-tab="planner">${icon('calendar',17)} Planificar</button></div>
 <div class="recipe-grid">${s.recipes.map(r=>`<article class="recipe-card">
   ${safePhoto(r.photo)?`<img class="recipe-photo" src="${safePhoto(r.photo)}" alt="Foto de ${escapeHTML(r.name)}">`:`<div class="recipe-placeholder">${icon('chef',32)}</div>`}
   <div class="recipe-body"><div class="recipe-eyebrow">${r.isExample?'EJEMPLO EDITABLE':'MI RECETA'} · ${r.servings} ración/es</div><h3>${escapeHTML(r.name)}</h3>
   <p>${r.ingredients.slice(0,3).map(i=>escapeHTML(i.name)).join(' · ')}${r.ingredients.length>3?'…':''}</p>
   <div class="recipe-actions"><button class="btn btn-compact btn-primary" data-action="view-recipe" data-id="${r.id}">Ver receta</button><button class="btn btn-compact" data-action="cook-recipe" data-id="${r.id}">${icon('chef',15)} Cocinar</button></div></div></article>`).join('')}</div>
 <div class="tip">${icon('info',19)} Las primeras recetas son ejemplos con cantidades orientativas. Puedes editarlas o eliminarlas. La app no interpreta automáticamente fotos ni mensajes todavía.</div>`;
}
export function recipeDetail(s:AppData,id:string):string {
 const r=s.recipes.find(x=>x.id===id); if(!r) return '<p>Receta no encontrada.</p>';
 return `<div class="modal-head"><h2>${escapeHTML(r.name)}</h2><button class="icon-btn" data-action="close-modal" aria-label="Cerrar">${icon('close')}</button></div>
 ${safePhoto(r.photo)?`<img class="detail-photo" src="${safePhoto(r.photo)}" alt="${escapeHTML(r.name)}">`:''}
 <div class="minor">Para ${r.servings} ración/es ${r.isExample?pill('Ejemplo editable','amber'):''}</div>
 <div class="section-heading"><h3>Ingredientes</h3></div><ul class="ingredient-list">${r.ingredients.map(i=>`<li><span>${escapeHTML(i.name)}</span><strong>${pretty(i.quantity)} ${i.unit}</strong></li>`).join('')}</ul>
 <div class="section-heading"><h3>Preparación</h3></div><p class="method">${escapeHTML(r.method || 'Sin instrucciones.').replace(/\n/g,'<br>')}</p>
 <div class="modal-actions"><button class="btn btn-primary" data-action="cook-recipe" data-id="${r.id}">${icon('chef',17)} Cocinar ahora</button><button class="btn" data-action="edit-recipe" data-id="${r.id}">${icon('edit',17)} Editar</button><button class="btn btn-danger-outline" data-action="delete-recipe" data-id="${r.id}">${icon('trash',17)}</button></div>`;
}
