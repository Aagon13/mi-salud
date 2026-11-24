import { initialData, missions } from './data/seed.js';
import { dashboard } from './screens/dashboard.js';
import { pantry } from './screens/pantry.js';
import { planner } from './screens/planner.js';
import { recipes, recipeDetail } from './screens/recipes.js';
import { training } from './screens/training.js';
import { health } from './screens/health.js';
import { currentWeek, localDate } from './lib/dates.js';
import { loadData, saveData, isValidBackup, downloadBackup } from './lib/storage.js';
import { toggleMission, levelInfo, totalXP } from './lib/progress.js';
import { addToPantry, cookRecipe, enoughForRecipe, computeCoverage } from './lib/planner.js';
import { applyQuickCommand, markOut, purchase, shoppingList } from './lib/shopping.js';
import { escapeHTML as esc, optUnits, positive, uid, shrinkPhoto, normalizeName, joinKey } from './lib/helpers.js';
import { icon } from './ui/icons.js';
import type { AppData, Ingredient, Recipe, Unit } from './types.js';

const TABS = [
  {id:'home',label:'Hoy',icon:'home'},
  {id:'planner',label:'Semana',icon:'calendar'},
  {id:'pantry',label:'Despensa',icon:'basket'},
  {id:'recipes',label:'Recetas',icon:'book'},
  {id:'training',label:'Entreno',icon:'dumbbell'},
  {id:'health',label:'Salud',icon:'heart'},
] as const;
type Tab = typeof TABS[number]['id'];
let state:AppData = initialData();
let current:Tab='home';
let weekOffset=0;
let routine='A';
let saving=false;
let lastModalFocus:HTMLElement|null=null;
const root=document.querySelector<HTMLDivElement>('#app')!;
const modalRoot=document.querySelector<HTMLDivElement>('#modal')!;
const toastRoot=document.querySelector<HTMLDivElement>('#toast')!;

