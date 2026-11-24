import { missions } from '../data/seed.js';
import type { AppData, Category, Mission } from '../types.js';

export function isMissionDone(s:AppData,date:string,id:string):boolean { return (s.completions[date]??[]).includes(id); }
export function toggleMission(s:AppData,date:string,id:string):void {
  const prev=s.completions[date]??[];
  s.completions[date]=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
}
export function totalXP(s:AppData,category?:Category):number {
  const byId=new Map<string,Mission>(missions.map(m=>[m.id,m]));
  return Object.values(s.completions).flat().reduce((sum,id)=>{
    const m=byId.get(id); return sum+(m&&(!category || m.category===category)?m.xp:0);
  },0);
}
export function levelInfo(xp:number):{level:number;earned:number;needed:number;percent:number} {
  let level=1,remain=xp;
  while(remain>=200+(level-1)*100 && level<999){remain-=200+(level-1)*100;level++;}
  const needed=200+(level-1)*100;
  return {level,earned:remain,needed,percent:Math.min(100,(remain/needed)*100)};
}
export function todayXP(s:AppData,date:string):number {
  return (s.completions[date]??[]).reduce((sum,id)=>sum+(missions.find(m=>m.id===id)?.xp??0),0);
}
