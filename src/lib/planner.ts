import type { AppData, Ingredient, PantryItem, PlannedMeal, Recipe, Unit } from '../types.js';
import { joinKey, normalizeName, toBase, unitGroup } from './helpers.js';
import { addDays } from './dates.js';

interface Remaining { quantity:number; unit:Unit; name:string }
export interface MissingIngredient {name:string; quantity:number; unit:Unit}
export interface Coverage { ready:number; total:number; missing:MissingIngredient[]; bySlot:Record<string,boolean> }
export function slotsInWeek(start:string):PlannedMeal[]{
  return Array.from({length:7},(_,i)=>addDays(start,i)).flatMap(date=>['comida','cena'].map(kind=>({id:`${date}:${kind}`,date,kind:kind as 'comida'|'cena',recipeId:'',servings:1})));
}
export function computeCoverage(s:AppData,start:string):Coverage {
  const pantry=new Map<string,Remaining>();
  for(const item of s.pantry){
    const key=joinKey(item.name,item.unit),old=pantry.get(key);
    pantry.set(key,{quantity:(old?.quantity??0)+toBase(item.quantity,item.unit),unit:unitGroup(item.unit),name:item.name});
  }
  const prepared=new Map<string,number>();
  for(const item of s.prepared){prepared.set(item.recipeId,(prepared.get(item.recipeId)??0)+item.servings);}
  const shortages=new Map<string,MissingIngredient>(),bySlot:Record<string,boolean>={};
  let ready=0;
  const slots=slotsInWeek(start);
  for(const slot of slots){
    const planned=s.plan.find(p=>p.id===slot.id);
    if(!planned?.recipeId) continue;
    const recipe=s.recipes.find(r=>r.id===planned.recipeId);
    if(!recipe) continue;
    const plannedServings=Math.max(0,planned.servings);
    const fromPrepared=Math.min(prepared.get(recipe.id)??0,plannedServings);
    prepared.set(recipe.id,(prepared.get(recipe.id)??0)-fromPrepared);
    const toMake=plannedServings-fromPrepared;
    let sufficient=true;
    for(const ingredient of recipe.ingredients){
      const key=joinKey(ingredient.name,ingredient.unit),item=pantry.get(key);
      const required=toBase(ingredient.quantity,ingredient.unit)*toMake/recipe.servings;
      const available=item?.quantity??0;
      if(required>available+.00001){
        sufficient=false;
        const missing=required-available,cur=shortages.get(key);
        shortages.set(key,{name:ingredient.name,unit:unitGroup(ingredient.unit),quantity:(cur?.quantity??0)+missing});
      }
      if(item) item.quantity=Math.max(0,item.quantity-required);
    }
    if(sufficient) ready++;
    bySlot[slot.id]=sufficient;
  }
  return {ready,total:14,missing:[...shortages.values()],bySlot};
}
export function enoughForRecipe(recipe:Recipe,pantry:PantryItem[],servings:number):{ok:boolean; missing:Ingredient[]} {
  const missing:Ingredient[]=[];
  for(const ingredient of recipe.ingredients){
    const available=pantry.filter(x=>normalizeName(x.name)===normalizeName(ingredient.name) && unitGroup(x.unit)===unitGroup(ingredient.unit))
      .reduce((sum,x)=>sum+toBase(x.quantity,x.unit),0);
    const needed=toBase(ingredient.quantity,ingredient.unit)*servings/recipe.servings;
    if(needed>available+.00001) missing.push({name:ingredient.name,unit:unitGroup(ingredient.unit),quantity:needed-available});
  }
  return {ok:missing.length===0,missing};
}
export function addToPantry(s:AppData,name:string,qty:number,unit:Unit):void {
  const existing=s.pantry.find(x=>joinKey(x.name,x.unit)===joinKey(name,unit));
  if(existing){
    const newBase=toBase(existing.quantity,existing.unit)+toBase(qty,unit);
    existing.quantity=newBase/(existing.unit==='kg'||existing.unit==='l'?1000:1);
    existing.updatedAt=new Date().toISOString();
  } else s.pantry.push({id:crypto.randomUUID(),name:name.trim(),quantity:qty,unit,updatedAt:new Date().toISOString()});
}
export function cookRecipe(s:AppData,recipe:Recipe,servings:number,location:'nevera'|'congelador',date:string):boolean {
  if(!enoughForRecipe(recipe,s.pantry,servings).ok) return false;
  for(const ing of recipe.ingredients){
    let pending=toBase(ing.quantity,ing.unit)*servings/recipe.servings;
    for(const item of s.pantry.filter(p=>joinKey(p.name,p.unit)===joinKey(ing.name,ing.unit))){
      const quantity=toBase(item.quantity,item.unit),take=Math.min(quantity,pending);
      item.quantity=(quantity-take)/(item.unit==='kg'||item.unit==='l'?1000:1);
      pending-=take;
      if(pending<=0)break;
    }
  }
  s.prepared.push({id:crypto.randomUUID(),recipeId:recipe.id,servings,location,date});
  return true;
}