function toast(message:string,error=false):void {
  toastRoot.textContent=message;
  toastRoot.className=`toast visible ${error?'toast-error':''}`;
  window.setTimeout(()=>toastRoot.classList.remove('visible'),3800);
}
function render(resetScroll=false):void {
  const scroll=window.scrollY;
  const xp=levelInfo(totalXP(state));
  root.innerHTML=`<div class="app-layout">
    <aside class="sidebar"><div class="brand"> <span class="brand-mark">${icon('heart',24)}</span><div><b>MI SALUD</b><small>TU AVENTURA DIARIA</small></div></div>
    <div class="side-caption">NAVEGACIÓN</div>
    <nav aria-label="Secciones">${TABS.map(t=>`<button class="nav-item ${current===t.id?'active':''}" data-action="go" data-tab="${t.id}" aria-current="${current===t.id?'page':'false'}">${icon(t.icon,20)} <span>${t.label}</span></button>`).join('')}</nav>
    <div class="sidebar-footer"><span class="sidebar-level">${icon('trophy',17)} Nivel ${xp.level}</span><div class="track track-green"><div style="width:${xp.percent}%"></div></div><small>${xp.earned} / ${xp.needed} XP</small></div></aside>
    <div class="content-shell"><header class="topbar"><div class="top-brand">${icon('heart',19)} <strong>Mi Salud</strong></div><span class="top-date">${new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</span><span class="top-badge">${icon('trophy',16)} Nivel ${xp.level}</span></header>
    <main id="main-content" class="content" tabindex="-1">${current==='home'?dashboard(state):current==='planner'?planner(state,currentWeek(weekOffset)):current==='pantry'?pantry(state):current==='recipes'?recipes(state):current==='training'?training(state,routine):health(state)}</main>
    <footer class="page-footer">Mi Salud · v0.2.2 · Privado en tu dispositivo · Sin conexión a servicios externos</footer></div>
    <nav class="bottom-nav" aria-label="Navegación móvil">${TABS.map(t=>`<button class="bottom-item ${current===t.id?'active':''}" data-action="go" data-tab="${t.id}" aria-label="${t.label}" aria-current="${current===t.id?'page':'false'}">${icon(t.icon,21)}<span>${t.label}</span></button>`).join('')}</nav>
  </div>`;
  if(resetScroll) window.scrollTo({top:0,behavior:'instant'}); else window.scrollTo({top:scroll,behavior:'instant'});
}
async function commit(message='Guardado'):Promise<void>{
  saving=true;
  try {await saveData(state);render();toast(message);}
  catch(err){ console.error(err);render();toast('No se pudieron guardar los datos. Exporta una copia e intenta liberar espacio.',true); }
  finally{saving=false;}
}
function showModal(content:string):void {
  lastModalFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  modalRoot.innerHTML=`<div class="modal-shade"><div class="modal-card" role="dialog" aria-modal="true" aria-label="Formulario" tabindex="-1">${content}</div></div>`;
  document.body.classList.add('modal-open');
  // Focus the dialog itself: auto-focusing a text field opens the mobile keyboard
  // while the overlay is moving, which can turn the following tap into a backdrop tap.
  modalRoot.querySelector<HTMLElement>('.modal-card')?.focus({preventScroll:true});
}
function closeModal():void{modalRoot.innerHTML='';document.body.classList.remove('modal-open');lastModalFocus?.focus();}
function modalHeading(title:string,subtitle=''):string {return `<div class="modal-head"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button class="icon-btn" data-action="close-modal" type="button" aria-label="Cerrar">${icon('close')}</button></div>`;}
function field(label:string,input:string):string{return `<label class="field">${esc(label)}${input}</label>`;}
function numberField(name:string,val:string|number='1',min='0.01'):string{return `<input name="${name}" type="number" step="any" min="${min}" value="${esc(val)}" required>`;}
function openPantry(id?:string):void{
  const p=state.pantry.find(x=>x.id===id);
  const habitual=p?.habitual??true;
  showModal(`${modalHeading(p?'Editar producto':'Añadir producto','Define cuánto tienes y cómo quieres reponerlo.')}
    <form id="form-pantry" class="form-grid" autocomplete="off"><input type="hidden" name="id" value="${esc(p?.id??'')}">
    ${field('Producto',`<input name="productName" autocomplete="off" placeholder="Ej. Kéfir" value="${esc(p?.name??'')}" maxlength="80" required>`)}
    <div class="form-pair">${field('Cantidad que tengo ahora',numberField('quantity',p?.quantity??1,'0'))}${field('Unidad',`<select name="unit">${optUnits(p?.unit??'ud')}</select>`)}</div>
    <label class="habitual-toggle"><input type="checkbox" name="habitual" ${habitual?'checked':''}><span><b>Lo compro habitualmente</b><small>Que aparezca automáticamente cuando me quede poco.</small></span></label>
    <div class="form-pair">${field('Avisarme si tengo menos de',numberField('minStock',p?.minStock??1,'0.01'))}${field('Cantidad que quiero tener',numberField('restockQuantity',p?.restockQuantity??Math.max(p?.quantity??1,1),'0.01'))}</div>
    <p class="note">Ejemplo: mínimo 1 y objetivo 3 → si quedan 0, añade 3; si quedan 0,5, añade 2,5.</p>
    <button class="btn btn-primary btn-wide" type="submit">${icon('save',18)} Guardar producto</button></form>`);
}
function openGrocery():void{
  showModal(`${modalHeading('Añadir a la compra')}<form id="form-grocery" class="form-grid" autocomplete="off">
    ${field('Producto',`<input name="productName" autocomplete="off" placeholder="Ej. Leche" maxlength="80" required>`)}
    <div class="form-pair">${field('Cantidad',numberField('quantity'))}${field('Unidad',`<select name="unit">${optUnits('ud')}</select>`)}</div>
    <button class="btn btn-primary btn-wide" type="submit">Añadir a la lista</button></form>`);
}
function ingredientLines(ingredients:Ingredient[]):string{
  return ingredients.map(i=>`${i.name} | ${i.quantity} | ${i.unit}`).join('\n');
}
function openRecipe(id?:string):void{
  const recipe=state.recipes.find(r=>r.id===id);
  showModal(`${modalHeading(recipe?'Editar receta':'Guardar receta','Introduce un ingrediente por línea, separando nombre, cantidad y unidad con |.')}
    <form id="form-recipe" class="form-grid"><input type="hidden" name="id" value="${esc(recipe?.id??'')}">
    ${field('Nombre del plato',`<input name="name" value="${esc(recipe?.name??'')}" placeholder="Ej. Arroz con ternera" maxlength="100" required>`)}
    ${field('Raciones de la receta',numberField('servings',recipe?.servings??2,'1'))}
    ${field('Ingredientes (nombre | cantidad | unidad)',`<textarea name="ingredients" rows="6" required placeholder="Pollo | 300 | g&#10;Arroz | 140 | g&#10;Huevos | 2 | ud">${esc(recipe?ingredientLines(recipe.ingredients):'')}</textarea>`)}
    ${field('Cómo lo preparas',`<textarea name="method" rows="4" placeholder="Pasos rápidos...">${esc(recipe?.method??'')}</textarea>`)}
    ${field('Foto opcional',`<input name="photo" type="file" accept="image/*"><small>Se guarda en este dispositivo. Usa fotos pequeñas.</small>`)}
    <button class="btn btn-primary btn-wide" type="submit">${icon('save',18)} Guardar receta</button></form>`);
}
function parseIngredients(value:string):Ingredient[]{
  const validUnits=new Set(['g','kg','ud','ml','l']);
  const lines=value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length || lines.length>35)throw Error('Introduce entre 1 y 35 ingredientes.');
  return lines.map((line,i)=>{
    const pieces=line.split('|').map(x=>x.trim());
    const n=Number(pieces[1]?.replace(',','.'));
    if(pieces.length!==3 || !pieces[0] || !Number.isFinite(n) || n<=0 || !validUnits.has(pieces[2]))
      throw Error(`Ingrediente ${i+1}: usa «Nombre | Cantidad | g/kg/ud/ml/l».`);
    return {name:pieces[0],quantity:n,unit:pieces[2] as Unit};
  });
}
function openCook(id:string):void{
  const recipe=state.recipes.find(r=>r.id===id);if(!recipe)return;
  const check=enoughForRecipe(recipe,state.pantry,recipe.servings);
  showModal(`${modalHeading('Preparar táperes',recipe.name)}
    <div class="modal-helper">${check.ok?`${icon('check',17)} Tienes ingredientes para ${recipe.servings} raciones.`:`${icon('warning',18)} Puede que falten ingredientes; se comprobará al guardar.`}</div>
    <form id="form-cook" class="form-grid"><input type="hidden" name="id" value="${esc(id)}">
    ${field('Raciones a preparar',numberField('servings',recipe.servings,'1'))}
    ${field('Dónde guardarás el táper',`<select name="location"><option value="nevera">Nevera</option><option value="congelador">Congelador</option></select>`)}
    <button class="btn btn-primary btn-wide" type="submit">${icon('chef',17)} Cocinar y descontar ingredientes</button></form>
    <p class="note">Si ya has cocinado este plato, usa esta acción una sola vez para evitar descontar dos veces.</p>`);
}
function openServings(id:string):void{
  const entry=state.plan.find(x=>x.id===id);
  if(!entry)return;
  showModal(`${modalHeading('Raciones para esta comida')}<form id="form-servings" class="form-grid">
    <input type="hidden" name="id" value="${esc(id)}">${field('Número de raciones',numberField('servings',entry.servings,'1'))}
    <button type="submit" class="btn btn-primary btn-wide">Guardar</button></form>`);
}
function markDone(id:string):void {
  const day=localDate();if(!(state.completions[day]??[]).includes(id))toggleMission(state,day,id);
}
function buyMissing(name:string,qty:number,unit:Unit):void {
  if(!name||!positive(qty))return;
  purchase(state,name,qty,unit);
  void commit('Compra añadida a la despensa');
}
async function act(action:string,el:HTMLElement):Promise<void>{
  const id=el.dataset.id??'';
  switch(action){
    case 'go':current=(TABS.find(t=>t.id===el.dataset.tab)?.id??'home');closeModal();render(true);break;
    case 'toggle-mission':{if(!missions.some(x=>x.id===id))return;toggleMission(state,localDate(),id);await commit('Progreso actualizado');break;}
    case 'new-pantry':openPantry();break;
    case 'edit-pantry':openPantry(id);break;
    case 'deplete-pantry':{
      const p=state.pantry.find(x=>x.id===id);if(!p)return;
      markOut(state,p.name);
      await commit(`${p.name} añadido a la compra`);break;
    }
    case 'new-grocery':openGrocery();break;
    case 'delete-grocery':state.groceries=state.groceries.filter(g=>g.id!==id);await commit('Apunte eliminado');break;
    case 'buy-shopping':{
      const name=el.dataset.name??'',qty=Number(el.dataset.qty),unit=el.dataset.unit as Unit;
      if(!['g','kg','ud','ml','l'].includes(unit))throw Error('Unidad desconocida.');
      purchase(state,name,qty,unit);await commit('Compra guardada en despensa');break;
    }
    case 'copy-shopping':{
      const list=shoppingList(state,computeCoverage(state,currentWeek()).missing);
      if(!list.length){toast('No hay compras pendientes');break;}
      if(!navigator.clipboard?.writeText)throw Error('Tu navegador no permite copiar la lista.');
      await navigator.clipboard.writeText('Lista de la compra · Mi Salud\n'+list.map(i=>`☐ ${i.name} — ${Number(i.quantity.toFixed(2))} ${i.unit}`).join('\n'));
      toast('Lista copiada al portapapeles');break;
    }
    case 'buy-missing':buyMissing(el.dataset.name??'',Number(el.dataset.qty),el.dataset.unit as Unit);break;
    case 'new-recipe':openRecipe();break;
    case 'view-recipe':showModal(recipeDetail(state,id));break;
    case 'edit-recipe':openRecipe(id);break;
    case 'cook-recipe':openCook(id);break;
    case 'delete-recipe':{
      const r=state.recipes.find(x=>x.id===id);if(!r)return;
      if(!window.confirm(`¿Eliminar «${r.name}»? También se quitará de menús y táperes.`))return;
      state.recipes=state.recipes.filter(x=>x.id!==id);state.plan=state.plan.filter(x=>x.recipeId!==id);state.prepared=state.prepared.filter(x=>x.recipeId!==id);
      closeModal();await commit('Receta eliminada');break;
    }
    case 'consume-prepared':{
      const item=state.prepared.find(x=>x.id===id);if(!item)return;
      item.servings-=1;
      if(item.servings<=0)state.prepared=state.prepared.filter(x=>x.id!==id);
      await commit('Táper consumido');break;
    }
    case 'plan-servings':openServings(id);break;
    case 'week-prev':weekOffset--;render();break;
    case 'week-next':weekOffset++;render();break;
    case 'select-routine':routine=id;render();break;
    case 'log-workout':{
      if(!['A','B','C','CASA'].includes(id))return;
      const today=localDate();const prev=state.workouts.find(x=>x.date===today);
      if(prev){prev.routineId=id;}else state.workouts.push({date:today,routineId:id,note:''});
      markDone('fuerza');await commit('Entrenamiento registrado · +40 XP');break;
    }
    case 'export':downloadBackup(state);toast('Copia exportada');break;
    case 'close-modal':closeModal();break;
    default:break;
  }
}
async function submit(form:HTMLFormElement):Promise<void> {
  const fd=new FormData(form);const str=(name:string)=>String(fd.get(name)??'').trim();const num=(name:string)=>Number(str(name));
  switch(form.id){
    case 'form-pantry':{
      const name=str('productName'),qty=num('quantity'),unit=str('unit') as Unit,id=str('id');
      const habitual=fd.has('habitual'),minStock=num('minStock'),restockQuantity=num('restockQuantity');
      if(!name || name.length>80 || !Number.isFinite(qty)||qty<0 || !['g','kg','ud','ml','l'].includes(unit)
        || !positive(minStock)||!positive(restockQuantity)||minStock>100000||restockQuantity>100000)
        throw Error('Revisa las cantidades del producto.');
      const previous=state.pantry.find(x=>x.id===id);
      if(previous){previous.name=name;previous.quantity=qty;previous.unit=unit;previous.updatedAt=new Date().toISOString();
        previous.habitual=habitual;previous.minStock=minStock;previous.restockQuantity=restockQuantity;}
      else {
        addToPantry(state,name,qty,unit);
        const added=state.pantry.find(x=>joinKey(x.name,x.unit)===joinKey(name,unit));
        if(added){added.habitual=habitual;added.minStock=minStock;added.restockQuantity=restockQuantity;}
      }
      closeModal();await commit('Despensa actualizada');break;
    }
    case 'form-pantry-quick':{
      const message=applyQuickCommand(state,str('phrase'));
      await commit(message);break;
    }
    case 'form-grocery':{
      const name=str('productName'),qty=num('quantity'),unit=str('unit') as Unit;
      if(!name||name.length>80||!positive(qty)||!['g','kg','ud','ml','l'].includes(unit))throw Error('Indica un producto y una cantidad válida.');
      const existing=state.groceries.find(g=>normalizeName(g.name)===normalizeName(name) && g.unit===unit);
      if(existing)existing.quantity+=qty;else state.groceries.push({id:uid(),name,quantity:qty,unit});
      closeModal();await commit('Añadido a la compra');break;
    }
    case 'form-recipe':{
      const name=str('name'),servings=num('servings'),id=str('id'),ingredients=parseIngredients(str('ingredients'));
      if(!name||name.length>100||!Number.isInteger(servings)||servings<1||servings>100)throw Error('Revisa nombre y raciones.');
      const prior=state.recipes.find(r=>r.id===id);
      let photo=prior?.photo;
      const file=fd.get('photo');if(file instanceof File && file.size>0)photo=await shrinkPhoto(file);
      const recipe:Recipe={id:prior?.id??uid(),name,servings,ingredients,method:str('method'),photo,isExample:false};
      if(prior)Object.assign(prior,recipe);else state.recipes.push(recipe);
      closeModal();await commit('Receta guardada');break;
    }
    case 'form-cook':{
      const r=state.recipes.find(x=>x.id===str('id'));if(!r)return;
      const servings=num('servings'),location=str('location') as 'nevera'|'congelador';
      if(!Number.isInteger(servings)||servings<1||servings>60 || !['nevera','congelador'].includes(location))throw Error('Número de raciones no válido.');
      if(!cookRecipe(state,r,servings,location,localDate())){
        const missing=enoughForRecipe(r,state.pantry,servings).missing;
        throw Error(`Faltan ingredientes: ${missing.map(i=>`${i.name} (${Number(i.quantity.toFixed(1))} ${i.unit})`).join(', ')}`);
      }
      markDone('cocina');closeModal();await commit('Táperes guardados e ingredientes descontados');break;
    }
    case 'form-servings':{
      const entry=state.plan.find(x=>x.id===str('id'));if(!entry)return;
      if(!Number.isInteger(num('servings'))||num('servings')<1||num('servings')>30)throw Error('Introduce entre 1 y 30 raciones.');
      entry.servings=num('servings');closeModal();await commit('Menú actualizado');break;
    }
    case 'form-weight':{
      const date=str('date'),weight=num('weight');
      if(!/^\d{4}-\d\d-\d\d$/.test(date)||weight<25||weight>350)throw Error('Peso o fecha no válidos.');
      state.weights=state.weights.filter(x=>x.date!==date);state.weights.push({date,weight});await commit('Peso registrado');break;
    }
    case 'form-sleep':{
      const date=str('date'),hours=num('hours');
      if(!/^\d{4}-\d\d-\d\d$/.test(date)||hours<0.5||hours>18)throw Error('Horas o fecha no válidas.');
      state.sleep=state.sleep.filter(x=>x.date!==date);state.sleep.push({date,hours});
      if(date===localDate())markDone('sueno');await commit('Descanso registrado');break;
    }
    case 'form-settings':{
      const goalWeight=num('goalWeight');if(goalWeight<25||goalWeight>350)throw Error('Objetivo de peso no válido.');
      state.settings.goalWeight=goalWeight;await commit('Objetivo actualizado');break;
    }
  }
}

