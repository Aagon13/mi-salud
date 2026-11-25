import { initialData, missions } from './data/seed.js';
import { dashboard } from './screens/dashboard.js';
import { pantry } from './screens/pantry.js';
import { expenses } from './screens/expenses.js';
import { planner } from './screens/planner.js';
import { recipes, recipeDetail } from './screens/recipes.js';
import { training } from './screens/training.js';
import { health } from './screens/health.js';
import { currentWeek, localDate } from './lib/dates.js';
import { loadData, saveData, isValidBackup, downloadFullBackup, restoreBackupPhotos, saveReceiptPhoto, readReceiptPhoto, deleteReceiptPhoto } from './lib/storage.js';
import { compressReceiptPhoto } from './lib/receiptPhoto.js';
import { toggleMission, levelInfo, totalXP } from './lib/progress.js';
import { addToPantry, cookRecipe, enoughForRecipe, computeCoverage } from './lib/planner.js';
import { applyQuickCommand, markOut, purchase, shoppingList, consumePantry, removeFromPantry } from './lib/shopping.js';
import { parseReceiptText, parseReviewedReceipt } from './lib/receipt.js';
import { registerPurchase } from './lib/buyingAdvice.js';
import { processAssistantMessage } from './lib/assistant.js';
import { escapeHTML as esc, optUnits, positive, uid, shrinkPhoto, normalizeName, joinKey } from './lib/helpers.js';
import { icon } from './ui/icons.js';
import type { AppData, Ingredient, Recipe, Unit, PurchaseRecord, ReceiptRecord } from './types.js';

