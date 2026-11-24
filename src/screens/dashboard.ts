import { missions } from '../data/seed.js';
import { dateLabel, localDate } from '../lib/dates.js';
import { levelInfo, totalXP, isMissionDone, todayXP } from '../lib/progress.js';
import { icon } from '../ui/icons.js';
import type { AppData, Category } from '../types.js';

export function dashboard(s:AppData):string {
  const date=localDate(), overall=levelInfo(totalXP(s));
  const categories:{id:Category;name:string;icon:string}[]=[
    {id:'fuerza',name:'Fuerza',icon:'dumbbell'}, {id:'nutricion',name:'Nutrición',icon:'food'},
    {id:'movilidad',name:'Movilidad',icon:'stretch'}, {id:'descanso',name:'Descanso',icon:'moon'},
  ];
  const weight=s.weights.at(-1)?.weight;
  const xpToday=todayXP(s,date);
  return `
    <section class="page-intro"><div class="eyebrow">TU CENTRO DE CONTROL</div>
      <h1>Tu progreso, un día a la vez.</h1><p>Lo importante no es hacerlo perfecto, sino volver mañana.</p></section>
    <div class="hero-card card">
      <div class="hero-top"><div class="avatar">${icon('trophy',30)}</div><div><div class="eyebrow">AVENTURA PERSONAL</div><h2>Mi Salud <span class="level-tag">Nivel ${overall.level}</span></h2></div><span class="hero-spark">✦</span></div>
      <div class="progress-label"><span>PROGRESO GENERAL</span><b>${overall.earned} / ${overall.needed} XP</b></div>
      <div class="track track-green"><div style="width:${overall.percent}%"></div></div>
      <div class="hero-foot"><span>${totalXP(s)} XP acumulados</span><span>¡Sigue sumando!</span></div>
    </div>
    <div class="section-heading"><h2>Tus habilidades</h2><span>Suben por constancia</span></div>
    <div class="skills-grid">${categories.map(c=>{
      const xp=totalXP(s,c.id), lv=levelInfo(xp);
      return `<div class="skill-card"><div class="skill-top"><span class="skill-icon c-${c.id}">${icon(c.icon,22)}</span><span class="skill-level">Nv. ${lv.level}</span></div><h3>${c.name}</h3><div class="track track-blue"><div style="width:${lv.percent}%"></div></div><div class="tiny text-muted">${lv.earned}/${lv.needed} XP</div></div>`;
    }).join('')}</div>
    <div class="section-heading"><h2>Misiones de hoy</h2><span>${dateLabel(date,{day:'numeric',month:'long'})}</span></div>
    <div class="card mission-card"><div class="mission-heading"><span>${icon('fire',18)} Completa lo que puedas</span><strong>+${xpToday} XP hoy</strong></div>
      ${missions.map(m=>{
        const done=isMissionDone(s,date,m.id);
        return `<button class="mission-row ${done?'is-done':''}" data-action="toggle-mission" data-id="${m.id}" aria-pressed="${done}">
          <span class="mission-check">${done?icon('check',17):''}</span><span class="mission-name">${m.name}</span><span class="mission-xp">+${m.xp} XP</span></button>`;
      }).join('')}
      <div class="mission-footer"><span>${(s.completions[date]??[]).length} de ${missions.length} completadas</span><strong>+${xpToday} XP</strong></div>
    </div>
    <div class="section-heading"><h2>Accesos rápidos</h2></div>
    <div class="quick-grid">
      <button data-action="go" data-tab="planner" class="quick-card"><span class="quick-icon">${icon('calendar',22)}</span><b>Organizar menú</b><small>Comidas de la semana</small>${icon('right',17)}</button>
      <button data-action="go" data-tab="pantry" class="quick-card"><span class="quick-icon">${icon('basket',22)}</span><b>Mi despensa</b><small>Productos y compra</small>${icon('right',17)}</button>
    </div>
    <div class="small-stats"><span>${icon('bar',16)} Último peso: <strong>${weight?weight.toLocaleString('es-ES')+' kg':'sin registrar'}</strong></span><span>${icon('clock',16)} Último sueño: <strong>${s.sleep.at(-1)?.hours??'—'} h</strong></span></div>
    <div class="foot-note">Tus datos se guardan en este dispositivo. Haz copias de seguridad desde <button class="text-link" data-action="go" data-tab="health">Salud</button>.</div>
  `;
}
