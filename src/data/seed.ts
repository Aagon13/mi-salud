import type { AppData, Mission, WorkoutRoutine } from '../types.js';

export const missions: Mission[] = [
  {id:'movilidad',name:'15 minutos de movilidad',xp:20,category:'movilidad',icon:'stretch'},
  {id:'fuerza',name:'Entrenamiento de fuerza o en casa',xp:40,category:'fuerza',icon:'dumbbell'},
  {id:'cocina',name:'Preparar comida para otro día',xp:15,category:'nutricion',icon:'chef'},
  {id:'plan',name:'Planificar mis comidas',xp:10,category:'nutricion',icon:'calendar'},
  {id:'sueno',name:'Registrar el descanso',xp:10,category:'descanso',icon:'moon'},
];

// Transcrito de la hoja «RUTINA AARON» del archivo de ejercicios aportado.
// No se han modificado series ni repeticiones respecto a esa hoja.
export const routines: WorkoutRoutine[] = [
  { id:'A', title:'Rutina A', subtitle:'Pecho + cadena posterior', exercises:[
    {name:'Press banca',sets:5,reps:'6'}, {name:'Press inclinado',sets:3,reps:'10–12'},
    {name:'Cruces polea',sets:3,reps:'12–15'}, {name:'Peso muerto',sets:5,reps:'6'},
    {name:'Glute ham raise',sets:3,reps:'10–12'}, {name:'Leg curl',sets:3,reps:'12–15'},
  ]},
  { id:'B', title:'Rutina B', subtitle:'Espalda + hombro', exercises:[
    {name:'Dominadas',sets:5,reps:'6'}, {name:'Seal row',sets:3,reps:'10–12'},
    {name:'Pulldown',sets:3,reps:'12–15'}, {name:'Press militar',sets:5,reps:'6'},
    {name:'Elevaciones laterales',sets:3,reps:'10–12'}, {name:'Fondos estrechos',sets:3,reps:'12–15'},
  ]},
  { id:'C', title:'Rutina C', subtitle:'Pierna + espalda + brazos', exercises:[
    {name:'Sentadilla',sets:5,reps:'6'}, {name:'Prensa 45º',sets:3,reps:'10–12'},
    {name:'Leg extension',sets:3,reps:'12–15'}, {name:'Remo',sets:4,reps:'6'},
    {name:'Extensiones trasnuca',sets:3,reps:'10–12'}, {name:'Curl barra',sets:3,reps:'10–12'},
    {name:'Curl 45°',sets:3,reps:'12–15'}, {name:'Crunch invertido',sets:4,reps:'12–15'},
  ]},
  { id:'CASA', title:'Plan B · Casa', subtitle:'Circuito sencillo, adaptar a tu nivel', exercises:[
    {name:'Sentadillas con mochila',sets:3,reps:'8–15'},
    {name:'Flexiones (adaptadas si hace falta)',sets:3,reps:'6–15'},
    {name:'Remo con mochila',sets:3,reps:'8–15/lado'},
    {name:'Puente de glúteos',sets:3,reps:'12–15'},
    {name:'Plancha',sets:3,reps:'20–40 s'},
  ]}
];

export const mobility = [
  ['Cuello y respiración', '2 min · suave, sin forzar rangos'],
  ['Rotaciones torácicas', '3 min · lado a lado'],
  ['Movilidad de caderas', '4 min · 90/90 o rotaciones cómodas'],
  ['Flexores de cadera', '3 min · sin dolor'],
  ['Tobillos y sentadilla asistida', '3 min · movimientos controlados'],
];

export function initialData(): AppData {
  return {
    version:1, pantry:[], prepared:[], plan:[], groceries:[], weights:[], sleep:[], workouts:[], completions:{},
    settings:{name:'',goalWeight:74},
    recipes:[
      {id:'demo-pollo',name:'Pollo con arroz y verduras',servings:2,isExample:true,
       ingredients:[{name:'Pollo',quantity:300,unit:'g'},{name:'Arroz',quantity:140,unit:'g'},{name:'Verduras',quantity:300,unit:'g'}],
       method:'Cocina el arroz. Haz el pollo y las verduras en sartén o airfryer. Reparte en dos táperes.'},
      {id:'demo-poke',name:'Poke de atún y aguacate',servings:1,isExample:true,
       ingredients:[{name:'Atún',quantity:130,unit:'g'},{name:'Arroz',quantity:75,unit:'g'},{name:'Aguacate',quantity:1,unit:'ud'},{name:'Pepino',quantity:100,unit:'g'}],
       method:'Cuece el arroz y deja enfriar. Añade atún apto para consumo en crudo o atún cocinado, aguacate y pepino.'},
      {id:'demo-pavo',name:'Pavo con tomate y arroz',servings:2,isExample:true,
       ingredients:[{name:'Pavo',quantity:320,unit:'g'},{name:'Arroz',quantity:140,unit:'g'},{name:'Tomate triturado',quantity:200,unit:'g'},{name:'Cebolla',quantity:1,unit:'ud'}],
       method:'Pocha la cebolla, cocina el pavo con tomate y acompaña con arroz.'},
      {id:'demo-tortilla',name:'Tortilla con ensalada',servings:1,isExample:true,
       ingredients:[{name:'Huevos',quantity:3,unit:'ud'},{name:'Lechuga',quantity:100,unit:'g'},{name:'Tomate',quantity:1,unit:'ud'}],
       method:'Prepara una tortilla y acompáñala con ensalada.'},
    ],
  };
}
