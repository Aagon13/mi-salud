import type { AppData, Unit } from '../types.js';
import type { QuickCommand } from './shopping.js';
import { parseQuickCommand, applyQuickAction, purchase } from './shopping.js';
import { registerPurchase } from './buyingAdvice.js';
import { localDate } from './dates.js';
import { uid, normalizeName, productKey } from './helpers.js';

/** Un solo intérprete para existencias, consumo, lista de compra y compras con precio. */
export interface VoiceItem {command:QuickCommand; totalPrice?:number; label?:string}
export interface VoicePlan {store?:string; items:VoiceItem[]}
const STORE_NAMES='Mercadona|Lidl|Aldi|Carrefour|Bonpreu|Bon Preu|Esclat|Caprabo|Condis|Consum|Dia|Alcampo|Hipercor|El Corte Inglés|Bonarea|Bon Àrea|La Sirena|Action|Ikea';
const storeAtStart=new RegExp('^(?:(?:compra|ticket)\\s+(?:del?|de\\s+la)|(?:estoy\\s+comprando|compro|comprando|he\\s+comprado)\\s+en)\\s+('+STORE_NAMES+')(?:\\b|(?=[,;:.]))[\\s,:;.]*','iu');
const storeAtEnd=new RegExp('\\s+en\\s+('+STORE_NAMES+')\\s*$','iu');
const storeOnly=/^(?:(?:compra|ticket)\s+(?:del?|de\s+la)|(?:estoy\s+comprando|compro|comprando|he\s+comprado)\s+en)\s+(.+)$/iu;
const money=/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur)\s*$/iu;
const moneyWithVerb=/(?:(?:me\s+ha\s+costado|me\s+cost[oó]|ha\s+costado|cuesta|cost[oó]|vale|por|precio|a)\s*)(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur)?\s*$/iu;
const packageCount=/^(?:(?:he\s+comprado|compr[eé]|he\s+pillado)\s+)?(un|una|uno|dos|tres|\d+)\s+(bandejas?|paquetes?|bolsas?|latas?|cajas?|botellas?|botes?|packs?|tarrinas?)\s+de\s+(.+)$/iu;
function packageNumber(value:string):number {
 const numbers:Record<string,number>={un:1,una:1,uno:1,dos:2,tres:3};
 return numbers[normalizeName(value)]??Number(value);
}
function parseFragment(raw:string):VoiceItem {
 let text=raw.trim(),totalPrice:number|undefined, label:string|undefined;
 const suffix=text.match(money);
 if(suffix){
   totalPrice=Number(suffix[1].replace(',','.'));
   text=text.slice(0,suffix.index).replace(/\s*(?:,|;)?\s*(?:me\s+ha\s+costado|me\s+cost[oó]|ha\s+costado|cuesta|cost[oó]|vale|por|precio|a)\s*$/iu,'').trim();
 }else{
   const verbose=text.match(moneyWithVerb);
   if(verbose){totalPrice=Number(verbose[1].replace(',','.'));text=text.slice(0,verbose.index).trim();}
 }
 if(totalPrice!==undefined&&(!Number.isFinite(totalPrice)||totalPrice<=0||totalPrice>100000))
   throw Error('El precio debe ser mayor que cero y válido.');
 text=text.replace(/(\d)(kg|gr|g|ml|l)\b/giu,'$1 $2').replace(/[\s,.]+$/gu,'').trim();
 let command:QuickCommand;
 const fallback=text.match(packageCount);
 if(fallback){
    const qty=packageNumber(fallback[1]);
    label=fallback[2].toLowerCase().replace(/s$/u,'');
    command={action:'bought',name:fallback[3].trim(),quantity:qty,unit:'ud'};
 }else{
   const hasCommand=/^(?:he\s+comprado|compr[eé]|he\s+pillado|he\s+tra[ií]do|me\s+queda|tengo|quedan|ahora\s+tengo|no\s+tengo|no\s+me\s+queda|se\s+me|se\s+ha|se\s+acab|me\s+he|he\s+comido|he\s+usado|he\s+consumido|apunta|pon\s+|a[nñ]ade|agrega|mete\s+|necesito|hay\s+que|me\s+falta|borra|elimina|quita|retira|descuenta|resta|r[eé]stame)/iu.test(text);
   command=parseQuickCommand(hasCommand?text:'He comprado '+text);
 }
 if(totalPrice!==undefined&&command.action!=='bought')
   throw Error('El precio solo se puede asociar a una compra.');
 return {command,totalPrice,label};
}
function segments(text:string):string[]{
 const input=text
   .replace(/(?:€|euros?)\s+(?=(?:\d+(?:[.,]\d+)?|un|una|dos|tres)\s+(?:kg|gr|gramos?|litros?|l|ml|bandeja|paquete|huevo|pollo|pavo))/giu,match=>match+'; ')
   .replace(/\s+y\s+(?=(?:he\s+comprado|compr[eé]|me\s+queda|no\s+tengo|he\s+comido|me\s+he\s+comido|apunta|\d+\s+(?:kg|gr|gramos?|litros?|ml|ud|unidades?)|una?\s+(?:bandeja|paquete|caja)))/giu,'; ');
 return input.split(/\s*;\s*|,\s+(?=(?:he\s+comprado|me\s+queda|tengo\s+|no\s+tengo|apunta|\d+\s*(?:kg|gr|gramos?|ml|litros?|bandejas?|paquetes?)|una?\s+(?:bandeja|paquete|caja)))|\.\s+(?=\p{L}|\d)|\n+/iu).map(s=>s.trim()).filter(Boolean);
}
export function parseVoicePlan(state:AppData,input:string):VoicePlan{
 const raw=input.trim();
 if(!raw)throw Error('Di o escribe lo que quieras registrar.');
 if(raw.length>1600)throw Error('El mensaje es demasiado largo. Divide la compra en dos partes.');
 let store=state.shoppingStore?.trim(),rest=raw,explicit=false;
 const initial=rest.match(storeAtStart);
 if(initial){
   store=initial[1];explicit=true;rest=rest.slice(initial[0].length).trim();
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
   const trailing=part.match(storeAtEnd);
   if(trailing){store=trailing[1];explicit=true;part=part.slice(0,trailing.index).trim();}
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
     if(draft.shoppingStore){
       registerPurchase(draft,{id:uid(),date:localDate(),product:cmd.name,quantity:cmd.quantity,unit,
         store:draft.shoppingStore,totalPrice:item.totalPrice,label:item.label},true);
       purchases++;
     }else{
       purchase(draft,cmd.name,cmd.quantity,unit);
     }
     if(item.totalPrice!==undefined){knownTotal+=item.totalPrice;priced++;}
     replies.push(cmd.name+' '+cmd.quantity+' '+unit+(item.totalPrice!==undefined?' · '+item.totalPrice.toFixed(2)+' €':''));
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
