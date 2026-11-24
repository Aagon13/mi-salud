import test from 'node:test';
import assert from 'node:assert/strict';
import { initialData,missions,routines } from '../dist/assets/data/seed.js';
import { levelInfo, toggleMission,totalXP,isMissionDone } from '../dist/assets/lib/progress.js';
import { computeCoverage,addToPantry,cookRecipe,enoughForRecipe } from '../dist/assets/lib/planner.js';
import { isValidBackup } from '../dist/assets/lib/storage.js';
import { weekStart,addDays } from '../dist/assets/lib/dates.js';

const week='2026-11-23';
test('XP por misión y niveles acumulativos',()=>{
 const s=initialData();assert.equal(totalXP(s),0);assert.deepEqual(levelInfo(0),{level:1,earned:0,needed:200,percent:0});
 toggleMission(s,week,'movilidad');assert.equal(totalXP(s),20);assert.equal(isMissionDone(s,week,'movilidad'),true);
 toggleMission(s,week,'movilidad');assert.equal(totalXP(s),0);
 assert.equal(levelInfo(240).level,2);
 assert.equal(missions.length,5);
});
test('Despensa inicialmente vacía, recetas ejemplo identificadas',()=>{
 const s=initialData();assert.equal(s.pantry.length,0);assert.ok(s.recipes.length>0);
 assert.ok(s.recipes.every(r=>r.isExample));assert.equal(s.settings.goalWeight,74);
 assert.equal(routines.filter(r=>r.id!=='CASA').length,3);
});
test('La compra agrega cantidades con unidades convertibles',()=>{
 const s=initialData();addToPantry(s,'Arroz',1,'kg');addToPantry(s,'arroz',250,'g');
 assert.equal(s.pantry.length,1);assert.equal(s.pantry[0].quantity,1.25);assert.equal(s.pantry[0].unit,'kg');
});
test('Planificador no cuenta una comida sin ingredientes',()=>{
 const s=initialData();s.plan.push({id:`${week}:comida`,date:week,kind:'comida',recipeId:'demo-pollo',servings:2});
 let cv=computeCoverage(s,week);assert.equal(cv.ready,0);assert.ok(cv.missing.length>0);
 addToPantry(s,'Pollo',300,'g');addToPantry(s,'Arroz',140,'g');addToPantry(s,'Verduras',300,'g');
 cv=computeCoverage(s,week);assert.equal(cv.ready,1);assert.equal(cv.missing.length,0);
});
test('Cocinar descuenta stock y registra táperes',()=>{
 const s=initialData();const recipe=s.recipes.find(r=>r.id==='demo-pollo');
 assert.ok(recipe);assert.equal(enoughForRecipe(recipe,s.pantry,2).ok,false);
 addToPantry(s,'Pollo',300,'g');addToPantry(s,'Arroz',140,'g');addToPantry(s,'Verduras',300,'g');
 assert.equal(cookRecipe(s,recipe,2,'congelador',week),true);
 assert.equal(s.prepared[0].servings,2);assert.equal(s.pantry.every(p=>p.quantity===0),true);
 s.plan.push({id:`${week}:comida`,date:week,kind:'comida',recipeId:'demo-pollo',servings:1});
 assert.equal(computeCoverage(s,week).ready,1);
});
test('Fechas semana Monday a Sunday',()=>{
 assert.equal(weekStart('2026-11-24'),'2026-11-23');
 assert.equal(addDays('2026-11-30',1),'2026-12-01');
});
test('Se valida la estructura de una copia de seguridad',()=>{
 assert.equal(isValidBackup(initialData()),true);
 assert.equal(isValidBackup({version:1}),false);
});
