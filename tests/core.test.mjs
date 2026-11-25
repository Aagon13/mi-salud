import test from 'node:test';
import { parseVoicePlan, applyVoicePlan } from '../dist/assets/lib/unifiedAssistant.js';
import { processAssistantMessage } from '../dist/assets/lib/assistant.js';
import { expenses } from '../dist/assets/screens/expenses.js';
import { pantry } from '../dist/assets/screens/pantry.js';
import { registerPurchase, askBuyingAdvice } from '../dist/assets/lib/buyingAdvice.js';
import assert from 'node:assert/strict';
import { initialData,missions,routines } from '../dist/assets/data/seed.js';
import { levelInfo, toggleMission,totalXP,isMissionDone } from '../dist/assets/lib/progress.js';
import { computeCoverage,addToPantry,cookRecipe,enoughForRecipe } from '../dist/assets/lib/planner.js';
import { isValidBackup } from '../dist/assets/lib/storage.js';
import { shoppingList, markOut, purchase, parseQuickCommand, applyQuickCommand, consumePantry, removeFromPantry } from '../dist/assets/lib/shopping.js';
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

test('El asistente solo modifica despensa y no gestiona preguntas de dónde comprar',()=>{
 const s=initialData();
 const stock=processAssistantMessage(s,'Me quedan 3 huevos');
 assert.equal(stock.changed,true);
 assert.equal(s.pantry[0].quantity,3);
 const listing=processAssistantMessage(s,'Apunta leche a la compra');
 assert.equal(listing.changed,true);
 assert.equal(shoppingList(s).some(x=>x.name==='leche'),true);
 const before=structuredClone(s);
 assert.throws(()=>processAssistantMessage(s,'¿Dónde compro mejor el pollo?'),/Prueba/);
 assert.deepEqual(s,before);
});
test('Gastos no muestra asistente ni comparaciones; el asistente sigue en Despensa',()=>{
 const s=initialData();
 const gastos=expenses(s);
 assert.doesNotMatch(gastos,/id="form-assistant"|¿Dónde compro|compáralos|conviene comprarlos/);
 assert.match(gastos,/Tickets guardados/);
 assert.match(gastos,/Historial de compras/);
 assert.match(pantry(s),/id="form-assistant"/);
 assert.doesNotMatch(pantry(s),/¿Dónde compro/);
});
test('El asistente no modifica datos ante una frase desconocida',()=>{
 const s=initialData();
 assert.throws(()=>processAssistantMessage(s,'holi'),/Prueba/);
 assert.equal(s.pantry.length,0);
 assert.throws(()=>processAssistantMessage(s,'He comprado 0 litros de leche'),/Indica|cantidad/);
 assert.equal(s.pantry.length,0);
});

test('Me queda un huevo fija 1 aunque antes hubiese tres huevos',()=>{
 const s=initialData();applyQuickCommand(s,'Me quedan 3 huevos');
 assert.equal(s.pantry.length,1);
 const r=processAssistantMessage(s,'Me queda un huevo');
 assert.equal(r.changed,true);assert.equal(s.pantry.length,1);assert.equal(s.pantry[0].quantity,1);
});
test('He comido un huevo resta, no crea otro artículo',()=>{
 const s=initialData();applyQuickCommand(s,'Me quedan 3 huevos');
 processAssistantMessage(s,'He comido un huevo');
 assert.equal(s.pantry.length,1);assert.equal(s.pantry[0].quantity,2);
 assert.throws(()=>processAssistantMessage(s,'He comido tres huevos'),/Solo tienes/);
 assert.equal(s.pantry[0].quantity,2);
});
test('He comprado seis huevos suma sobre huevo singular',()=>{
 const s=initialData();applyQuickCommand(s,'Me queda un huevo');
 applyQuickCommand(s,'He comprado seis huevos');
 assert.equal(s.pantry.length,1);assert.equal(s.pantry[0].quantity,7);
});
test('Quitar de casa elimina sin marcar agotado',()=>{
 const s=initialData();applyQuickCommand(s,'Me quedan 3 huevos');
 applyQuickCommand(s,'Quitar huevos de casa');
 assert.equal(s.pantry.length,0);assert.equal(s.groceries.length,0);
 applyQuickCommand(s,'Me quedan 2 huevos');
 removeFromPantry(s,s.pantry[0].id);
 assert.equal(s.pantry.length,0);
});
test('Cantidades explícitas consolidan duplicados antiguos huevo y huevos',()=>{
 const s=initialData();
 s.pantry.push({id:'a',name:'Huevos',quantity:3,unit:'ud',updatedAt:''},{id:'b',name:'Huevo',quantity:1,unit:'ud',updatedAt:''});
 processAssistantMessage(s,'Me queda un huevo');
 assert.equal(s.pantry.length,1);assert.equal(s.pantry[0].quantity,1);
});

