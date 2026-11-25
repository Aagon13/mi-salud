import type { Unit } from '../types.js';
export const uid = ():string => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
export function escapeHTML(raw: unknown):string { return String(raw ?? '').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[c] ?? c); }
export function normalizeName(name:string):string { return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase(); }
export function unitGroup(unit:Unit):'g'|'ml'|'ud' { return unit==='kg'?'g':unit==='l'?'ml':unit; }
export function toBase(qty:number,unit:Unit):number { return qty * (unit==='kg'||unit==='l'?1000:1); }
export function asBaseUnit(unit:Unit):Unit { return unitGroup(unit); }
export function pretty(qty:number):string { return Number(qty.toFixed(2)).toLocaleString('es-ES',{maximumFractionDigits:2}); }
export function optUnits(value:Unit='g'):string { return (['g','kg','ud','ml','l'] as Unit[]).map(u=>`<option value="${u}" ${value===u?'selected':''}>${u}</option>`).join(''); }
export function positive(value:unknown, fallback=0):number { const n=Number(value); return Number.isFinite(n) && n>0?n:fallback; }
/** Igualación conservadora de singular y plural para no duplicar productos. */
export function productKey(name:string):string {
  const clean=normalizeName(name).replace(/^(?:el|la|los|las|un|una|unos|unas)\s+/u,'');
  return clean.split(' ').map(w=>{
    if(w.length>3 && /[aeio]s$/u.test(w))return w.slice(0,-1);
    if(w.length>4 && /[^aeiou]es$/u.test(w))return w.slice(0,-2);
    return w;
  }).join(' ');
}
export function joinKey(name:string,unit:Unit):string { return `${productKey(name)}|${unitGroup(unit)}`; }
export function readTextFile(file:File):Promise<string> { return file.text(); }
export async function shrinkPhoto(file:File):Promise<string> {
  if(!file.type.startsWith('image/')) throw Error('El archivo debe ser una imagen.');
  if(file.size>12_000_000) throw Error('Imagen demasiado grande (máximo 12 MB).');
  const bitmap=await createImageBitmap(file);
  try {
    const factor=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*factor); canvas.height=Math.round(bitmap.height*factor);
    const ctx=canvas.getContext('2d'); if(!ctx) throw Error('No se pudo procesar la foto.');
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.72);
  } finally { bitmap.close(); }
}
