export type Unit = 'g' | 'kg' | 'ud' | 'ml' | 'l';
export type Category = 'fuerza' | 'nutricion' | 'movilidad' | 'descanso';
export type MealKind = 'comida' | 'cena';

export interface Ingredient { name: string; quantity: number; unit: Unit }
/** Los campos opcionales conservan la compatibilidad con los registros de la versión 0.1. */
export interface PantryItem {
  id: string; name: string; quantity: number; unit: Unit; updatedAt: string;
  habitual?: boolean; minStock?: number; restockQuantity?: number;
}
export interface Recipe {
  id: string; name: string; servings: number; ingredients: Ingredient[];
  method: string; photo?: string; isExample?: boolean
}
export interface PreparedMeal { id: string; recipeId: string; servings: number; location: 'nevera'|'congelador'; date: string }
export interface PlannedMeal { id: string; date: string; kind: MealKind; recipeId: string; servings: number }
export interface GroceryItem { id: string; name: string; quantity: number; unit: Unit }
export interface PurchaseRecord {id:string;date:string;product:string;store:string;quantity:number;unit:Unit;label?:string;totalPrice?:number;quality?:number;note?:string}
export interface WeightEntry { date: string; weight: number }
export interface SleepEntry { date: string; hours: number }
export interface WorkoutEntry { date: string; routineId: string; note: string }
export interface AppData {
  version: 1; pantry: PantryItem[]; recipes: Recipe[];
  /** Opcional para conservar los datos anteriores. */
  purchases?:PurchaseRecord[];
  prepared: PreparedMeal[]; plan: PlannedMeal[]; groceries: GroceryItem[];
  weights: WeightEntry[]; sleep: SleepEntry[]; workouts: WorkoutEntry[];
  completions: Record<string, string[]>;
  settings: { goalWeight: number; name: string };
}
export interface Mission { id: string; name: string; xp: number; category: Category; icon: string }
export interface WorkoutRoutine { id: string; title: string; subtitle: string; exercises: {name:string; sets:number; reps:string}[] }
