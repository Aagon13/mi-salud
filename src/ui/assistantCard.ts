import { icon } from './icons.js';
import { escapeHTML } from '../lib/helpers.js';

export function assistantCard(lastReply=''):string {
  const status=lastReply
    ?'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite">'+escapeHTML(lastReply)+'</div>'
    :'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite" hidden></div>';
  return '<section class="card assistant-card">'
    +'<div class="section-heading"><h2>'+icon('sparkle',20)+' Actualiza tu despensa</h2><span class="assistant-pill">Despensa</span></div>'
    +'<p>Apunta lo que tienes, compras o consumes.</p>'
    +'<form id="form-assistant" class="assistant-compose" autocomplete="off">'
    +'<input name="message" id="assistant-message" maxlength="220" required aria-label="Mensaje para Mi Salud" placeholder="Me queda un huevo…">'
    +'<button type="button" class="btn btn-secondary assistant-mic" data-action="assistant-voice" aria-label="Dictar al asistente">🎙️</button>'
    +'<button type="submit" class="btn btn-primary assistant-send">'+icon('right',18)+' Enviar</button>'
    +'</form>'
    +'<div class="assistant-examples"><span>Prueba:</span>'
    +'<button type="button" data-action="assistant-example" data-text="Me queda un huevo">Me queda un huevo</button>'
    +'<button type="button" data-action="assistant-example" data-text="He comido un huevo">He comido un huevo</button>'
    +'<button type="button" data-action="assistant-example" data-text="He comprado seis huevos">He comprado seis huevos</button>'
    +'</div>'+status
    +'<small>Reconoce frases habituales, no usa IA conversacional. El micrófono depende del navegador.</small>'
    +'</section>';
}
