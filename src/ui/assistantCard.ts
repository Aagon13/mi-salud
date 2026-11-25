import { icon } from './icons.js';
import { escapeHTML } from '../lib/helpers.js';

export function assistantCard(lastReply=''):string {
  const status=lastReply
    ?'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite">'+escapeHTML(lastReply)+'</div>'
    :'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite" hidden></div>';
  return '<section class="card assistant-card">'
    +'<div class="section-heading"><h2>'+icon('sparkle',20)+' Habla con Mi Salud</h2><span class="assistant-pill">Despensa + Compras</span></div>'
    +'<p>Un único asistente para apuntar existencias y consultar precios o tus preferencias.</p>'
    +'<form id="form-assistant" class="assistant-compose" autocomplete="off">'
    +'<input name="message" id="assistant-message" maxlength="220" required aria-label="Mensaje para Mi Salud" placeholder="Me quedan 3 huevos… o ¿Dónde compro mejor el pollo?">'
    +'<button type="button" class="btn btn-secondary assistant-mic" data-action="assistant-voice" aria-label="Dictar al asistente">🎙️</button>'
    +'<button type="submit" class="btn btn-primary assistant-send">'+icon('right',18)+' Enviar</button>'
    +'</form>'
    +'<div class="assistant-examples"><span>Prueba:</span>'
    +'<button type="button" data-action="assistant-example" data-text="Me quedan 3 huevos">Me quedan 3 huevos</button>'
    +'<button type="button" data-action="assistant-example" data-text="Apunta leche a la compra">Apunta leche</button>'
    +'<button type="button" data-action="assistant-example" data-text="¿Dónde compro mejor el pollo?">¿Dónde compro el pollo?</button>'
    +'</div>'+status
    +'<small>El dictado depende del navegador; también puedes usar el micrófono del teclado. Las comparaciones se basan en tus precios registrados, no en precios en tiempo real.</small>'
    +'</section>';
}