document.addEventListener('click',event=>{
  const target=event.target as Element;
  // Backdrop taps must never close the dialog: mobile keyboards can generate a
  // synthetic click on this backdrop after the viewport moves. Use X or Escape.
  const button=target.closest<HTMLElement>('[data-action]');
  if(!button || saving)return;
  event.preventDefault();
  void act(button.dataset.action??'',button).catch(error=>toast(error instanceof Error?error.message:'Error inesperado',true));
});
document.addEventListener('change',event=>{
  const input=event.target as HTMLInputElement|HTMLSelectElement;
  if(input.matches('select[data-plan]')){
    const id=input.dataset.plan??'',recipeId=input.value;
    const [date,kind]=id.split(':');
    if(!/^\d{4}-\d\d-\d\d$/.test(date)||!['comida','cena'].includes(kind))return;
    state.plan=state.plan.filter(p=>p.id!==id);
    if(recipeId){state.plan.push({id,date,kind:kind as 'comida'|'cena',recipeId,servings:1});markDone('plan');}
    void commit('Menú actualizado');
  }
  if(input.id==='backup-file' && input instanceof HTMLInputElement){
    const file=input.files?.[0];if(!file)return;
    void file.text().then(text=>{
      if(file.size>12_000_000)throw Error('La copia es demasiado grande.');
      const data:unknown=JSON.parse(text);
      if(!isValidBackup(data))throw Error('Esta copia no es válida o pertenece a otra versión.');
      if(!window.confirm('Se reemplazarán todos los datos actuales por los de la copia. ¿Continuar?'))return;
      state=structuredClone(data);return commit('Copia importada correctamente');
    }).catch(err=>toast(err instanceof Error?err.message:'No se pudo importar la copia',true));
  }
});
document.addEventListener('submit',event=>{
  const form=event.target as HTMLFormElement;if(!(form instanceof HTMLFormElement))return;
  event.preventDefault();if(saving)return;
  void submit(form).catch(err=>toast(err instanceof Error?err.message:'Comprueba los datos',true));
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modalRoot.innerHTML)closeModal();});

async function boot():Promise<void>{
  try {state=await loadData();}catch(err){console.error(err);toast('No se pudo acceder al almacenamiento. Los cambios podrían perderse.',true);}
  render();
  if('serviceWorker' in navigator && location.protocol==='https:' || ('serviceWorker' in navigator && location.hostname==='localhost')){
    // Refresh once when an updated service worker becomes active so the corrected UI loads.
    let refreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!refreshing){refreshing=true;window.location.reload();}
    });
    navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('PWA sin modo sin conexión',err));
  }
}
void boot();
