/** Foto de ticket comprimida para conservar legibilidad sin saturar IndexedDB. */
export async function compressReceiptPhoto(file:File):Promise<Blob>{
  if(!file.type.startsWith('image/'))throw Error('Elige una fotografía del ticket.');
  if(file.size>20_000_000)throw Error('La foto supera los 20 MB. Usa una imagen más pequeña.');
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(file);}
  catch{throw Error('Este formato de imagen no se puede abrir. Prueba una foto JPG desde la cámara.');}
  try {
    const maxSide=Math.max(bitmap.width,bitmap.height);
    if(maxSide<1)throw Error('La imagen está vacía.');
    const attempts:[number,number][]=[[2600,.84],[2400,.77],[2100,.70],[1800,.64]];
    for(const [limit,quality] of attempts){
      const factor=Math.min(1,limit/maxSide);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*factor));
      canvas.height=Math.max(1,Math.round(bitmap.height*factor));
      const context=canvas.getContext('2d');
      if(!context)throw Error('No se pudo preparar la fotografía.');
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob>((resolve,reject)=>{
        canvas.toBlob(result=>result?resolve(result):reject(Error('No se pudo comprimir la imagen.')),'image/jpeg',quality);
      });
      if(blob.size<=1_200_000)return blob;
    }
    throw Error('La fotografía es demasiado grande para archivarla.');
  }finally{bitmap.close();}
}
