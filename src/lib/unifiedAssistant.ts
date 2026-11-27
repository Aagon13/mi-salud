import type { AppData, Unit } from '../types.js';
import type { QuickCommand } from './shopping.js';
import { parseQuickCommand, applyQuickAction, cleanName, markPresent, purchase } from './shopping.js';
import { registerPurchase } from './buyingAdvice.js';
import { localDate } from './dates.js';
import { uid, normalizeName, productKey } from './helpers.js';

/** Un solo intérprete para existencias, consumo, lista de compra y compras con precio. */
export interface VoiceItem {command:QuickCommand; totalPrice?:number; label?:string; quantityUnknown?:true}
export interface VoicePlan {store?:string; items:VoiceItem[]}
const STORE_NAMES='Mercadona|Lidl|Aldi|Carrefour|Bonpreu|Bon Preu|Esclat|Caprabo|Condis|Consum|Dia|Alcampo|Hipercor|El Corte Inglés|Bonarea|Bon Àrea|La Sirena|Action|Ikea';
const storeAtStart=new RegExp('^(?:(?:compra|ticket)(?:\\s+(?:de\\s+la|del?|en))?|(?:estoy\\s+comprando|compro|comprando|he\\s+comprado)\\s+en)\\s+('+STORE_NAMES+')(?:\\b|(?=[,;:.]))[\\s,:;.]*','iu');
const storeAtEnd=new RegExp('\\s+en\\s+('+STORE_NAMES+')\\s*$','iu');
const storeOnly=/^(?:(?:compra|ticket)\s+(?:del?|de\s+la)|(?:estoy\s+comprando|compro|comprando|he\s+comprado)\s+en)\s+(.+)$/iu;
const money=/(?<![\d.,+-])([-+]?\s*\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur)$/iu;
const moneyWithVerb=/(?:^|\s*[,;]\s*|\s+)(?:me\s+ha\s+costado|me\s+cost[oó]|ha\s+costado|cuesta|cost[oó]|vale|por|precio|a)\s+([-+]?\s*\d+(?:[.,]\d{1,2})?)$/iu;
const priceIntroducer=/(?:^|\s*[,;]\s*|\s+)(?:me\s+ha\s+costado|me\s+cost[oó]|ha\s+costado|cuesta|cost[oó]|vale|por|precio|a)\s*$/iu;
const priceMention=/(?:€|\beuros?\b|\beur\b)/iu;
const perItemPrice=/\s+(?:cada\s+un[oa]|por\s+unidad)$/iu;
const purchasePrefix=/^(?:he\s+comprado|compr[eé]|he\s+pillado|he\s+tra[ií]do)\s+/iu;
const packaging='(?:bandejas?|paquetes?|bolsas?|latas?|cajas?|botellas?|botes?|packs?|tarrinas?)';
const packageCount=new RegExp('^(un|una|uno|dos|tres|\\d+)\\s+('+packaging+')\\s+de\\s+(.+)$','iu');
const uncountedPackage=new RegExp('^('+packaging+')\\s+(?:de\\s+)?(.+)$','iu');
const quantityPrefix=/^(?:[-+]?\d+(?:[.,]\d+)?(?:\s|$)|(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|medio|media)\s+)/iu;
const commandPrefix=/^(?:he\s+comprado|compr[eé]|he\s+pillado|he\s+tra[ií]do|me\s+queda|tengo|quedan|ahora\s+tengo|no\s+tengo|no\s+me\s+queda|se\s+me|se\s+ha|se\s+acab|me\s+he|he\s+comido|he\s+usado|he\s+consumido|apunta|pon\s+|a[nñ]ade|agrega|mete\s+|necesito|hay\s+que|me\s+falta|borra|elimina|quita|retira|descuenta|resta|r[eé]stame)/iu;
const productSeparator=/[,;]|\s+y\s+/iu;
const aggregateTotal=/^(?:y\s+)?(?:(?:en\s+)?total(?:\s+(?:general|de\s+(?:la\s+)?compra))?|todo(?:\s+junto)?)$/iu;
const numberWords:Record<string,number>={
 cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,
 diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,
 veinte:20,veintiuno:21,veintiun:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,
 veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,
 treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,
};
const spokenNumber='(?:(?:treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\\s+y\\s+(?:uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)|'+Object.keys(numberWords).join('|')+'|dieciséis|veintiún|veintidós|veintitrés|veintiséis)';
const centsNumber='(?:\\d{1,2}|'+spokenNumber+')\\b';
const spokenPrice=new RegExp('(?<![\\p{L}\\d.,+-])((?:menos\\s+|-\\s*)?)(\\d+|'+spokenNumber+')\\s+euros?\\b(?:\\s+(?:con\\s+('+centsNumber+')(?:\\s+c[eé]ntimos?)?|y\\s+('+centsNumber+')\\s+c[eé]ntimos?))?','giu');

