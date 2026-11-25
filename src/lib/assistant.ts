import type { AppData } from '../types.js';
import { applyQuickCommand, parseQuickCommand } from './shopping.js';
import { askBuyingAdvice } from './buyingAdvice.js';

export interface AssistantResponse {reply:string;changed:boolean}

/** Una sola entrada para movimientos de despensa y consultas del historial. */
export function processAssistantMessage(s:AppData,input:string):AssistantResponse {
  const raw=input.trim();
  if(!raw)throw Error('Escribe o dicta lo que necesitas.');
  if(raw.length>220)throw Error('Tu mensaje es demasiado largo (máximo 220 caracteres).');

  // Las instrucciones reconocidas modifican el inventario; las preguntas solo consultan datos.
  try{
    parseQuickCommand(raw);
    const reply=applyQuickCommand(s,raw);
    return {reply,changed:true};
  }catch(error){
    // Errores de datos concretos no deben convertirse silenciosamente en una consulta.
    const startsLikeCommand=/^(?:he\s+comprado|compr[eé]|he\s+pillado|he\s+tra[ií]do|se\s+me|se\s+ha|no\s+me\s+queda|ya\s+no\s+tengo|no\s+tengo|no\s+queda|me\s+he\s+quedado|se\s+acab|me\s+queda|tengo|quedan|ahora\s+tengo|apunta|pon\s+|a[nñ]ade|agrega|mete\s+|me\s+falta|necesito|hay\s+que\s+comprar)/iu.test(raw);
    if(startsLikeCommand)throw error;
  }
  const isQuestion=/^(?:[¿¡]?\s*(?:d[oó]nde|qu[eé]|cu[aá]l|cu[aá]nto|c[oó]mo|a\s+cu[aá]nto|por\s+qu[eé]|me\s+conviene|recomi[eé]ndame|dime|en\s+qu[eé]|precio|precios|calidad|gasto|gast[eé]|he\s+gastado))\b/iu.test(raw)
    || /\?$/.test(raw);
  if(!isQuestion)throw Error('Prueba «Me quedan 3 huevos» o «¿Dónde compro mejor el pollo?».');
  return {reply:askBuyingAdvice(s,raw).answer,changed:false};
}
