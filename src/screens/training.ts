import { routines, mobility } from '../data/seed.js';
import { dateLabel, localDate } from '../lib/dates.js';
import { escapeHTML } from '../lib/helpers.js';
import { icon } from '../ui/icons.js';
import type { AppData } from '../types.js';

export function training(s:AppData, id:string):string {
 const routine=routines.find(r=>r.id===id)??routines[0], today=localDate();
 const todayDone=s.workouts.find(w=>w.date===today);
 return `<section class="page-intro"><div class="eyebrow">ENTRENAMIENTO</div><h1>Fuerza y movimiento</h1><p>Tu rutina del Excel, un plan B para casa y movilidad diaria.</p></section>
 <div class="routine-tabs">${routines.map(r=>`<button data-action="select-routine" data-id="${r.id}" class="${r.id===id?'active':''}">${r.id==='CASA'?'En casa':r.title}</button>`).join('')}</div>
 <div class="card workout-card"><div class="workout-head"><div><div class="eyebrow">SESIÓN SELECCIONADA</div><h2>${escapeHTML(routine.title)}</h2><p>${escapeHTML(routine.subtitle)}</p></div><div class="workout-symbol">${icon('dumbbell',28)}</div></div>
 ${routine.exercises.map((e,i)=>`<div class="workout-row"><div class="workout-no">${String(i+1).padStart(2,'0')}</div><div><b>${escapeHTML(e.name)}</b><small>${e.sets} series × ${escapeHTML(e.reps)} repeticiones</small></div></div>`).join('')}
 <button class="btn btn-primary btn-wide" data-action="log-workout" data-id="${routine.id}">${icon('check',18)} ${todayDone?'Actualizar entrenamiento de hoy':'Registrar entrenamiento de hoy'}</button>
 ${todayDone?`<p class="success-note">${icon('check',17)} Hoy registraste: ${escapeHTML(routines.find(r=>r.id===todayDone.routineId)?.title??todayDone.routineId)}</p>`:''}
 </div>
 <div class="section-heading"><h2>Movilidad · 15 minutos</h2><span>Sin material</span></div>
 <div class="card list-card">${mobility.map(([name,desc],i)=>`<div class="mobility-row"><span>${i+1}</span><div><b>${name}</b><small>${desc}</small></div></div>`).join('')}
 <button class="btn btn-secondary btn-wide" data-action="toggle-mission" data-id="movilidad">${icon('stretch',17)} Marcar / desmarcar movilidad de hoy</button></div>
 <div class="section-heading"><h2>Historial reciente</h2><span>${s.workouts.length} sesiones</span></div>
 <div class="card list-card">${s.workouts.length?s.workouts.slice(-6).reverse().map(w=>`<div class="history-row"><b>${dateLabel(w.date,{day:'numeric',month:'short'})}</b><span>${escapeHTML(routines.find(r=>r.id===w.routineId)?.title??w.routineId)}</span></div>`).join(''):`<p class="text-muted tiny-pad">Todavía no hay sesiones registradas.</p>`}</div>
 <div class="tip">${icon('info',19)} Las rutinas A/B/C se han transcrito de tu Excel. Antes de retomar cargas altas, ajusta volumen y esfuerzo a tu nivel actual. Evita movimientos que provoquen dolor.</div>`;
}