test('El dictado de una bandeja de pavo de 500 gr extrae nombre, cantidad y unidad',()=>{
 const cmd=parseQuickCommand('He comprado una bandeja de pavo de 500 gr');
 assert.deepEqual(cmd,{action:'bought',name:'pavo',quantity:500,unit:'g'});
 const s=initialData();
 processAssistantMessage(s,'He comprado una bandeja de pavo de 500 gr');
 assert.equal(s.pantry.length,1);
 assert.equal(s.pantry[0].name,'pavo');
 assert.equal(s.pantry[0].quantity,500);
 assert.equal(s.pantry[0].unit,'g');
});
test('Los envases de peso conocido se multiplican y se agregan sin duplicados',()=>{
 const s=initialData();
 processAssistantMessage(s,'He comprado 2 bandejas de pavo de 500 g');
 assert.equal(s.pantry[0].quantity,1000);
 processAssistantMessage(s,'He comprado una bandeja de 500 gr de pavo');
 assert.equal(s.pantry[0].quantity,1500);
 assert.equal(s.pantry.length,1);
 processAssistantMessage(s,'He comprado un paquete de arroz de 1 kg');
 assert.equal(s.pantry[1].name,'arroz');
 assert.equal(s.pantry[1].unit,'kg');
 assert.equal(s.pantry[1].quantity,1);
});
test('Productos con cantidad al final y cajas de unidades se interpretan correctamente',()=>{
 assert.deepEqual(parseQuickCommand('He comprado leche de 500 ml'),{action:'bought',name:'leche',quantity:500,unit:'ml'});
 assert.deepEqual(parseQuickCommand('He comprado una caja de 12 huevos'),{action:'bought',name:'huevos',quantity:12,unit:'ud'});
 assert.deepEqual(parseQuickCommand('He comprado tres latas de atún de 80 gramos'),{action:'bought',name:'atún',quantity:240,unit:'g'});
 assert.deepEqual(parseQuickCommand('He comprado 500 gr de pollo'),{action:'bought',name:'pollo',quantity:500,unit:'g'});
});
test('Un error de transcripción no se autocorrige inventando otro alimento',()=>{
 const cmd=parseQuickCommand('He comprado una bandeja de pago de 500 gr');
 assert.equal(cmd.name,'pago');
 assert.equal(cmd.quantity,500);
 assert.equal(cmd.unit,'g');
});
test('No guarda bandejas sin cantidad verificable ni combina dos compras en una',()=>{
 const s=initialData();
 assert.throws(()=>processAssistantMessage(s,'He comprado una bandeja de pavo'),/peso|cantidad/);
 assert.throws(()=>processAssistantMessage(s,'He comprado una bandeja de pavo de 500 gr y un litro de leche'),/producto cada vez/);
 assert.equal(s.pantry.length,0);
});

test('Asistente único: supermercado, cantidad, precio y actualización de despensa',()=>{
 const data=initialData();
 const plan=parseVoicePlan(data,'Compra del Mercadona; 500 gr de pavo me ha costado 4 euros; 1kg de pollo 6,50 euros');
 assert.equal(plan.store,'Mercadona');
 assert.equal(plan.items.length,2);
 assert.deepEqual(plan.items.map(x=>[x.command.name,x.command.quantity,x.command.unit,x.totalPrice]),[
   ['pavo',500,'g',4],['pollo',1,'kg',6.5]
 ]);
 applyVoicePlan(data,plan);
 assert.equal(data.shoppingStore,'Mercadona');
 assert.equal(data.purchases.length,2);
 assert.equal(data.purchases[0].totalPrice,4);
 assert.equal(data.purchases[1].totalPrice,6.5);
 assert.equal(data.pantry.length,2);
 assert.equal(data.pantry[0].quantity,500);
});
test('Asistente único: recuerda la tienda, no inventa precios y admite existencias',()=>{
 const data=initialData();
 applyVoicePlan(data,parseVoicePlan(data,'Compra del Lidl'));
 assert.equal(data.shoppingStore,'Lidl');
 const plan=parseVoicePlan(data,'una bandeja de salchichas; me quedan tres huevos; se me ha terminado la leche');
 assert.equal(plan.items.length,3);
 applyVoicePlan(data,plan);
 assert.equal(data.purchases.length,1);
 assert.equal(data.purchases[0].product,'salchichas');
 assert.equal(data.purchases[0].totalPrice,undefined);
 assert.equal(data.pantry.find(x=>x.name==='huevos').quantity,3);
 assert.equal(data.pantry.find(x=>x.name==='leche').quantity,0);
});
test('Asistente único: no registra precio sin supermercado ni guarda cambios parciales',()=>{
 const data=initialData();
 const plan=parseVoicePlan(data,'He comprado 500 gramos de pavo por 4 euros');
 assert.throws(()=>applyVoicePlan(data,plan),/supermercado/);
 assert.equal(data.pantry.length,0);
 assert.equal(data.purchases,undefined);
 const bad=parseVoicePlan(data,'Me quedan tres huevos; he comido cuatro huevos');
 assert.throws(()=>applyVoicePlan(data,bad),/Solo tienes/);
 assert.equal(data.pantry.length,0);
});
test('Asistente único: acepta compra de varios productos y evita inventar el peso de un envase',()=>{
 const data=initialData();
 const plan=parseVoicePlan(data,'Compra del Mercadona, 500 gr pavo me ha costado 4€, un kilo de pollo 6 euros');
 assert.equal(plan.items.length,2);
 assert.equal(plan.items[0].command.name,'pavo');
 assert.equal(plan.items[1].command.name,'pollo');
 const pack=parseVoicePlan(data,'He comprado una bandeja de salchichas');
 assert.equal(pack.items[0].command.quantity,1);
 assert.equal(pack.items[0].command.unit,'ud');
 assert.equal(pack.items[0].label,'bandeja');
});
