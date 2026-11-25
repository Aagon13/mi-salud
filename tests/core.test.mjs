import test from 'node:test';
import { registerPurchase, askBuyingAdvice } from '../dist/assets/lib/buyingAdvice.js';
import assert from 'node:assert/strict';
import { initialData,missions,routines } from '../dist/assets/data/seed.js';
import { levelInfo, toggleMission,totalXP,isMissionDone } from '../dist/assets/lib/progress.js';
import { computeCoverage,addToPantry,cookRecipe,enoughForRecipe } from '../dist/assets/lib/planner.js';
import { isValidBackup } from '../dist/assets/lib/storage.js';
import { shoppingList, markOut, purchase, parseQuickCommand, applyQuickCommand } from '../dist/assets/lib/shopping.js';
import { weekStart,addDays } from '../dist/assets/lib/dates.js';
import { parseReceiptText,parseReviewedReceipt } from '../dist/assets/lib/receipt.js';

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

test('Los habituales generan reposición, sin duplicados al añadir un apunte',()=>{
 const s=initialData();addToPantry(s,'Leche',2,'l');
 Object.assign(s.pantry[0],{habitual:true,minStock:1,restockQuantity:3});
 assert.equal(shoppingList(s).length,0);
 s.pantry[0].quantity=.5;
 s.groceries.push({id:'a',name:'leche',quantity:1,unit:'l'});
 const list=shoppingList(s);
 assert.equal(list.length,1);assert.equal(list[0].quantity,2.5);
 assert.equal(list[0].manualIds[0],'a');
 purchase(s,'Leche',2.5,'l');
 assert.equal(s.pantry[0].quantity,3);assert.equal(shoppingList(s).length,0);
});
test('El texto de agotamiento respeta los productos habituales',()=>{
 const s=initialData();addToPantry(s,'Huevos',6,'ud');
 Object.assign(s.pantry[0],{habitual:true,minStock:1,restockQuantity:12});
 assert.deepEqual(parseQuickCommand('Se me han terminado los huevos'),{action:'out',name:'huevos'});
 applyQuickCommand(s,'Se me han terminado los huevos');
 assert.equal(s.pantry[0].quantity,0);
 assert.equal(shoppingList(s)[0].quantity,12);
 assert.equal(s.groceries.length,0);
});
test('La compra dictada restaura la despensa y evita duplicar manuales',()=>{
 const s=initialData();
 applyQuickCommand(s,'Se me ha terminado la leche');
 assert.equal(shoppingList(s)[0].quantity,1);
 assert.equal(s.pantry[0].habitual,true);
 applyQuickCommand(s,'He comprado 2 unidades de leche');
 assert.equal(s.pantry[0].quantity,2);
 assert.equal(shoppingList(s).length,0);
});
test('Los faltantes del menú se unen a los habituales por unidad convertible',()=>{
 const s=initialData();addToPantry(s,'Arroz',0,'kg');
 Object.assign(s.pantry[0],{habitual:true,minStock:0.1,restockQuantity:1});
 const list=shoppingList(s,[{name:'arroz',quantity:700,unit:'g'}]);
 assert.equal(list.length,1);assert.equal(list[0].quantity,1);
});
test('Los productos no habituales agotados siguen creando un apunte manual',()=>{
 const s=initialData();addToPantry(s,'Cacao',2,'ud');markOut(s,'Cacao');
 assert.equal(s.pantry[0].quantity,0);
 assert.equal(s.groceries.length,1);
 assert.equal(shoppingList(s)[0].quantity,2);
});

