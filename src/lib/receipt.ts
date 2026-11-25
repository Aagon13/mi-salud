import type { Unit } from '../types.js';

export interface ReceiptItem { name: string; quantity: number; unit: Unit }

/**
 * Interpretación conservadora de OCR: nunca se importan productos sin confirmación.
 * Los tickets de distintos comercios usan descripciones y unidades diferentes.
 */
export function parseReceiptText(raw: string): ReceiptItem[] {
  const result: ReceiptItem[] = [];
  const forbidden = /^(?:total|subtotal|sub\s*total|importe|descuento|devoluci[oó]n|ahorro|iva\b|i\.?v\.?a\.?|base\s+imponible|tarjeta|efectivo|cambio|vuelto|pago|factura|ticket|tiquet|fecha|hora|cajero|caja\b|nif\b|cif\b|tel[eé]fono|cliente|operaci[oó]n|c[oó]digo|promoci[oó]n|puntos|gracias|vis[ií]tanos|direcci[oó]n|cp\b|c\.?p\.?\b|www\.|https?:|mercadona\b|carrefour\b|lidl\b|aldi\b|dia\b|consum\b|bonpreu\b|caprabo\b|eroski\b|alcampo\b|condis\b|bonarea\b|bon\s+area\b)/iu;
  const price = /^(.+?)\s+(?:€\s*)?-?\d{1,5}[,.]\d{2}\s*(?:€|eur)?$/iu;
  for (const source of raw.split(/\r?\n/u)) {
    let line = source.trim().replace(/\t/g, ' ').replace(/\s{2,}/g, ' ');
    if (!line || line.length > 110 || forbidden.test(line) || /^[\d\s.,€/*-]+$/u.test(line)) continue;
    const tail = line.match(price);
    if (tail) line = tail[1].trim();
    if (!line || forbidden.test(line)) continue;
    let quantity = 1;
    let unit:Unit = 'ud';
    const count = line.match(/^(\d{1,2})\s*(?:x|×|\*)\s*(.+)$/iu) || line.match(/^(\d{1,2})\s+([a-záéíóúüñ].+)$/iu);
    if (count) {
      quantity = Number(count[1]);
      line = count[2].trim();
    }
    const weighed = line.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\s+(.+)$/iu);
    if (weighed) {
      quantity *= Number(weighed[1].replace(',', '.'));
      unit = weighed[2].toLowerCase() as Unit;
      line = weighed[3].trim();
    }
    line = line.replace(/^\d{8,14}\s+/u, '').replace(/\s{2,}/g, ' ').replace(/^[\s\-.:;]+|[\s\-.:;]+$/gu, '').trim();
    if (line.length < 3 || line.length > 80 || !/[a-záéíóúüñ]{3}/iu.test(line)
      || forbidden.test(line) || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) continue;
    result.push({name: line, quantity, unit});
    if (result.length === 60) break;
  }
  return result;
}

/** Las líneas revisadas se validan antes de modificar la despensa. */
export function parseReviewedReceipt(raw:string): ReceiptItem[] {
  const lines=raw.split(/\r?\n/u).map(x=>x.trim()).filter(Boolean);
  if (!lines.length) throw Error('No hay productos. Revisa el texto del ticket o añade una línea.');
  if (lines.length > 60) throw Error('Importa como máximo 60 productos cada vez.');
  return lines.map((line, index)=>{
    const parts=line.split('|').map(x=>x.trim());
    const name=parts[0]??'';
    const quantity=Number((parts[1]??'').replace(',','.'));
    const unit=parts[2] as Unit;
    if(parts.length!==3 || !name || name.length>80 || !Number.isFinite(quantity) || quantity<=0
      || quantity>100000 || !['ud','g','kg','ml','l'].includes(unit)) {
      throw Error('Línea '+(index+1)+': escribe Nombre | Cantidad | ud/g/kg/ml/l.');
    }
    return {name,quantity,unit};
  });
}
