import { initialData } from '../data/seed.js';
import type { AppData } from '../types.js';
const DB='mi-salud-data', STORE='documents', KEY='app-state';
const PHOTOS='receipt-photos';
let saveQueue:Promise<unknown>=Promise.resolve();

function dbOpen():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,2);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);
      if(!req.result.objectStoreNames.contains(PHOTOS))req.result.createObjectStore(PHOTOS);
    };
    // Si otra pestaña conserva abierta la versión anterior, IndexedDB puede
    // bloquear una actualización y dejar la pantalla en "Cargando..." indefinidamente.
    let wasBlocked=false;
    req.onblocked=()=>{wasBlocked=true;reject(Error('La base de datos está bloqueada por otra ventana de Mi Salud. Cierra las otras pestañas o la app abierta en segundo plano y vuelve a intentarlo. No borres los datos.'));};
    req.onsuccess=()=>{if(wasBlocked)req.result.close();else resolve(req.result);};
    req.onerror=()=>reject(req.error??Error('No se pudo abrir el almacenamiento local.'));
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


/** La tabla de fotografías se guarda junto a app-state en la misma base IndexedDB. */
export async function saveReceiptPhoto(id:string,photo:Blob):Promise<void>{
  if(!id||photo.type!=='image/jpeg'||photo.size>1_200_000||photo.size<1)
    throw Error('La fotografía comprimida no es válida.');
  const db=await dbOpen();
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(PHOTOS,'readwrite');
      tx.objectStore(PHOTOS).put(photo,id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }finally{db.close();}
}
export async function readReceiptPhoto(id:string):Promise<Blob|undefined>{
  const db=await dbOpen();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(PHOTOS,'readonly');
      const req=tx.objectStore(PHOTOS).get(id);
      req.onsuccess=()=>resolve(req.result as Blob|undefined);
      req.onerror=()=>reject(req.error);
    });
  }finally{db.close();}
}
export async function deleteReceiptPhoto(id:string):Promise<void>{
  const db=await dbOpen();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(PHOTOS,'readwrite');
      tx.objectStore(PHOTOS).delete(id);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }finally{db.close();}
}
export interface BackupWithPhotos extends AppData { receiptPhotos?:Record<string,string> }
function blobToDataURL(blob:Blob):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(Error('No se pudo exportar una foto.'));
    reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  });
}
export async function downloadFullBackup(data:AppData):Promise<void>{
  const photos:Record<string,string>={};
  for(const receipt of data.receipts??[]){
    const blob=await readReceiptPhoto(receipt.id);
    if(blob)photos[receipt.id]=await blobToDataURL(blob);
  }
  const backup:BackupWithPhotos={...data,receiptPhotos:photos};
  const payload=new Blob([JSON.stringify(backup)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(payload);
  a.download='mi-salud-copia-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),60000);
}
export async function restoreBackupPhotos(data:BackupWithPhotos):Promise<void>{
  const photos=data.receiptPhotos??{};
  if(!photos||typeof photos!=='object'||Array.isArray(photos))throw Error('Las fotos de la copia no son válidas.');
  const entries=Object.entries(photos);
  if(entries.length>200)throw Error('La copia incluye demasiadas fotografías.');
  for(const [id,encoded] of entries){
    if(!(data.receipts??[]).some(x=>x.id===id))continue;
    if(typeof encoded!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(encoded)||encoded.length>2_000_000)
      throw Error('Foto de copia inválida: '+id);
  }
  const images:Record<string,Blob>={};
  for(const [id,encoded] of entries){
    if(!(data.receipts??[]).some(x=>x.id===id))continue;
    const blob=await (await fetch(encoded)).blob();
    if(blob.type!=='image/jpeg'||blob.size>1_200_000)throw Error('La foto restaurada excede el tamaño permitido.');
    images[id]=blob;
  }
  // Solo copiar fotografías tras validar el conjunto; los datos se aplican fuera.
  for(const [id,blob] of Object.entries(images))await saveReceiptPhoto(id,blob);
}