test('Dictado para existencias exactas y lista de compra',()=>{
  const s=initialData();
  applyQuickCommand(s,'He comprado 12 huevos');
  assert.equal(s.pantry[0].quantity,12);
  applyQuickCommand(s,'Me quedan 3 huevos');
  assert.equal(s.pantry[0].quantity,3);
  applyQuickCommand(s,'Apunta café a la compra');
  assert.equal(shoppingList(s).find(x=>x.name==='café').quantity,1);
});
test('Se reconocen líneas comerciales de distintos tickets sin totales',()=>{
  const raw='MERCADONA\n2 Huevos XL 3,10\nLeche entera 1L 1,05\nTOTAL 4,15\nIVA 0,48';
  const rows=parseReceiptText(raw);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0],{name:'Huevos XL',quantity:2,unit:'ud'});
  assert.equal(rows[1].name,'Leche entera 1L');
  const weighed=parseReceiptText('0,350 kg Manzanas 1,19\nTARJETA 3,00');
  assert.deepEqual(weighed[0],{name:'Manzanas',quantity:0.35,unit:'kg'});
});
test('Se validan los artículos revisados antes de importarlos',()=>{
  const r=parseReviewedReceipt('Leche | 2 | l\nHuevos | 12 | ud');
  assert.equal(r.length,2);
  assert.throws(()=>parseReviewedReceipt('TOTAL | 1 | euros'),/Línea 1/);
});

test('Compra registrada añade historial sin modificar datos anteriores cuando no suma stock',()=>{
 const s=initialData();assert.equal(s.purchases,undefined);
 const item={id:'p1',date:'2026-11-23',product:'Pollo',store:'Lidl',quantity:0.5,unit:'kg',totalPrice:4.45,quality:3,note:'Algo seco'};
 registerPurchase(s,item,false);assert.equal(s.purchases.length,1);assert.equal(s.pantry.length,0);
 registerPurchase(s,{...item,id:'p2',store:'Mercadona',totalPrice:4.70,quality:5,note:'Muy jugoso'},true);
 assert.equal(s.pantry[0].quantity,0.5);
});
test('Compara el precio unitario, valoración y calidad-precio con explicaciones',()=>{
 const s=initialData();
 registerPurchase(s,{id:'x',date:'2026-11-20',product:'Pollo',store:'Lidl',quantity:500,unit:'g',totalPrice:4.45,quality:3,note:'Seco'},false);
 registerPurchase(s,{id:'y',date:'2026-11-21',product:'Pollo',store:'Mercadona',quantity:1,unit:'kg',totalPrice:9.4,quality:5,note:'Jugoso'},false);
 const a=askBuyingAdvice(s,'¿Dónde compro mejor el pollo?');
 assert.equal(a.cheapest,'Lidl');assert.equal(a.bestRated,'Mercadona');assert.equal(a.bestValue,'Mercadona');
 assert.match(a.answer,/8,90/);assert.match(a.answer,/9,40/);assert.match(a.answer,/Seco/);
 assert.match(a.answer,/precios históricos/);
});
test('No inventa datos sin historial ni ✅ por una sola tienda',()=>{
 const s=initialData();assert.match(askBuyingAdvice(s,'¿Dónde compro el arroz?').answer,/Todavía no/);
 registerPurchase(s,{id:'1',date:'2026-11-22',product:'Arroz',store:'Aldi',quantity:1,unit:'kg',totalPrice:1.5},false);
 const a=askBuyingAdvice(s,'¿Dónde compro el arroz?');
 assert.equal(a.bestValue,undefined);assert.match(a.answer,/Solo tengo compras/);
});
test('Evita unidades incompatibles y precios negativos',()=>{
 const s=initialData();
 assert.throws(()=>registerPurchase(s,{id:'x',date:'2026-11-20',product:'Pollo',store:'Aldi',quantity:1,unit:'kg',totalPrice:-4}),/precio/);
 registerPurchase(s,{id:'x',date:'2026-11-20',product:'Pollo',store:'Lidl',quantity:1,unit:'ud',totalPrice:5,quality:4},false);
 registerPurchase(s,{id:'y',date:'2026-11-21',product:'Pollo',store:'Aldi',quantity:1,unit:'kg',totalPrice:8,quality:5},false);
 assert.equal(askBuyingAdvice(s,'polLo').bestValue,undefined);
});
