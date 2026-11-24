import { pretty } from '../lib/helpers.js';
import { dateLabel, localDate } from '../lib/dates.js';
import { icon } from '../ui/icons.js';
import type { AppData } from '../types.js';

export function health(s:AppData):string {
 const weights=[...s.weights].sort((a,b)=>a.date.localeCompare(b.date));
 const sleeps=[...s.sleep].sort((a,b)=>a.date.localeCompare(b.date));
 const last=weights.at(-1)?.weight;
 const min=Math.min(...weights.map(w=>w.weight),last??70)-1;
 const max=Math.max(...weights.map(w=>w.weight),s.settings.goalWeight)+1;
 return `<section class="page-intro"><div class="eyebrow">SALUD Y PROGRESO</div><h1>Tu evolución</h1><p>Peso, horas de descanso y copias de seguridad de tus datos.</p></section>
 <div class="health-metrics"><div class="health-metric"><span>${icon('bar',20)} Peso actual</span><strong>${last?`${pretty(last)} kg`:'—'}</strong><small>Objetivo ${pretty(s.settings.goalWeight)} kg</small></div><div class="health-metric"><span>${icon('moon',20)} Último descanso</span><strong>${sleeps.at(-1)?`${pretty(sleeps.at(-1)!.hours)} h`:'—'}</strong><small>Regístralo cuando quieras</small></div></div>
 <div class="card"><h2>Registrar peso</h2><form id="form-weight" class="inline-form"><label>Fecha<input type="date" name="date" value="${localDate()}" required></label><label>Peso (kg)<input type="number" step="0.1" min="25" max="350" name="weight" placeholder="70,0" required></label><button type="submit" class="btn btn-primary">${icon('plus',16)} Guardar</button></form>
 <div class="section-heading"><h3>Últimos registros</h3></div>${weights.length?`<div class="weight-bars">${weights.slice(-10).map(w=>`<div class="weight-point" title="${w.date}: ${w.weight} kg"><span>${pretty(w.weight)}</span><div class="weight-bar" style="height:${Math.max(12,Math.round(15+85*(w.weight-min)/(max-min)))}%"></div><small>${w.date.slice(5)}</small></div>`).join('')}</div>`:`<p class="text-muted">Aún no hay registros de peso.</p>`}</div>
 <div class="card"><h2>Registrar descanso</h2><form id="form-sleep" class="inline-form"><label>Fecha<input type="date" name="date" value="${localDate()}" required></label><label>Horas dormidas<input type="number" step="0.25" min="0.5" max="18" name="hours" placeholder="7" required></label><button type="submit" class="btn btn-primary">${icon('plus',16)} Guardar</button></form>
 ${sleeps.length?`<div class="sleep-list">${sleeps.slice(-5).reverse().map(w=>`<div class="history-row"><b>${dateLabel(w.date,{day:'numeric',month:'short'})}</b><span>${pretty(w.hours)} horas</span></div>`).join('')}</div>`:''}</div>
 <div class="card"><h2>Ajustes y seguridad</h2><form id="form-settings" class="inline-form"><label>Objetivo de peso (kg)<input type="number" step="0.1" min="25" max="350" name="goalWeight" value="${s.settings.goalWeight}" required></label><button class="btn btn-secondary" type="submit">${icon('save',17)} Guardar objetivo</button></form>
 <div class="backup-actions"><button class="btn btn-secondary" data-action="export">${icon('download',18)} Exportar copia JSON</button><label class="btn btn-secondary file-button">${icon('upload',18)} Importar copia<input id="backup-file" type="file" accept="application/json,.json" hidden></label></div>
 <p class="text-muted note">Al importar una copia se reemplazan los datos actuales. Guarda una copia antes de cambiar de móvil o borrar los datos del navegador.</p></div>
 <div class="tip">${icon('info',19)} Esta aplicación ayuda a organizar hábitos, pero no sustituye consejos médicos ni mide automáticamente la salud.</div>`;
}
