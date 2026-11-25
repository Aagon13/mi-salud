import type { AppData } from '../types.js';
import { applyQuickCommand } from './shopping.js';

export interface AssistantResponse {reply:string;changed:boolean}

/** Por ahora el asistente solo registra órdenes de despensa y lista de compra.
 *  Las preguntas de comparación entre tiendas quedan fuera de la interfaz.
 */
export function processAssistantMessage(s:AppData,input:string):AssistantResponse {
  const raw=input.trim();
  if(!raw)throw Error('Escribe o dicta lo que necesitas.');
  if(raw.length>220)throw Error('Tu mensaje es demasiado largo (máximo 220 caracteres).');
  const reply=applyQuickCommand(s,raw);
  return {reply,changed:true};
}
