import { icon } from './icons.js';
import { escapeHTML } from '../lib/helpers.js';

const purchaseExample = 'Compra Aldi, bolsa brócoli 2 €, patatas 3 €, espárragos 5 euros';

export function assistantCard(lastReply=''):string {
  const status=lastReply
    ?'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite">'+escapeHTML(lastReply)+'</div>'
    :'<div class="assistant-answer" id="assistant-answer" role="status" aria-live="polite" hidden></div>';
  return '<section class="card assistant-card">'
    +'<div class="section-heading"><h2>'+icon('sparkle',20)+' Háblale a Mi Salud</h2><span class="assistant-pill">Despensa + compras</span></div>'
    +'<p>Dicta la compra o pregunta por tus precios y valoraciones.</p>'
    +'<form id="form-assistant" class="assistant-compose" autocomplete="off">'
    +'<textarea name="message" id="assistant-message" maxlength="1600" rows="2" required aria-label="Mensaje para Mi Salud" placeholder="'+escapeHTML(purchaseExample)+'"></textarea>'
    +'<button type="button" class="btn btn-secondary assistant-mic" data-action="assistant-voice" aria-label="Dictar al asistente">🎙️</button>'
    +'<button type="submit" class="btn btn-primary assistant-send">'+icon('right',18)+' Continuar</button>'
    +'</form>'
    +'<div class="assistant-examples"><span>Prueba:</span>'
    +'<button type="button" data-action="assistant-example" data-text="¿Dónde me salió más barato el brócoli?">Comparar un producto</button>'
    +'<button type="button" data-action="assistant-example" data-text="'+escapeHTML(purchaseExample)+'">Compra de ejemplo</button>'
    +'</div>'+status
    +'<small>Puedes dictar varias frases. Pulsa otra vez el micrófono para detener y después Continuar.</small>'
    +'</section>';
}
