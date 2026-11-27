import type { AppData, PurchaseRecord, Unit } from '../types.js';
import { normalizeName, productKey, toBase, unitGroup } from './helpers.js';
import { markPresent, purchase } from './shopping.js';

export type StoreComparison = {
  store: string;
  latestPurchaseId: string;
  latestPaid?: number;
  latestPaidDate?: string;
  latestPaidQuantity?: number;
  latestPaidUnit?: Unit;
  unitLabel: string;
  unitGroup: 'g'|'ml'|'ud';
  pricePerUnit?: number;
  unitPriceFormat?: string;
  unitPriceDate?: string;
  rating?: number;
  ratingDate?: string;
  comment?: string;
  date: string;
};
export interface BuyingAdvice {
  answer:string; product?:string; comparisons:StoreComparison[];
  cheapest?:string; bestRated?:string; bestValue?:string;
}
export function registerPurchase(s:AppData,item:PurchaseRecord,addStock=true):void{
  const { quantity } = item;
  if(!item.product.trim()||item.product.length>80||!item.store.trim()||item.store.length>80)throw Error('Indica el producto y el supermercado.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||Number.isNaN(new Date(item.date+'T12:00:00').getTime()))throw Error('Fecha no válida.');
  if(!['g','kg','ml','l','ud'].includes(item.unit)||(quantity!==undefined&&(!Number.isFinite(quantity)||quantity<=0||quantity>100000)))throw Error('Revisa cantidad y unidad.');
  if(item.totalPrice!==undefined&&(!Number.isFinite(item.totalPrice)||item.totalPrice<0.01||item.totalPrice>100000))throw Error('Introduce un precio válido o déjalo vacío.');
  if(item.quality!==undefined&&(!Number.isInteger(item.quality)||item.quality<1||item.quality>5))throw Error('La valoración debe estar entre 1 y 5.');
  if(item.note&&item.note.length>350)throw Error('El comentario es demasiado largo.');
  if (addStock) {
    if (quantity === undefined) markPresent(s, item.product);
    else purchase(s, item.product, quantity, item.unit);
  }
  (s.purchases??=[]).push({...item,product:item.product.trim(),store:item.store.trim(),label:item.label?.trim(),note:item.note?.trim()});
}
export function unitPrice(item:PurchaseRecord):{price:number;label:string;group:'g'|'ml'|'ud'}|null{
  const { totalPrice, quantity } = item;
  if(totalPrice===undefined||!Number.isFinite(totalPrice)||totalPrice<=0||quantity===undefined||!Number.isFinite(quantity)||quantity<=0)return null;
  const group=unitGroup(item.unit),baseQty=toBase(quantity,item.unit);
  const unitSize=group==='ud'?1:1000;
  return {price:totalPrice*unitSize/baseQty,label:group==='g'?'kg':group==='ml'?'l':'ud',group};
}
export function compareStores(s:AppData,product:string):StoreComparison[]{
  const key = productKey(product);
  const records = [...(s.purchases ?? [])].reverse()
    .filter(record => productKey(record.product) === key)
    .sort((a, b) => b.date.localeCompare(a.date));
  const stores = new Map<string,PurchaseRecord[]>();
  for (const record of records) {
    const store = normalizeName(record.store);
    const entries = stores.get(store);
    if (entries) entries.push(record);
    else stores.set(store, [record]);
  }
  const result:StoreComparison[] = [];
  for (const entries of stores.values()) {
    const newest = entries[0];
    const latestPaid = entries.find(record => record.totalPrice !== undefined && Number.isFinite(record.totalPrice) && record.totalPrice > 0);
    const latestRating = entries.find(record => record.quality !== undefined && Number.isInteger(record.quality) && record.quality >= 1 && record.quality <= 5);
    const latestPrice = entries.find(record => {
      const price = unitPrice(record);
      return price !== null && Number.isFinite(price.price) && price.price > 0;
    });
    const price = latestPrice ? unitPrice(latestPrice) : null;
    const group = price?.group ?? unitGroup(newest.unit);
    result.push({
      store: newest.store,
      latestPurchaseId: newest.id,
      latestPaid: latestPaid?.totalPrice,
      latestPaidDate: latestPaid?.date,
      latestPaidQuantity: latestPaid?.quantity,
      latestPaidUnit: latestPaid?.unit,
      unitGroup: group,
      unitLabel: price?.label ?? (group === 'g' ? 'kg' : group === 'ml' ? 'l' : 'ud'),
      pricePerUnit: price?.price,
      unitPriceDate: latestPrice?.date,
      unitPriceFormat: price?.group === 'ud' && latestPrice?.label ? normalizeName(latestPrice.label) : undefined,
      rating: latestRating?.quality,
      ratingDate: latestRating?.date,
      comment: latestRating ? latestRating.note : entries.find(record => Boolean(record.note))?.note,
      date: newest.date,
    });
  }
  return result.sort((a, b) => a.store.localeCompare(b.store, 'es'));
}

type StoreScore = { store: string; score: number };

function leaders(scores: StoreScore[], better: (a: number, b: number) => number): string[] {
  if (scores.length < 2) return [];
  const optimum = scores.reduce((best, entry) => better(best, entry.score), scores[0].score);
  return scores.filter(entry => entry.score === optimum).map(entry => entry.store);
}

function priceBasis(comparison: StoreComparison): string {
  return comparison.unitGroup + '|' + (comparison.unitPriceFormat ?? '');
}

export function summarizeStores(comparisons: StoreComparison[]): { cheapest: string[]; bestRated: string[]; lowestPaid: string[] } {
  const priced = comparisons.filter(row => row.pricePerUnit !== undefined);
  const sameBasis = new Set(priced.map(priceBasis)).size === 1;
  const cheapest = sameBasis
    ? leaders(priced.map(row => ({store: row.store, score: Math.round(row.pricePerUnit! * 100)})), Math.min)
    : [];
  const bestRated = leaders(comparisons.flatMap(row => row.rating === undefined ? [] : [{store: row.store, score: row.rating}]), Math.max);
  const lowestPaid = leaders(comparisons.flatMap(row => row.latestPaid === undefined || row.latestPaidQuantity !== undefined
    ? [] : [{store: row.store, score: Math.round(row.latestPaid * 100)}]), Math.min);
  return { cheapest, bestRated, lowestPaid };
}

function cleaned(value:string):string{return normalizeName(value).replace(/[^\p{L}\p{N}\s]+/gu,' ').replace(/\s+/g,' ').trim();}

export function isBuyingAdviceQuestion(question: string): boolean {
  const ask = cleaned(question).replace(/^(?:dime|muestrame|ensename|me puedes decir)\s+/u, '');
  if (/^(?:compara|comparame)\b/u.test(ask)) return true;
  if (/^(?:cuanto|por cuanto)\b/u.test(ask)) return /\b(?:pague|pagado|costo|cuesta|vale|compre|gaste|gastado|gastamos)\b/u.test(ask);
  if (!/^(?:(?:en |de )?(?:que|cual|donde)|cuanto)\b/u.test(ask)) return false;
  return /\b(?:precio|precios|economic[oa]s?|barat[oa]s?|car[oa]s?|calidad|valore|valorad[oa]s?|valoracion|gusto|gustaron|parecio|compr[aoe]|comprar|conviene|mejor|salio|sale|cost[oa])\b/u.test(ask);
}

const COMMON = new Set(['donde','me','mi','sale','salio','saldria','conviene','comprar','compra','compro','compre',
  'mejor','mas','barato','barata','caro','cara','precio','precios','calidad','valor','vale','merece','pena','que','cual',
  'cuanto','como','de','del','la','el','los','las','un','una','en','es','esta','este','esto','ese','esa','producto',
  'productos','recomiendas','recomendar','comprarlo','comprarla','gustaba','gusto','gustaron','parecio','fue','estaba',
  'hoy','antes','vez','ultimamente','para','por','ti','al','se','segun','a','lo','entre','supermercados','supermercado',
  'dime','muestrame','ensename','compara','comparame','pague','pagado','costo','cuesta','valore','valoracion','valorado']);

function findProduct(s:AppData,question:string):{product?:string;ambiguous?:string[]}{
  const names = new Map<string, string>();
  for (const record of s.purchases ?? []) {
    const key = productKey(cleaned(record.product));
    if (key) names.set(key, record.product.trim());
  }
  const q = productKey(cleaned(question));
  const words = q.split(' ').filter(word => !COMMON.has(word));
  if (!words.length) return {};
  if (names.has(q)) return {product: names.get(q)};
  const matches = [...names].map(([key, name]) => {
    const tokens = key.split(' ');
    const shared = words.filter(word => tokens.includes(word)).length;
    const whole = (' ' + q + ' ').includes(' ' + key + ' ');
    return {name, score: (whole ? 10 : 0) + shared / words.length, shared};
  }).filter(match => match.shared > 0).sort((a, b) => b.score - a.score);
  if (!matches.length) return {};
  const high = matches.filter(match => match.score === matches[0].score);
  if (high.length > 1) return {ambiguous: high.map(match => match.name)};
  return {product: matches[0].name};
}

function euro(n:number):string{return n.toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2});}