function packageNumber(value:string):number {
 return numberWords[normalizeName(value)]??Number(value);
}
function spokenAmount(value:string):number {
 const [whole,units]=normalizeName(value).split(' y ');
 return packageNumber(whole)+(units?packageNumber(units):0);
}
function normalizeSpokenPrices(value:string):string {
 return value.replace(spokenPrice,(match,sign:string,whole:string,withCents:string|undefined,andCents:string|undefined)=>{
   const cents=withCents??andCents;
   if(cents===undefined&&/^\d+$/u.test(whole)&&!sign)return match;
   const amount=spokenAmount(whole);
   const fraction=cents===undefined?'':','+String(spokenAmount(cents)).padStart(2,'0');
   return (sign?'-':'')+amount+fraction+' euros';
 });
}
function canonicalStore(value:string):string {
 return STORE_NAMES.split('|').find(name=>normalizeName(name)===normalizeName(value))??value;
}
function parseFragment(raw:string):VoiceItem {
 let text=raw.trim().replace(/[.!?]+$/u,'').trim();
 const priceIsPerItem=perItemPrice.test(text);
 text=text.replace(perItemPrice,'').replace(/\s+en\s+total$/iu,'');
 let totalPrice:number|undefined;
 const suffix=text.match(money);
 if(suffix){
   totalPrice=Number(suffix[1].replace(/\s+/gu,'').replace(',','.'));
   text=text.slice(0,suffix.index).replace(priceIntroducer,'').trim();
 }else{
   const verbose=text.match(moneyWithVerb);
   if(verbose){totalPrice=Number(verbose[1].replace(/\s+/gu,'').replace(',','.'));text=text.slice(0,verbose.index).trim();}
 }
 if(totalPrice!==undefined&&(!Number.isFinite(totalPrice)||totalPrice<=0||totalPrice>100000))
   throw Error('El precio debe ser mayor que cero y válido.');
 if(priceMention.test(text)||priceIsPerItem&&totalPrice===undefined)
   throw Error('Di el precio de cada producto, por ejemplo «2 euros con cincuenta».');
 text=text.replace(/(\d)(kg|gr|g|ml|l)\b/giu,'$1 $2').replace(/[\s,.]+$/gu,'').trim();
 if(totalPrice!==undefined&&aggregateTotal.test(text))
   throw Error('Di el precio de cada producto. El total se calcula al revisar la compra.');
 let command:QuickCommand;
 let label:string|undefined;
 const hasCommand=commandPrefix.test(text);
 try{
   command=parseQuickCommand(hasCommand?text:'He comprado '+text);
 }catch(error){
   if(hasCommand&&!purchasePrefix.test(text))throw error;
   const product=text.replace(purchasePrefix,'');
   const counted=product.match(packageCount);
   if(counted){
     const quantity=packageNumber(counted[1]);
     const name=cleanName(counted[3]);
     if(!name||name.length>80||!Number.isFinite(quantity)||quantity<=0||quantity>100000)throw error;
     label=counted[2].toLowerCase().replace(/s$/u,'');
     command={action:'bought',name,quantity,unit:'ud'};
   }else{
     if(totalPrice===undefined||quantityPrefix.test(product))throw error;
     const packed=product.match(uncountedPackage);
     const name=cleanName(packed?.[2]??product);
     if(!name||name.length>80||priceIsPerItem)
       throw Error('Indica el producto y su precio total, o cuántas unidades has comprado.');
     if(productSeparator.test(name))
       throw Error('Di un precio para cada producto, por separado.');
     return {command:{action:'bought',name,quantity:1,unit:null},totalPrice,label:packed?.[1].toLowerCase(),quantityUnknown:true};
   }
 }
 if(totalPrice!==undefined&&command.action!=='bought')
   throw Error('El precio solo se puede asociar a una compra.');
 if(command.action==='bought'&&totalPrice!==undefined){
   if(productSeparator.test(command.name))throw Error('Di un precio para cada producto, por separado.');
   if(priceIsPerItem){
     if(command.unit&&command.unit!=='ud')throw Error('Indica el precio total para cantidades por peso o volumen.');
     totalPrice=Math.round(totalPrice*command.quantity*100)/100;
     if(totalPrice>100000)throw Error('El precio total de la compra supera el límite.');
     command={...command,unit:'ud'};
   }
 }
 return {command,totalPrice,label};
}
function segments(text:string):string[]{
 const input=text
   .replace(/(\d\s*(?:€|euros?\b|eur\b))(?:\s*,\s*|\s+y\s+|\s+)(?=(?!(?:cada|con|de|en|por)\b)[\p{L}\d])/giu,'$1; ')
   .replace(/\s+y\s+(?=(?:he\s+comprado|compr[eé]|me\s+queda|no\s+tengo|he\s+comido|me\s+he\s+comido|apunta|\d+\s+(?:kg|gr|gramos?|litros?|ml|ud|unidades?)|una?\s+(?:bandeja|paquete|caja)))/giu,'; ');
 return input.split(/\s*;\s*|,\s+(?=(?:he\s+comprado|me\s+queda|tengo\s+|no\s+tengo|apunta|\d+\s*(?:kg|gr|gramos?|ml|litros?|bandejas?|paquetes?)|una?\s+(?:kilos?|litros?|gramos?|bandeja|paquete|caja|botella|lata|bolsa)))|\.\s+(?=\p{L}|\d)|\n+/iu).map(s=>s.trim()).filter(Boolean);
}
export function parseVoicePlan(state:AppData,input:string):VoicePlan{
 const raw=input.trim().replace(/[.!?]+$/u,'').trim();
 if(!raw)throw Error('Di o escribe lo que quieras registrar.');
 if(raw.length>1600)throw Error('El mensaje es demasiado largo. Divide la compra en dos partes.');
 let store=state.shoppingStore?.trim(),rest=normalizeSpokenPrices(raw),explicit=false;
 const initial=rest.match(storeAtStart);
 if(initial){
   store=canonicalStore(initial[1]);explicit=true;rest=rest.slice(initial[0].length).trim();
 }else{
   // Para supermercados no incluidos, admitimos una orden independiente.
   const only=rest.match(storeOnly);
   if(only&&!/[\d,;.]/u.test(only[1])){
     const candidate=only[1].trim();
     if(!candidate||candidate.length>80)throw Error('Revisa el nombre del supermercado.');
     return {store:candidate,items:[]};
   }
 }
 const items:VoiceItem[]=[];
 for(let part of segments(rest)){
   part=part.replace(/[.!?]+$/u,'').trim();
   const trailing=part.match(storeAtEnd);
   if(trailing){
     if(explicit&&store&&normalizeName(store)!==normalizeName(trailing[1]))
       throw Error('Registra cada supermercado por separado.');
     store=canonicalStore(trailing[1]);explicit=true;part=part.slice(0,trailing.index).trim();
   }
   if(!part)continue;
   try{items.push(parseFragment(part));}
   catch(e){const cause=e instanceof Error?e.message:'No se entiende el artículo.';
     throw Error('Revisa «'+part.slice(0,75)+'»: '+cause);}
 }
 if(!items.length&&!explicit)throw Error('No se ha reconocido ninguna acción.');
 if(store&&store.length>80)throw Error('El supermercado supera los 80 caracteres.');
 return {store:store||undefined,items};
}
export function applyVoicePlan(state:AppData,plan:VoicePlan):string{
 if(!plan.items.length&&!plan.store)throw Error('No hay cambios que guardar.');
 // Validamos todas las operaciones en una copia para evitar compras parciales.
 const draft=structuredClone(state);
 if(plan.store)draft.shoppingStore=plan.store;
 let purchases=0,priced=0,knownTotal=0;
 const replies:string[]=[];
 for(const item of plan.items){
   const cmd=item.command;
   if(cmd.action==='bought'){
     if(item.totalPrice!==undefined&&!draft.shoppingStore)
       throw Error('Indica el supermercado para guardar el precio.');
     const unit:Unit=cmd.unit??draft.pantry.find(p=>productKey(p.name)===productKey(cmd.name))?.unit??'ud';
     const quantity=item.quantityUnknown?undefined:cmd.quantity;
     if(draft.shoppingStore){
       registerPurchase(draft,{id:uid(),date:localDate(),product:cmd.name,quantity,unit,
         store:draft.shoppingStore,totalPrice:item.totalPrice,label:item.label},true);
       purchases++;
     }else if(quantity===undefined){
       markPresent(draft,cmd.name);
     }else{
       purchase(draft,cmd.name,quantity,unit);
     }
     if(item.totalPrice!==undefined){knownTotal+=item.totalPrice;priced++;}
     replies.push(cmd.name+(quantity===undefined?'':' '+quantity+' '+unit)+(item.totalPrice!==undefined?' · '+item.totalPrice.toFixed(2)+' €':''));
   }else{
     replies.push(applyQuickAction(draft,cmd));
   }
 }
 Object.assign(state,draft);
 if(!plan.items.length)return 'Supermercado seleccionado: '+plan.store;
 let result=plan.items.length+' cambio'+(plan.items.length===1?'':'s')+' registrado'+(plan.items.length===1?'':'s')+'. '+replies.join(' · ');
 if(purchases)result+=' · Compras guardadas en '+draft.shoppingStore;
 if(priced)result+=' · Total conocido: '+knownTotal.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
 return result;
}
