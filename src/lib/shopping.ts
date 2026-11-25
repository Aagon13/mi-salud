import type { AppData, Unit } from '../types.js';
import type { MissingIngredient } from './planner.js';
import { joinKey, normalizeName, toBase } from './helpers.js';
import { addToPantry } from './planner.js';

export interface ShoppingItem {
  name: string; quantity: number; unit: Unit;
  reasons: string[]; manualIds: string[];
}

/** Un solo artículo por nombre y familia de unidad: nunca duplica «leche» por estar en dos listas. */
export function shoppingList(s: AppData, missingFromMenu: MissingIngredient[] = []): ShoppingItem[] {
  type Internal = ShoppingItem & { baseQuantity: number };
  const items = new Map<string, Internal>();
  function add(name: string, quantity: number, unit: Unit, reason: string, manualId?: string): void {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const key = joinKey(name, unit);
    const old = items.get(key);
    const desired = toBase(quantity, unit);
    if (old) {
      old.baseQuantity = Math.max(old.baseQuantity, desired);
      if (!old.reasons.includes(reason)) old.reasons.push(reason);
      if (manualId && !old.manualIds.includes(manualId)) old.manualIds.push(manualId);
    } else items.set(key, { name, quantity, unit, reasons: [reason], manualIds: manualId ? [manualId] : [], baseQuantity: desired });
  }
  for (const p of s.pantry) {
    if (!p.habitual) continue;
    const min = Math.max(0.01, p.minStock ?? 1);
    if (p.quantity + 1e-9 >= min) continue;
    const target = Math.max(min, p.restockQuantity ?? 1);
    add(p.name, target - Math.max(p.quantity, 0), p.unit, 'Habitual');
  }
  for (const g of s.groceries) add(g.name, g.quantity, g.unit, 'Apuntado', g.id);
  for (const i of missingFromMenu) add(i.name, i.quantity, i.unit, 'Menú semanal');
  return [...items.values()].map(i => ({
    name: i.name, unit: i.unit,
    quantity: i.baseQuantity / toBase(1, i.unit),
    reasons: i.reasons, manualIds: i.manualIds
  })).sort((a,b) => a.name.localeCompare(b.name,'es'));
}

/** Apunta el agotamiento; si es habitual se repondrá automáticamente. */
export function markOut(s: AppData, name: string): string {
  const key = normalizeName(cleanName(name));
  if (!key) throw Error('Indica qué producto se ha terminado.');
  let p = s.pantry.find(x => normalizeName(x.name) === key);
  if (!p) {
    const cleaned = cleanName(name);
    addToPantry(s, cleaned, 0, 'ud');
    p = s.pantry.find(x => normalizeName(x.name) === key)!;
    p.habitual = true; p.minStock = 1; p.restockQuantity = 1;
  }
  const old = p.quantity;
  p.quantity = 0;
  p.updatedAt = new Date().toISOString();
  if (!p.habitual && !s.groceries.some(g => joinKey(g.name,g.unit) === joinKey(p.name,p.unit))) {
    s.groceries.push({id:crypto.randomUUID(),name:p.name,quantity:Math.max(old,1),unit:p.unit});
  }
  return p.name;
}

export function purchase(s:AppData, name:string, quantity:number, unit:Unit): void {
  if (!name.trim() || !Number.isFinite(quantity) || quantity <= 0) throw Error('Cantidad de compra no válida.');
  const key = joinKey(name,unit);
  const wasKnown = s.pantry.some(p => joinKey(p.name,p.unit) === key);
  addToPantry(s,name,quantity,unit);
  const p = s.pantry.find(p => joinKey(p.name,p.unit) === key);
  if (p && !wasKnown) {p.habitual=true; p.minStock=1; p.restockQuantity=quantity;}
  s.groceries=s.groceries.filter(g => joinKey(g.name,g.unit) !== key);
}

export function cleanName(name:string):string {
  return name.trim().replace(/[.!?¡¿]+$/g,'').replace(/^(?:(?:el|la|los|las|un|una|unos|unas)\s+)/i,'').trim();
}

export type QuickCommand =
  | { action:'out'; name:string }
  | { action:'bought'|'set'|'list'; name:string; quantity:number; unit:Unit|null };