export function askBuyingAdvice(s:AppData,question:string):BuyingAdvice{
  const empty:BuyingAdvice = {answer:'', comparisons:[]};
  const q = cleaned(question);
  if (!q) return {...empty, answer:'Escribe qué producto quieres comparar.'};
  if (!s.purchases?.length) return {...empty, answer:'Todavía no hay compras guardadas. Registra una compra en cada supermercado para compararlas.'};
  if (/\b(gasto|gastado|gaste|dinero)\b/u.test(q) && !findProduct(s, q).product) {
    const month = new Date().toISOString().slice(0,7);
    const { total, entries } = monthSpending(s, month);
    return {...empty, answer: entries ? 'Este mes has registrado ' + euro(total) + ' de gasto en ' + entries + ' artículos.'
      : 'Este mes todavía no hay compras con precio registrado.'};
  }
  const found = findProduct(s,q);
  if (found.ambiguous) return {...empty, answer:'Hay varios productos parecidos. Elige ' + found.ambiguous.join(', ') + ' por su nombre.'};
  if (!found.product) return {...empty, answer:'No encuentro ese producto en el historial de compras.'};
  const product = found.product;
  const comparisons = compareStores(s, product);
  const { cheapest, bestRated, lowestPaid } = summarizeStores(comparisons);
  const comparable = comparisons.filter(row => row.rating !== undefined && row.pricePerUnit !== undefined);
  const bestValue = comparable.length >= 2 && new Set(comparable.map(priceBasis)).size === 1
    ? comparable.reduce((a, b) => a.rating! / a.pricePerUnit! >= b.rating! / b.pricePerUnit! ? a : b)
    : undefined;
  const lines = comparisons.map(row => {
    const details = [];
    if (row.pricePerUnit !== undefined) details.push(euro(row.pricePerUnit) + ' por ' + (row.unitPriceFormat ?? row.unitLabel));
    if (row.latestPaid !== undefined && (row.pricePerUnit === undefined || row.latestPaidQuantity === undefined)) {
      details.push(euro(row.latestPaid) + ' pagados' + (row.latestPaidQuantity === undefined ? ' sin cantidad indicada' : ''));
    }
    if (row.rating !== undefined) details.push(row.rating + '/5');
    if (row.comment) details.push('«' + row.comment + '»');
    return row.store + (details.length ? ' · ' + details.join(' · ') : ' · Pendiente de precio y valoración');
  });
  const highlights = [];
  if (comparisons.length < 2) highlights.push('Solo tengo compras de un supermercado. Registra otra compra para comparar.');
  if (cheapest.length) highlights.push('Menor precio comparable en ' + cheapest.join(' y ') + '.');
  if (lowestPaid.length) highlights.push('El menor importe pagado sin cantidad indicada fue en ' + lowestPaid.join(' y ') + '. Registra cantidades para saber dónde sale más barato.');
  if (bestRated.length) highlights.push('Tu mejor valoración fue en ' + bestRated.join(' y ') + '.');
  if (!highlights.length) highlights.push('Faltan precios comparables o valoraciones de distintos supermercados.');
  if (bestValue) highlights.push('✅ Mejor calidad-precio orientativa en ' + bestValue.store + ', calculada con la valoración dividida por el precio comparable.');
  const answer = product + '\n\n' + lines.join('\n') + '\n\n' + highlights.join('\n') + '\n\nSon precios históricos de tus compras.';
  return {product, comparisons, cheapest: cheapest.length === 1 ? cheapest[0] : undefined,
    bestRated: bestRated.length === 1 ? bestRated[0] : undefined, bestValue: bestValue?.store, answer};
}
export function monthSpending(s:AppData,ym:string):{total:number;entries:number}{
  const rows=(s.purchases??[]).filter(x=>x.date.startsWith(ym)&&x.totalPrice!==undefined);
  return {total:rows.reduce((sum,x)=>sum+(x.totalPrice??0),0),entries:rows.length};
}
