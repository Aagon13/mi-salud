import { icon } from './icons.js';
import { escapeHTML } from '../lib/helpers.js';

export function assistantCard(lastReply=''):string {
  const status=lastReply
    ?'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite">'+escapeHTML(lastReply)+'</div>'
    :'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite" hidden></div>';
  return '<section class="card assistant-card">'
    +'<div class="section-heading"><h2>'+icon('sparkle',20)+' Háblale a Mi Salud</h2><span class="assistant-pill">Despensa + compras</span></div>'
    +'<p>Dicta existencias, consumos, compras y precios en el mismo sitio.</p>'
    +'<form id="form-assistant" class="assistant-compose" autocomplete="off">'
    +'<textarea name="message" id="assistant-message" maxlength="1600" rows="2" required aria-label="Mensaje para Mi Salud" placeholder="Compra del Mercadona; 500 g de pavo, 4 euros…"></textarea>'
    +'<button type="button" class="btn btn-secondary assistant-mic" data-action="assistant-voice" aria-label="Dictar al asistente">🎙️</button>'
    +'<button type="submit" class="btn btn-primary assistant-send">'+icon('right',18)+' Enviar</button>'
    +'</form>'
    +'<div class="assistant-examples"><span>Prueba:</span>'
    +'<button type="button" data-action="assistant-example" data-text="Me queda un huevo">Me queda un huevo</button>'
    +'<button type="button" data-action="assistant-example" data-text="He comido un huevo">He comido un huevo</button>'
    +'<button type="button" data-action="assistant-example" data-text="He comprado seis huevos">He comprado seis huevos</button>'
    +'</div>'+status
    +'<small>Puedes dictar varias frases. Pulsa otra vez el micrófono para detener y Enviar para revisar antes de guardar.</small>'
    +'</section>';
}