const QUANTITY=/^(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|gramos?|g|litros?|l|mililitros?|ml|unidades?|ud|botellas?|paquetes?|botes?|latas?)?\s*(?:de\s+)?(.+)$/iu;
function readQuantity(value:string):{name:string;quantity:number;unit:Unit|null} {
  const match=value.match(QUANTITY);
  let quantity=1, unit:Unit|null=null, name=cleanName(value);
  if(match){
    quantity=Number(match[1].replace(',','.'));
    const word=normalizeName(match[2]??'');
    unit=!word?null:word.startsWith('kg')||word.startsWith('kilo')?'kg':word.startsWith('g')?'g':word.startsWith('mili')||word==='ml'?'ml':word.startsWith('l')?'l':'ud';
    name=cleanName(match[3]);
  }
  if(!name||name.length>80||!Number.isFinite(quantity)||quantity<0||quantity>100000)
    throw Error('Revisa el nombre y la cantidad del producto.');
  return {name,quantity,unit};
}

/** Frases habituales que también se pueden dictar con el micrófono del teclado. */
export function parseQuickCommand(text:string):QuickCommand {
  const raw=text.trim();
  const out=raw.match(/^(?:(?:se\s+me\s+ha[n]?|se\s+ha[n]?)\s+(?:terminado|acabado)|(?:no\s+me\s+queda[n]?|ya\s+no\s+tengo|no\s+tengo|no\s+queda[n]?|me\s+he\s+quedado\s+sin|se\s+acab[oó]))\s+(.+)$/iu);
  if(out){
    const name=cleanName(out[1]);
    if(!name||name.length>80)throw Error('Nombre de producto no válido.');
    return {action:'out',name};
  }
  const bought=raw.match(/^(?:he\s+comprado|compr[eé]|he\s+pillado|he\s+tra[ií]do)\s+(.+)$/iu);
  if(bought){
    const parsed=readQuantity(bought[1]);
    if(parsed.quantity<=0)throw Error('Indica cuánto has comprado.');
    return {action:'bought',...parsed};
  }
  const stock=raw.match(/^(?:me\s+queda[n]?|tengo|quedan|ahora\s+tengo)\s+(.+)$/iu);
  if(stock) return {action:'set',...readQuantity(stock[1])};
  const shopping=raw.match(/^(?:(?:apunta|pon|a[nñ]ade|agrega|mete)\s+|(?:me\s+falta[n]?|necesito|hay\s+que\s+comprar)\s+)(.+)$/iu);
  if(shopping){
    const value=shopping[1].replace(/\s+(?:a|en|para)\s+(?:la\s+)?(?:lista\s+de\s+)?(?:la\s+)?compra$/iu,'');
    return {action:'list',...readQuantity(value)};
  }
  throw Error('Prueba «Me quedan 3 huevos», «Se acabó la leche», «He comprado 2 litros de leche» o «Apunta arroz a la compra».');
}

export function applyQuickCommand(s:AppData, text:string):string {
  const cmd=parseQuickCommand(text);
  if(cmd.action==='out') return markOut(s,cmd.name)+' añadido a la compra';
  const existing=s.pantry.find(x=>normalizeName(x.name)===normalizeName(cmd.name));
  const unit=cmd.unit??existing?.unit??'ud';
  if(cmd.action==='list'){
    const old=s.groceries.find(x=>joinKey(x.name,x.unit)===joinKey(cmd.name,unit));
    if(old)old.quantity=Math.max(old.quantity,cmd.quantity);
    else s.groceries.push({id:crypto.randomUUID(),name:cmd.name,quantity:Math.max(cmd.quantity,1),unit});
    return cmd.name+' apuntado a la compra';
  }
  if(cmd.action==='set'){
    if(existing){
      if(joinKey(existing.name,existing.unit)!==joinKey(cmd.name,unit))
        throw Error('La unidad no coincide con la que ya tienes. Modifícala desde «Editar producto».');
      existing.quantity=toBase(cmd.quantity,unit)/toBase(1,existing.unit);
      existing.updatedAt=new Date().toISOString();
    } else {
      addToPantry(s,cmd.name,cmd.quantity,unit);
      const added=s.pantry.find(x=>joinKey(x.name,x.unit)===joinKey(cmd.name,unit));
      if(added){added.habitual=true;added.minStock=1;added.restockQuantity=Math.max(1,cmd.quantity);}
    }
    return 'Existencias actualizadas: '+cmd.name;
  }
  if(cmd.quantity<=0)throw Error('Indica cuánto has comprado.');
  purchase(s,cmd.name,cmd.quantity,unit);
  return cmd.name+' añadido a la despensa';
}
