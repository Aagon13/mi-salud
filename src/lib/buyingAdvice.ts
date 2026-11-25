import type { AppData, PurchaseRecord } from '../types.js';
import { normalizeName, unitGroup } from './helpers.js';
import { purchase } from './shopping.js';

export type StoreComparison = {
  store:string; unitLabel:string; unitGroup:'g'|'ml'|'ud';
  pricePerUnit?:number; rating?:number; comment?:string; date:string;
};
export interface BuyingAdvice {
  answer:string; product?:string; comparisons:StoreComparison[];
  cheapest?:string; bestRated?:string; bestValue?:string;
}
export function registerPurchase(s:AppData,item:PurchaseRecord,addStock=true):void{
  if(!item.product.trim()||item.product.length>80||!item.store.trim()||item.store.length>80)throw Error('Indica el producto y el supermercado.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||Number.isNaN(new Date(item.date+'T12:00:00').getTime()))throw Error('Fecha no válida.');
  if(!['g','kg','ml','l','ud'].includes(item.unit)||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>100000)throw Error('Revisa cantidad y unidad.');
  if(item.totalPrice!==undefined&&(!Number.isFinite(item.totalPrice)||item.totalPrice<0.01||item.totalPrice>100000))throw Error('Introduce un precio válido o déjalo vacío.');
  if(item.quality!==undefined&&(!Number.isInteger(item.quality)||item.quality<1||item.quality>5))throw Error('La valoración debe estar entre 1 y 5.');
  if(item.note&&item.note.length>350)throw Error('El comentario es demasiado largo.');
  (s.purchases??=[]).push({...item,product:item.product.trim(),store:item.store.trim(),label:item.label?.trim(),note:item.note?.trim()});
  if(addStock)purchase(s,item.product,item.quantity,item.unit);
}
export function unitPrice(item:PurchaseRecord):{price:number;label:string;group:'g'|'ml'|'ud'}|null{
  if(item.totalPrice===undefined||item.totalPrice<=0||item.quantity<=0)return null;
  const group=unitGroup(item.unit),baseQty=item.quantity*((item.unit==='kg'||item.unit==='l')?1000:1);
  const unitSize=group==='ud'?1:1000;
  return {price:item.totalPrice*unitSize/baseQty,label:group==='g'?'kg':group==='ml'?'l':'ud',group};
}
export function compareStores(s:AppData,product:string):StoreComparison[]{
  const key=normalizeName(product);
  const records=(s.purchases??[]).filter(x=>normalizeName(x.product)===key).sort((a,b)=>b.date.localeCompare(a.date));
  const stores=new Map<string,PurchaseRecord[]>();
  for(const r of records){const k=normalizeName(r.store);stores.set(k,[...(stores.get(k)??[]),r]);}
  const result:StoreComparison[]=[];
  for(const group of stores.values()){
    const newest=group[0],latestPrice=group.find(x=>unitPrice(x)),latestRating=group.find(x=>x.quality!==undefined);
    const p=latestPrice?unitPrice(latestPrice):null;
    result.push({store:newest.store,unitLabel:p?.label??(unitGroup(newest.unit)==='g'?'kg':unitGroup(newest.unit)==='ml'?'l':'ud'),
      unitGroup:p?.group??unitGroup(newest.unit),pricePerUnit:p?.price,rating:latestRating?.quality,
      comment:group.find(x=>Boolean(x.note))?.note,date:newest.date});
  }
  return result.sort((a,b)=>a.store.localeCompare(b.store,'es'));
}
function cleaned(value:string):string{return normalizeName(value).replace(/[^\p{L}\p{N}\s]+/gu,' ').replace(/\s+/g,' ').trim();}
const COMMON=new Set(['donde','me','mi','sale','saldria','conviene','comprar','compro','compre','mejor','mas','barato','barata','caro','cara','precio','precios','calidad','valor','vale','merece','pena','que','cual','cuanto','como','de','del','la','el','los','las','un','una','en','es','esta','este','esto','ese','esa','producto','productos','recomiendas','recomendar','comprarlo','comprarla','gustaba','gusto','parecio','fue','estaba','hoy','antes','vez','ultimamente','para','por','ti','al','se','segun','a','lo','entre','supermercados','supermercado']);
function findProduct(s:AppData,question:string):{product?:string;ambiguous?:string[]}{
  const names=[...new Set((s.purchases??[]).map(x=>x.product.trim()))];
  const q=cleaned(question),words=q.split(' ').filter(x=>x&&!COMMON.has(x));
  if(!words.length)return {};
  const matches=names.map(name=>{
    const token=cleaned(name).split(' ').filter(Boolean),shared=words.filter(w=>token.includes(w)).length;
    const exact=q===cleaned(name)||q.includes(cleaned(name))||cleaned(name).includes(q);
    return {name,score:(exact?10:0)+shared/words.length,shared};
  }).filter(x=>x.shared>0).sort((a,b)=>b.score-a.score);
  if(!matches.length)return {};
  const high=matches.filter(x=>x.score===matches[0].score);
  if(high.length>1)return {ambiguous:high.map(x=>x.name)};
  return {product:matches[0].name};
}
function euro(n:number):string{return n.toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2});}
function same(a:string,b:string):boolean{return normalizeName(a)===normalizeName(b);}
export function askBuyingAdvice(s:AppData,question:string):BuyingAdvice{
  const empty:BuyingAdvice={answer:'',comparisons:[]};
  const q=cleaned(question);
  if(!q)return {...empty,answer:'Escríbeme qué producto quieres comparar.'};
  if(!s.purchases?.length)return {...empty,answer:'Todavía no tengo compras guardadas. Registra dos compras del mismo producto en supermercados diferentes, con su precio y tu valoración, y podré compararlas.'};
  if(/\b(gasto|gastado|gaste|dinero)\b/u.test(q)){
    const month=new Date().toISOString().slice(0,7),priced=s.purchases.filter(x=>x.date.startsWith(month)&&x.totalPrice!==undefined);
    const sum=priced.reduce((acc,x)=>acc+(x.totalPrice??0),0);
    return {...empty,answer:priced.length?'En '+month+' llevas '+euro(sum)+' en '+priced.length+' compras registradas con precio. No cuenta compras que aún no hayas anotado.':'Este mes todavía no hay compras con precio registrado.'};
  }
  const found=findProduct(s,q);
  if(found.ambiguous)return {...empty,answer:'Tengo varios productos parecidos: '+found.ambiguous.join(', ')+'. Dime el nombre exacto para compararlos.'};
  if(!found.product)return {...empty,answer:'No encuentro ese producto en tu historial. Prueba «¿Dónde compro mejor el pollo?» después de registrar alguna compra.'};
  const product=found.product,comparisons=compareStores(s,product);
  const priced=comparisons.filter(x=>x.pricePerUnit!==undefined);
  const groups=new Set(priced.map(x=>x.unitGroup));
  // Nunca declarar que un formato es más barato si las unidades no son equivalentes.
  const sameUnits=groups.size<=1;
  const cheapest=sameUnits&&priced.length?priced.reduce((a,b)=>a.pricePerUnit!<=b.pricePerUnit!?a:b):undefined;
  const rated=comparisons.filter(x=>x.rating!==undefined);
  const bestRated=rated.length?rated.reduce((a,b)=>a.rating!>=b.rating!?a:b):undefined;
  const comparable=priced.filter(x=>x.rating!==undefined&&x.pricePerUnit!>0);
  const bestValue=comparable.length>=2&&new Set(comparable.map(x=>x.unitGroup)).size===1
    ?comparable.reduce((a,b)=>(a.rating!/a.pricePerUnit!) >= (b.rating!/b.pricePerUnit!)?a:b)
    :undefined;
  const lines=comparisons.map(x=>{
    const cost=x.pricePerUnit!==undefined?euro(x.pricePerUnit)+'/'+x.unitLabel:'precio sin registrar';
    const quality=x.rating!==undefined?'tu calidad: '+x.rating+'/5':'sin valorar';
    return x.store+': '+cost+'; '+quality+(x.comment?'; comentaste «'+x.comment+'»':'')+'.';
  });
  let conclusion='';
  if(comparisons.length<2)conclusion='Solo tengo compras de un supermercado. Registra otra compra para comparar.';
  else if(!sameUnits)conclusion='Las compras tienen unidades distintas no comparables: no puedo determinar cuál es más barato.';
  else if(cheapest&&bestRated&&!same(cheapest.store,bestRated.store))
    conclusion='El más barato que registraste fue '+cheapest.store+', pero a ti te gustó más el de '+bestRated.store+'.';
  else if(cheapest&&bestRated)conclusion='Según tus datos, '+cheapest.store+' combina menor precio registrado y tu mejor valoración.';
  else if(cheapest)conclusion='El menor precio registrado es de '+cheapest.store+'. Necesito tus valoraciones para comparar calidad-precio.';
  else if(bestRated)conclusion='El que más te gustó fue el de '+bestRated.store+'. Falta registrar precios.';
  else conclusion='Todavía faltan precios y valoraciones para recomendar una opción.';
  const tick=bestValue?'✅ Mejor calidad-precio orientativa: '+bestValue.store+' (calculada como valoración de 1 a 5 dividida por precio comparable).':
    'El ✅ de calidad-precio aparece cuando hay precios y valoraciones de dos supermercados con unidades equivalentes.';
  const answer='Esto es lo que recuerdo de '+product+':\n\n'+lines.join('\n')+'\n\n'+conclusion+'\n'+tick+'\n\nSon precios históricos de tus compras; pueden haber cambiado.';
  return {product,comparisons,cheapest:cheapest?.store,bestRated:bestRated?.store,bestValue:bestValue?.store,answer};
}
export function monthSpending(s:AppData,ym:string):{total:number;entries:number}{
  const rows=(s.purchases??[]).filter(x=>x.date.startsWith(ym)&&x.totalPrice!==undefined);
  return {total:rows.reduce((sum,x)=>sum+(x.totalPrice??0),0),entries:rows.length};
}
