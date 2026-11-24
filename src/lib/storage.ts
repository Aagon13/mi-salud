import { initialData } from '../data/seed.js';
import type { AppData } from '../types.js';
const DB='mi-salud-data', STORE='documents', KEY='app-state';
let saveQueue:Promise<unknown>=Promise.resolve();

function dbOpen():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbAction<T>(mode:IDBTransactionMode,task:(store:IDBObjectStore,finish:(value:T)=>void)=>void):Promise<T>{
  const db=await dbOpen();
  return new Promise<T>((resolve,reject)=>{
    let result:T; const tx=db.transaction(STORE,mode); const store=tx.objectStore(STORE);
    try{task(store,v=>{result=v;});}catch(e){db.close();reject(e);return;}
    tx.oncomplete=()=>{db.close();resolve(result);};
    tx.onerror=()=>{db.close();reject(tx.error);};
    tx.onabort=()=>{db.close();reject(tx.error);};
  });
}
export async function loadData():Promise<AppData> {
  const data=await dbAction<AppData|undefined>('readonly',(store,done)=>{
    const req=store.get(KEY); req.onsuccess=()=>done(req.result as AppData|undefined);
  });
  return data && data.version===1 ? data : initialData();
}
export async function saveData(data:AppData):Promise<void> {
  const snapshot=structuredClone(data);
  saveQueue=saveQueue.catch(()=>undefined).then(()=>dbAction<void>('readwrite',(store,done)=>{
    const req=store.put(snapshot,KEY); req.onsuccess=()=>done(undefined);
  }));
  await saveQueue;
}
export function isValidBackup(data:unknown): data is AppData {
  if(!data || typeof data!=='object') return false;
  const x=data as Partial<AppData>;
  return x.version===1 && ['pantry','recipes','prepared','plan','groceries','weights','sleep','workouts'].every(k=>Array.isArray(x[k as keyof AppData]))
    && typeof x.completions==='object' && x.completions!==null && typeof x.settings==='object' && x.settings!==null;
}
export function downloadBackup(data:AppData):void {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob); a.download=`mi-salud-copia-${new Date().toISOString().slice(0,10)}.json`;
  document.body.append(a);a.click();a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
