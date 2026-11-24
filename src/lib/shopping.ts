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
  | { action:'bought'; name:string; quantity:number; unit:Unit|null };

/** Intencionadamente sin IA: se pueden dictar estas frases con el micrófono del teclado. */
export function parseQuickCommand(text:string):QuickCommand {
  const raw=text.trim();
  const out = raw.match(/^(?:(?:se\s+me\s+ha[n]?|se\s+ha[n]?)\s+(?:terminado|acabado)|(?:no\s+me\s+queda[n]?|ya\s+no\s+tengo|no\s+tengo|no\s+queda[n]?|me\s+he\s+quedado\s+sin|se\s+acab[oó]))\s+(.+)$/iu);
  if(out) {
    const name=cleanName(out[1]);
    if(!name || name.length>80)throw Error('Nombre de producto no válido.');
    return {action:'out',name};
  }
  const bought=raw.match(/^(?:he\s+comprado|compr[eé]|he\s+pillado)\s+(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|gramos?|g|litros?|l|mililitros?|ml|unidades?|ud|botellas?|paquetes?)?\s*(?:de\s+)?(.+)$/iu);
  if(bought) {
    const quantity=Number(bought[1].replace(',','.'));
    const name=cleanName(bought[3]);
    if(!Number.isFinite(quantity)||quantity<=0||quantity>100000||!name||name.length>80)throw Error('Revisa el producto y la cantidad.');
    const spoken=normalizeName(bought[2]??'');
    const unit:Unit|null = !spoken ? null : /^k/.test(spoken)?'kg':/^g/.test(spoken)?'g':/^ml|^mili/.test(spoken)?'ml':/^l/.test(spoken)?'l':'ud';
    return {action:'bought',name,quantity,unit};
  }
  throw Error('Prueba «Se me ha terminado la leche» o «He comprado 2 litros de leche».');
}

export function applyQuickCommand(s:AppData, text:string):string {
  const command=parseQuickCommand(text);
  if(command.action==='out') return `${markOut(s,command.name)} añadido a la compra`;
  const p=s.pantry.find(x=>normalizeName(x.name)===normalizeName(command.name));
  const unit=command.unit ?? p?.unit ?? 'ud';
  purchase(s,command.name,command.quantity,unit);
  return `${command.name} añadido a la despensa`;
}
