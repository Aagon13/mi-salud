export function localDate(d: Date = new Date()): string {
  const year=d.getFullYear(); const month=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}
export function fromDate(s:string): Date { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
export function addDays(s:string,delta:number):string { const date=fromDate(s); date.setDate(date.getDate()+delta); return localDate(date); }
export function weekStart(date:string):string { const d=fromDate(date); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return localDate(d); }
export function dateLabel(date:string,opts?:Intl.DateTimeFormatOptions):string { return new Intl.DateTimeFormat('es-ES',opts ?? {weekday:'long',day:'numeric',month:'long'}).format(fromDate(date)); }
export function shortDate(date:string):string { return new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'numeric'}).format(fromDate(date)); }
export function currentWeek(offset=0):string { return addDays(weekStart(localDate()),offset*7); }