const TABS = [
  {id:'home',label:'Hoy',icon:'home'},
  {id:'planner',label:'Semana',icon:'calendar'},
  {id:'pantry',label:'Despensa',icon:'basket'},
  {id:'expenses',label:'Gastos',icon:'wallet'},
  {id:'recipes',label:'Recetas',icon:'book'},
  {id:'training',label:'Entreno',icon:'dumbbell'},
  {id:'health',label:'Salud',icon:'heart'},
  {id:'more',label:'Más',icon:'grid'},
] as const;
type Tab = typeof TABS[number]['id'];
const MOBILE_TABS = TABS.filter(t=>['home','planner','pantry','expenses','more'].includes(t.id));
const DESKTOP_TABS = TABS.filter(t=>t.id!=='more');
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
function moreMenu():string {
  return `<section class="page-intro"><div class="eyebrow">MIS HERRAMIENTAS</div><h1>Más opciones</h1><p>Entrenamiento, recetas y evolución personal, siempre accesibles.</p></section>
  <div class="more-menu-grid">
    <button type="button" class="more-menu-item" data-action="go" data-tab="recipes">${icon('book',29)}<span><b>Recetas</b><small>Platos y preparación de comidas</small></span>${icon('right',20)}</button>
    <button type="button" class="more-menu-item" data-action="go" data-tab="training">${icon('dumbbell',29)}<span><b>Entreno</b><small>Rutinas, fuerza y progreso</small></span>${icon('right',20)}</button>
    <button type="button" class="more-menu-item" data-action="go" data-tab="health">${icon('heart',29)}<span><b>Salud</b><small>Peso, descanso y copias de seguridad</small></span>${icon('right',20)}</button>
  </div>`;
}
function render(resetScroll=false):void {
  const scroll=window.scrollY;
  const xp=levelInfo(totalXP(state));
  root.innerHTML=`<div class="app-layout">
    <aside class="sidebar"><div class="brand"> <span class="brand-mark">${icon('heart',24)}</span><div><b>MI SALUD</b><small>TU AVENTURA DIARIA</small></div></div>
    <div class="side-caption">NAVEGACIÓN</div>
    <nav aria-label="Secciones">${DESKTOP_TABS.map(t=>`<button class="nav-item ${current===t.id?'active':''}" data-action="go" data-tab="${t.id}" aria-current="${current===t.id?'page':'false'}">${icon(t.icon,20)} <span>${t.label}</span></button>`).join('')}</nav>
    <div class="sidebar-footer"><span class="sidebar-level">${icon('trophy',17)} Nivel ${xp.level}</span><div class="track track-green"><div style="width:${xp.percent}%"></div></div><small>${xp.earned} / ${xp.needed} XP</small></div></aside>
    <div class="content-shell"><header class="topbar"><div class="top-brand">${icon('heart',19)} <strong>Mi Salud</strong></div><span class="top-date">${new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</span><span class="top-badge">${icon('trophy',16)} Nivel ${xp.level}</span></header>
    <main id="main-content" class="content" tabindex="-1">${current==='home'?dashboard(state):current==='planner'?planner(state,currentWeek(weekOffset)):current==='pantry'?pantry(state):current==='expenses'?expenses(state):current==='recipes'?recipes(state):current==='training'?training(state,routine):current==='more'?moreMenu():health(state)}</main>
    <footer class="page-footer">Mi Salud · v0.8 · Privado en tu dispositivo · Sin conexión a servicios externos</footer></div>
    <nav class="bottom-nav" aria-label="Navegación móvil">${MOBILE_TABS.map(t=>`<button class="bottom-item ${current===t.id?'active':''}" data-action="go" data-tab="${t.id}" aria-label="${t.label}" aria-current="${current===t.id?'page':'false'}">${icon(t.icon,21)}<span>${t.label}</span></button>`).join('')}</nav>
  </div>`;
  if(resetScroll) window.scrollTo({top:0,behavior:'instant'}); else window.scrollTo({top:scroll,behavior:'instant'});
  if(lastAssistantReply){const panel=root.querySelector<HTMLElement>('#assistant-answer');if(panel){panel.textContent=lastAssistantReply;panel.hidden=false;}}
}
async function commit(message='Guardado'):Promise<void>{
  saving=true;
  try {await saveData(state);render();toast(message);}
  catch(err){ console.error(err);render();toast('No se pudieron guardar los datos. Exporta una copia e intenta liberar espacio.',true); }
  finally{saving=false;}
}
function showModal(content:string):void {
  disposePhotoUrl();
  lastModalFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  modalRoot.innerHTML=`<div class="modal-shade"><div class="modal-card" role="dialog" aria-modal="true" aria-label="Formulario" tabindex="-1">${content}</div></div>`;
  document.body.classList.add('modal-open');
  // Focus the dialog itself: auto-focusing a text field opens the mobile keyboard
  // while the overlay is moving, which can turn the following tap into a backdrop tap.
  modalRoot.querySelector<HTMLElement>('.modal-card')?.focus({preventScroll:true});
}
let photoDisplayUrl:string|null=null;
function disposePhotoUrl():void{
  if(photoDisplayUrl){URL.revokeObjectURL(photoDisplayUrl);photoDisplayUrl=null;}
}
function closeModal():void{disposePhotoUrl();modalRoot.innerHTML='';document.body.classList.remove('modal-open');lastModalFocus?.focus();}
function modalHeading(title:string,subtitle=''):string {return `<div class="modal-head"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button class="icon-btn" data-action="close-modal" type="button" aria-label="Cerrar">${icon('close')}</button></div>`;}
function field(label:string,input:string):string{return `<label class="field">${esc(label)}${input}</label>`;}
function numberField(name:string,val:string|number='1',min='0.01'):string{return `<input name="${name}" type="number" step="any" min="${min}" value="${esc(val)}" required>`;}
function openPantry(id?:string):void{
  const p=state.pantry.find(x=>x.id===id);
  const habitual=p?.habitual??true;
  showModal(`${modalHeading(p?'Editar producto':'Añadir producto')}
    <form id="form-pantry" class="form-grid" autocomplete="off" novalidate><input type="hidden" name="id" value="${esc(p?.id??'')}">
    ${field('Producto',`<input name="productName" autocomplete="off" placeholder="Ej. Kéfir" value="${esc(p?.name??'')}" maxlength="80" required>`)}
    <div class="form-pair">${field('Cantidad que tengo ahora',numberField('quantity',p?.quantity??1,'0'))}${field('Unidad',`<select name="unit">${optUnits(p?.unit??'ud')}</select>`)}</div>
    <label class="habitual-toggle"><input type="checkbox" name="habitual" ${habitual?'checked':''}><span><b>Lo compro habitualmente</b><small>Que aparezca automáticamente cuando me quede poco.</small></span></label>
    <details class="pantry-advanced"><summary>Reposición automática (opcional)</summary><div class="form-pair">${field('Avisar por debajo de',numberField('minStock',p?.minStock??1,'0'))}${field('Cantidad objetivo',numberField('restockQuantity',p?.restockQuantity??Math.max(p?.quantity??1,1),'0.01'))}</div></details>
    <p class="pantry-form-error" role="alert" aria-live="polite" hidden></p><button class="btn btn-primary btn-wide" type="button" data-action="save-pantry">${icon('save',18)} Guardar producto</button></form>`);
}
function openPurchase(id?:string):void{
  const entry=(state.purchases??[]).find(x=>x.id===id);
  const stores=[...new Set((state.purchases??[]).map(x=>x.store))];
  showModal(modalHeading(entry?'Editar compra':'Registrar compra','Apunta qué compraste, dónde y qué te pareció. No hace falta tener un ticket.') +
    '<form id="form-purchase" class="form-grid" novalidate autocomplete="off">' +
    '<input name="entryId" type="hidden" value="'+esc(entry?.id??'')+'">' +
    field('Producto · usa siempre el mismo nombre para compararlo','<input name="product" required maxlength="80" placeholder="Ej. Pechuga de pollo" value="'+esc(entry?.product??'')+'">') +
    field('Supermercado','<input name="store" required maxlength="80" list="known-stores" placeholder="Ej. Mercadona" value="'+esc(entry?.store??'')+'"><datalist id="known-stores">'+stores.map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist>') +
    field('Fecha','<input type="date" name="date" required value="'+esc(entry?.date??localDate())+'">') +
    '<div class="form-pair">'+field('Cantidad',numberField('quantity',entry?.quantity??1,'0.01'))+field('Unidad','<select name="unit">'+optUnits(entry?.unit??'kg')+'</select>')+'</div>' +
    field('Precio total pagado (€) · opcional','<input name="totalPrice" type="number" min="0.01" step="any" inputmode="decimal" placeholder="Ej. 4,70" value="'+esc(entry?.totalPrice??'')+'">') +
    field('Calidad para ti (opcional)','<select name="quality"><option value="">Sin valorar</option>'+[1,2,3,4,5].map(i=>'<option value="'+i+'" '+(entry?.quality===i?'selected':'')+'>'+i+'/5'+(i===5?' · Excelente':i===1?' · Mala':'')+'</option>').join('')+'</select>') +
    field('Tu experiencia (opcional)','<textarea name="note" maxlength="350" rows="3" placeholder="Ej. Más jugoso; repetiría">'+esc(entry?.note??'')+'</textarea>') +
    (entry?'':'<label class="habitual-toggle"><input type="checkbox" name="addStock"><span><b>También sumarlo a mi despensa</b><small>Desmárcalo si estás registrando una compra antigua o de prueba.</small></span></label>') +
    '<p class="purchase-error" role="alert" aria-live="polite" hidden></p>' +
    '<button type="button" data-action="save-purchase" class="btn btn-primary btn-wide">Guardar compra y valoración</button></form>');
}
async function savePurchase():Promise<void>{
  const form=modalRoot.querySelector<HTMLFormElement>('#form-purchase');
  if(!form)throw Error('No se encontró el formulario de compra.');
  const fd=new FormData(form),str=(k:string)=>String(fd.get(k)??'').trim();
  const parseOptional=(k:string)=>{const v=str(k);return v===''?undefined:Number(v.replace(',','.'));};
  const entry:PurchaseRecord={id:str('entryId')||uid(),date:str('date'),product:str('product'),store:str('store'),
    quantity:Number(str('quantity').replace(',','.')),unit:str('unit') as Unit,totalPrice:parseOptional('totalPrice'),
    quality:parseOptional('quality'),note:str('note')};
  // Validar en una copia temporal antes de modificar el historial real.
  const previous=(state.purchases??[]).find(x=>x.id===entry.id);
  const temp:AppData={...state,purchases:[],pantry:[],groceries:[]};
  registerPurchase(temp,entry,false);
  if(previous){
    state.purchases=(state.purchases??[]).map(x=>x.id===entry.id?entry:x);
  } else registerPurchase(state,entry,fd.has('addStock'));
  closeModal();await commit(previous?'Compra actualizada':'Compra y valoración guardadas');
}
let lastAssistantReply='';
async function sendAssistantMessage(message:string):Promise<void>{
  const result=processAssistantMessage(state,message);
  lastAssistantReply=result.reply;
  if(result.changed){
    await commit('Apuntado en Mi Salud');
  }else{
    const panel=root.querySelector<HTMLElement>('#assistant-answer');
    if(panel){panel.textContent=result.reply;panel.hidden=false;}
  }
}
type BrowserSpeechResult={results:ArrayLike<ArrayLike<{transcript:string}>>};
type BrowserRecognizer={lang:string;interimResults:boolean;maxAlternatives:number;onresult:((e:BrowserSpeechResult)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void};
function startVoiceQuestion():void{
  const speechWindow=window as Window & {SpeechRecognition?:new()=>BrowserRecognizer;webkitSpeechRecognition?:new()=>BrowserRecognizer};
  const Recognition=speechWindow.SpeechRecognition??speechWindow.webkitSpeechRecognition;
  if(!Recognition){toast('El dictado directo no está disponible en este navegador. Usa el micrófono del teclado.',true);return;}
  const input=root.querySelector<HTMLInputElement>('#assistant-message');
  if(!input)return;
  const recognizer=new Recognition();recognizer.lang='es-ES';recognizer.interimResults=false;recognizer.maxAlternatives=1;
  recognizer.onresult=e=>{
    input.value=e.results[0]?.[0]?.transcript??'';
    if(input.value)void sendAssistantMessage(input.value).catch(err=>toast(err instanceof Error?err.message:'No se pudo interpretar',true));
  };
  recognizer.onerror=e=>toast('No se pudo escuchar: '+e.error,true);
  recognizer.onend=()=>{};
  try{recognizer.start();toast('Escuchando tu pregunta…');}
  catch{toast('No se pudo iniciar el micrófono. Prueba el del teclado.',true);}
}
function openReceipt():void{
  selectedReceiptFile=null;
  activeReceiptId=null;
  showModal(modalHeading('Importar ticket','Fotografía de cualquier supermercado. Revisa los artículos antes de guardar.') +
    '<p class="receipt-helper">La lectura se hace en tu móvil. Necesita internet para descargar el lector la primera vez; no se envían las fotos a una IA.</p>' +
    '<div class="form-grid">' +
    field('Supermercado (para el historial)','<input id="receipt-store" maxlength="80" list="known-ticket-stores" placeholder="Ej. Lidl" autocomplete="off" required><datalist id="known-ticket-stores">'+[...new Set((state.purchases??[]).map(x=>x.store))].map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist>') +
    '<div class="receipt-photo-actions">' +
      '<button type="button" class="btn btn-primary" data-action="pick-receipt-camera">'+icon('camera',19)+' Hacer foto</button>' +
      '<button type="button" class="btn btn-secondary" data-action="pick-receipt-gallery">'+icon('upload',19)+' Galería</button>' +
    '</div>' +
    '<input id="receipt-photo-camera" class="receipt-file" aria-label="Cámara para ticket" type="file" accept="image/*" capture="environment">' +
    '<input id="receipt-photo-gallery" class="receipt-file" aria-label="Seleccionar ticket de galería" type="file" accept="image/*">' +
    '<button type="button" class="btn btn-secondary btn-wide" data-action="scan-receipt">Leer foto del ticket</button>' +
    '<p class="receipt-status" role="status" aria-live="polite">Pulsa «Hacer foto» para abrir la cámara o elige un ticket de tu galería. La imagen se archivará automáticamente.</p>' +
    '<img id="receipt-preview" class="receipt-preview" alt="Ticket fotografiado" hidden>' +
    field('Productos detectados · revisa y corrige','<textarea id="receipt-reviewed" rows="9" placeholder="Leche | 2 | l&#10;Huevos | 12 | ud" spellcheck="false"></textarea>') +
    '<small class="receipt-format">Una línea por artículo: nombre | cantidad | unidad (ud, g, kg, ml, l). Puedes corregir las propuestas antes de confirmar. El lector todavía NO extrae precios: podrás añadirlos después en tu historial.</small>' +
    '<details><summary>Ver texto original del ticket</summary><pre id="receipt-raw" class="receipt-raw">Todavía no se ha leído ninguna foto.</pre></details>' +
    '<button type="button" class="btn btn-primary btn-wide" data-action="save-receipt">Confirmar productos y registrar compra</button></div>');
}
type ReceiptWorker={recognize:(image:File)=>Promise<{data:{text:string}}>;terminate:()=>Promise<unknown>};
type OCRLibrary={createWorker:(language:string,mode:number,options:{logger:(progress:{status?:string;progress?:number})=>void})=>Promise<ReceiptWorker>};
let readerLibrary:Promise<OCRLibrary>|undefined;
function loadReceiptReader():Promise<OCRLibrary>{
  if(readerLibrary)return readerLibrary;
  readerLibrary=new Promise<OCRLibrary>((resolve,reject)=>{
    const loaded=(window as Window & {Tesseract?:OCRLibrary}).Tesseract;
    if(loaded){resolve(loaded);return;}
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async=true;
    script.onload=()=>{const lib=(window as Window & {Tesseract?:OCRLibrary}).Tesseract;
      if(lib)resolve(lib);else reject(Error('No se ha podido iniciar el lector del ticket.'));};
    script.onerror=()=>reject(Error('No se pudo descargar el lector. Comprueba que tienes internet.'));
    document.head.append(script);
  }).catch(err=>{readerLibrary=undefined;throw err;});
  return readerLibrary;
}
let selectedReceiptFile:File|null=null;
let activeReceiptId:string|null=null;
async function archiveSelectedReceipt(file:File):Promise<void>{
  const meta=state.receipts??[];
  if(meta.length>=120)throw Error('Ya hay 120 tickets archivados. Elimina algunos antes de guardar más.');
  if(meta.reduce((sum,r)=>sum+r.photoBytes,0)>75_000_000)throw Error('Las fotos guardadas ocupan demasiado espacio. Exporta una copia y libera tickets antiguos.');
  const blob=await compressReceiptPhoto(file);
  const id=uid(),now=new Date().toISOString();
  const record:ReceiptRecord={id,capturedAt:now,date:localDate(),store:'',status:'pending',ocrText:'',reviewedText:'',purchaseIds:[],photoBytes:blob.size};
  await saveReceiptPhoto(id,blob);
  const store=modalRoot.querySelector<HTMLInputElement>('#receipt-store')?.value.trim()??'';
  record.store=store.slice(0,80);
  state.receipts=[...(state.receipts??[]),record];
  activeReceiptId=id;
  await commit('Foto archivada en tu móvil');
  if(!modalRoot.querySelector<HTMLImageElement>('#receipt-preview'))return;
  await displayReceiptPhoto(id);
}
async function displayReceiptPhoto(id:string):Promise<void>{
  const image=modalRoot.querySelector<HTMLImageElement>('#receipt-preview');
  if(!image)return;
  const blob=await readReceiptPhoto(id);
  if(!blob){image.hidden=true;return;}
  disposePhotoUrl();
  photoDisplayUrl=URL.createObjectURL(blob);
  image.src=photoDisplayUrl;image.hidden=false;
}
async function viewReceipt(id:string):Promise<void>{
  const ticket=(state.receipts??[]).find(x=>x.id===id);
  if(!ticket)return;
  const existing=await readReceiptPhoto(id);
  if(!existing)throw Error('No se encuentra la foto original. Puede haberse perdido al importar una copia antigua.');
  activeReceiptId=id;selectedReceiptFile=null;
  if(ticket.status==='pending'){
    openReceipt();
    activeReceiptId=id;
    selectedReceiptFile=new File([existing],'ticket-archivado.jpg',{type:'image/jpeg'});
    modalRoot.querySelector<HTMLInputElement>('#receipt-store')!.value=ticket.store;
    modalRoot.querySelector<HTMLTextAreaElement>('#receipt-reviewed')!.value=ticket.reviewedText;
    modalRoot.querySelector<HTMLElement>('#receipt-raw')!.textContent=ticket.ocrText||'No hay texto OCR guardado.';
    const label=modalRoot.querySelector<HTMLElement>('.receipt-status');
    if(label)label.textContent='Ticket archivado. Puedes revisar sus artículos y confirmar, o volver atrás.';
  }else{
    showModal(modalHeading('Ticket de '+(ticket.store||'supermercado'),ticket.date+' · '+ticket.purchaseIds.length+' artículos vinculados')+
      '<img id="receipt-preview" class="receipt-preview" alt="Fotografía original del ticket" hidden>'+
      '<p class="note">La fotografía se guarda solo en este dispositivo y en tus copias de seguridad completas.</p>'+
      '<details><summary>Ver lectura original</summary><pre class="receipt-raw">'+esc(ticket.ocrText||'No disponible')+'</pre></details>'+
      '<details><summary>Ver artículos confirmados</summary><pre class="receipt-raw">'+esc(ticket.reviewedText||'No disponible')+'</pre></details>');
    activeReceiptId=id;
  }
  await displayReceiptPhoto(id);
}
async function scanReceipt():Promise<void>{
  const file=selectedReceiptFile;
  if(!file)throw Error('Primero selecciona o haz una foto del ticket.');
  if(!file.type.startsWith('image/')||file.size>12_000_000)throw Error('Utiliza una imagen de menos de 12 MB.');
  const label=modalRoot.querySelector<HTMLElement>('.receipt-status');
  const reviewed=modalRoot.querySelector<HTMLTextAreaElement>('#receipt-reviewed');
  const raw=modalRoot.querySelector<HTMLElement>('#receipt-raw');
  const button=modalRoot.querySelector<HTMLButtonElement>('[data-action="scan-receipt"]');
  if(!label||!reviewed||!raw||!button)return;
  button.disabled=true;label.textContent='Preparando el reconocimiento…';
  let worker:ReceiptWorker|undefined;
  try {
    const reader=await loadReceiptReader();
    worker=await reader.createWorker('spa',1,{logger:progress=>{
      if(label.isConnected)label.textContent=(progress.status??'Leyendo imagen')+' '+(progress.progress===undefined?'':Math.round(progress.progress*100)+' %');
    }});
    const result=await worker.recognize(file);
    raw.textContent=result.data.text||'No se ha podido reconocer texto.';
    const items=parseReceiptText(result.data.text||'');
    const record=(state.receipts??[]).find(x=>x.id===activeReceiptId);
    if(record){
      record.ocrText=(result.data.text||'').slice(0,20000);
      record.reviewedText=items.map(x=>x.name+' | '+x.quantity+' | '+x.unit).join('\n');
      await saveData(state);
    }
    reviewed.value=items.map(x=>x.name+' | '+x.quantity+' | '+x.unit).join('\n');
    label.textContent=items.length?'Detectados '+items.length+' posibles productos. Revísalos antes de confirmar.':'No se encontraron productos fiables. Revisa el texto y escribe los artículos manualmente.';
  }catch(err){
    const message=err instanceof Error?err.message:'Error leyendo el ticket.';
    label.textContent=message;toast(message,true);
  }finally{
    if(worker)await worker.terminate().catch(()=>undefined);
    if(button.isConnected)button.disabled=false;
  }
}
async function saveReceipt():Promise<void>{
  const field=modalRoot.querySelector<HTMLTextAreaElement>('#receipt-reviewed');
  if(!field)throw Error('No se encuentra la revisión del ticket.');
  const items=parseReviewedReceipt(field.value);
  const store=modalRoot.querySelector<HTMLInputElement>('#receipt-store')?.value.trim()??'';
  if(!store||store.length>80)throw Error('Indica el supermercado antes de guardar el ticket.');
  const linked=(state.receipts??[]).find(x=>x.id===activeReceiptId);
  if(!linked)throw Error('No se encuentra el ticket archivado. Selecciona una foto antes de importar.');
  if(linked.status==='imported')throw Error('Este ticket ya se ha importado. No se puede duplicar su compra.');
  if(!window.confirm('Se guardarán '+items.length+' productos de '+store+' en tu historial y despensa. El precio está pendiente de registrar. ¿Confirmar?'))return;
  const snapshot:AppData={...state,purchases:state.purchases?[...state.purchases]:[],pantry:state.pantry.map(x=>({...x})),groceries:state.groceries.map(x=>({...x}))};
  const id=linked.id;
  const purchases=items.map(item=>({id:uid(),date:linked.date,product:item.name,store,quantity:item.quantity,unit:item.unit,receiptId:id}));
  for(const item of purchases)registerPurchase(snapshot,item,true);
  snapshot.receipts=(state.receipts??[]).map(r=>r.id===id?{...r,status:'imported',store,reviewedText:field.value,purchaseIds:purchases.map(x=>x.id)}:r);
  state=snapshot;
  closeModal();await commit(items.length+' productos registrados (precios pendientes)');
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
    case 'new-purchase':openPurchase();break;
    case 'edit-purchase':openPurchase(id);break;
    case 'save-purchase':{
      try{await savePurchase();}
      catch(err){const message=err instanceof Error?err.message:'No se pudo guardar la compra.';
        const warning=modalRoot.querySelector<HTMLElement>('.purchase-error');
        if(warning){warning.textContent=message;warning.hidden=false;}
        toast(message,true);}
      break;
    }
    case 'delete-purchase':{
      const item=(state.purchases??[]).find(x=>x.id===id);
      if(!item)return;
      if(!window.confirm('¿Eliminar el registro de '+item.product+' en '+item.store+'? No se cambiarán las existencias de la despensa.'))return;
      state.purchases=(state.purchases??[]).filter(x=>x.id!==id);
      await commit('Registro eliminado');break;
    }
    case 'assistant-voice':startVoiceQuestion();break;
    case 'assistant-example':{
      const input=root.querySelector<HTMLInputElement>('#assistant-message');
      if(input){input.value=el.dataset.text??'';input.focus({preventScroll:true});}
      break;
    }
    case 'open-receipt':openReceipt();break;
    case 'view-receipt':await viewReceipt(id);break;
    case 'delete-receipt':{
      const record=(state.receipts??[]).find(x=>x.id===id);
      if(!record)return;
      if(!window.confirm('¿Eliminar la fotografía del ticket de '+(record.store||record.date)+'? Los artículos y gastos ya registrados NO se borrarán.'))return;
      await deleteReceiptPhoto(id);
      state.receipts=(state.receipts??[]).filter(r=>r.id!==id);
      await commit('Fotografía del ticket eliminada');break;
    }
    case 'pick-receipt-camera':modalRoot.querySelector<HTMLInputElement>('#receipt-photo-camera')?.click();break;
    case 'pick-receipt-gallery':modalRoot.querySelector<HTMLInputElement>('#receipt-photo-gallery')?.click();break;
    case 'scan-receipt':await scanReceipt();break;
    case 'save-receipt':await saveReceipt();break;
    case 'save-pantry':{
      const form=modalRoot.querySelector<HTMLFormElement>('#form-pantry');
      if(!form){toast('No se encontró el formulario de producto.',true);return;}
      const button=el as HTMLButtonElement;
      button.disabled=true;
      button.textContent='Guardando…';
      try {await submit(form);}
      catch(error){
        const message=error instanceof Error?error.message:'No se pudo guardar el producto.';
        const warning=form.querySelector<HTMLElement>('.pantry-form-error');
        if(warning){warning.textContent=message;warning.hidden=false;warning.scrollIntoView({block:'nearest'});}
        toast(message,true);
        button.disabled=false;
        button.textContent='Guardar producto';
      }
      break;
    }
    case 'edit-pantry':openPantry(id);break;
    case 'pantry-minus':{
      const p=state.pantry.find(x=>x.id===id);if(!p)return;
      const amount=p.unit==='ud'?1:p.unit==='kg'||p.unit==='l'?0.1:100;
      if(p.quantity<=0){toast('Este producto ya está agotado. Puedes editarlo o eliminarlo.',true);return;}
      if(p.quantity+1e-9<amount){toast('Quedan '+p.quantity+' '+p.unit+'. Usa Editar para ajustar la cantidad.',true);return;}
      consumePantry(state,p.name,amount,p.unit);
      await commit('Consumido: '+p.name);break;
    }
    case 'pantry-plus':{
      const p=state.pantry.find(x=>x.id===id);if(!p)return;
      const amount=p.unit==='ud'?1:p.unit==='kg'||p.unit==='l'?0.1:100;
      purchase(state,p.name,amount,p.unit);
      await commit('Añadido: '+p.name);break;
    }
    case 'delete-pantry':{
      const p=state.pantry.find(x=>x.id===id);if(!p)return;
      if(!window.confirm('¿Eliminar «'+p.name+'» de la despensa? No se marcará como agotado.'))return;
      removeFromPantry(state,id);
      await commit('Producto eliminado');break;
    }
    case 'deplete-pantry':{
      const p=state.pantry.find(x=>x.id===id);if(!p)return;
      markOut(state,p.name);await commit('Agotado: '+p.name);break;
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
    case 'export':await downloadFullBackup(state);toast('Copia con fotografías exportada');break;
    case 'close-modal':closeModal();break;
    default:break;
  }
}
async function submit(form:HTMLFormElement):Promise<void> {
  const fd=new FormData(form);const str=(name:string)=>String(fd.get(name)??'').trim();const num=(name:string)=>Number(str(name));
  // Consultar el atributo: los campos con name="id" pueden ocultar form.id.
  const formKind=form.getAttribute('id');
  switch(formKind){
    case 'form-pantry':{
      const name=str('productName'),qtyText=str('quantity'),qty=Number(qtyText.replace(',','.'));
      const unit=str('unit') as Unit,id=str('id'),habitual=fd.has('habitual');
      const minRaw=str('minStock'),restockRaw=str('restockQuantity');
      const minStock=minRaw===''?1:Number(minRaw.replace(',','.'));
      const restockQuantity=restockRaw===''?Math.max(1,qty):Number(restockRaw.replace(',','.'));
      if(!name)throw Error('Escribe el nombre del producto antes de guardar.');
      if(name.length>80)throw Error('El nombre no puede superar los 80 caracteres.');
      if(qtyText===''||!Number.isFinite(qty)||qty<0)throw Error('Indica una cantidad válida, igual o superior a cero.');
      if(!['g','kg','ud','ml','l'].includes(unit))throw Error('Selecciona una unidad válida.');
      if(!Number.isFinite(minStock)||minStock<0||minStock>100000)throw Error('Revisa el mínimo para avisarte (puede ser cero).');
      if(!Number.isFinite(restockQuantity)||restockQuantity<=0||restockQuantity>100000)throw Error('La cantidad que quieres tener debe ser mayor que cero.');
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
    case 'form-assistant':{
      await sendAssistantMessage(str('message'));break;
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
    default: throw Error('Formulario no reconocido. Actualiza la página e inténtalo de nuevo.');
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
  if((input.id==='receipt-photo-camera'||input.id==='receipt-photo-gallery')&&input instanceof HTMLInputElement){
    const file=input.files?.[0];
    if(file){
      selectedReceiptFile=file;
      const status=modalRoot.querySelector<HTMLElement>('.receipt-status');
      if(status)status.textContent='Guardando foto del ticket…';
      void archiveSelectedReceipt(file).then(()=>scanReceipt()).catch(err=>{
        const message=err instanceof Error?err.message:'No se pudo archivar el ticket.';
        if(status)status.textContent=message;
        toast(message,true);
      });
    }
  }
  if(input.id==='backup-file' && input instanceof HTMLInputElement){
    const file=input.files?.[0];if(!file)return;
    void file.text().then(text=>{
      if(file.size>200_000_000)throw Error('La copia es demasiado grande.');
      const data:unknown=JSON.parse(text);
      if(!isValidBackup(data))throw Error('Esta copia no es válida o pertenece a otra versión.');
      if(!window.confirm('Se reemplazarán todos los datos actuales por los de la copia. ¿Continuar?'))return;
      return restoreBackupPhotos(data).then(()=>{
        state=structuredClone(data);
        delete (state as AppData & {receiptPhotos?:unknown}).receiptPhotos;
        return commit('Copia importada con fotografías');
      });
    }).catch(err=>toast(err instanceof Error?err.message:'No se pudo importar la copia',true));
  }
});
document.addEventListener('submit',event=>{
  const form=event.target as HTMLFormElement;if(!(form instanceof HTMLFormElement))return;
  event.preventDefault();if(saving)return;
  void submit(form).catch(err=>{
    const message=err instanceof Error?err.message:'Comprueba los datos';
    if(form.getAttribute('id')==='form-pantry'){
      const error= form.querySelector<HTMLElement>('.pantry-form-error');
      if(error){error.textContent=message;error.hidden=false;error.scrollIntoView({block:'nearest'});}
    }
    toast(message,true);
  });
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modalRoot.innerHTML)closeModal();});

async function boot():Promise<void>{
  // Mostrar una interfaz antes de abrir IndexedDB: un bloqueo de la base de
  // datos nunca debe dejar para siempre el texto "Cargando Mi Salud…".
  const waiting=document.querySelector<HTMLDivElement>('#app');
  if(waiting)waiting.innerHTML='<div class="startup-message"><h1>Mi Salud</h1><p>Abriendo tus datos guardados…</p><p>Si tienes otra ventana de Mi Salud abierta, ciérrala para que pueda actualizarse.</p><button class="btn btn-secondary" id="startup-retry" type="button">Reintentar</button></div>';
  waiting?.querySelector<HTMLButtonElement>('#startup-retry')?.addEventListener('click',()=>window.location.reload());
  let loaded=false;
  // La lectura inicial puede demorarse en una actualización de versión.
  const stalled=window.setTimeout(()=>{
    if(loaded)return;
    const msg=waiting?.querySelector<HTMLElement>('.startup-message p');
    if(msg)msg.textContent='La apertura está tardando más de lo normal. Cierra otras pestañas de Mi Salud y pulsa Reintentar. No borres los datos.';
  },6500);
  try{
    state=await loadData();loaded=true;clearTimeout(stalled);
    render();
  }catch(err){
    clearTimeout(stalled);
    console.error(err);
    const detail=err instanceof Error?err.message:'No se pudo abrir el almacenamiento.';
    if(waiting)waiting.innerHTML='<div class="startup-message"><h1>No se han podido abrir tus datos</h1><p>'+esc(detail)+'</p><p>Tus datos no se han borrado. Cierra las otras ventanas y vuelve a intentarlo.</p><button class="btn btn-primary" id="startup-retry" type="button">Reintentar</button></div>';
    waiting?.querySelector<HTMLButtonElement>('#startup-retry')?.addEventListener('click',()=>window.location.reload());
    return;
  }
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
    // No forzar recargas en "controllerchange": las instalaciones antiguas
    // podían quedar atrapadas en una secuencia de actualizaciones/reinicios.
    navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('PWA sin modo sin conexión',err));
  }
}
void boot();
