import { escapeHTML } from '../lib/helpers.js';
const paths:Record<string,string>={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 food:'<path d="M4 3v7c0 2 1.5 3 3 3s3-1 3-3V3M7 3v18M17 3c-3 2-4 5-4 8h5V3M18 11v10"/>',
 wallet:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18m-7 5h4"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 basket:'<path d="M3 10h18l-2 11H5L3 10ZM8 10l4-7 4 7M9 14v3m6-3v3"/>',
 dumbbell:'<path d="M6 7v10M3 9v6m6-10v14m6-14v14m3-12v10m3-8v6M9 12h6"/>',
 heart:'<path d="M20.8 8.7c0 5-8.8 11.2-8.8 11.2S3.2 13.7 3.2 8.7C3.2 5.5 5 4 7.5 4c2.1 0 3.4 1 4.5 2.5C13.1 5 14.4 4 16.5 4c2.5 0 4.3 1.5 4.3 4.7Z"/>',
 moon:'<path d="M20 15.7A8.5 8.5 0 0 1 8.3 4 8.5 8.5 0 1 0 20 15.7Z"/>',
 stretch:'<circle cx="13" cy="4.5" r="2"/><path d="m7 20 4-7 4 2 4 5M5 12l6-4 5 3 4 1M11 8l-1 5"/>',
 chef:'<path d="M7 13a4 4 0 0 1-2-7 4 4 0 0 1 6-3 4 4 0 0 1 6 3 4 4 0 0 1 0 7M7 13v7h10v-7M7 16h10"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
 trophy:'<path d="M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 3v4m-4 2h8"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 trash:'<path d="M4 7h16M10 11v7m4-7v7M6 7l1 14h10l1-14M9 7V4h6v3"/>',
 edit:'<path d="M4 20h5l11-11-5-5L4 15v5Zm9-14 5 5"/>',
 right:'<path d="m9 18 6-6-6-6"/>',
 left:'<path d="m15 18-6-6 6-6"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3V7Zm9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/>',
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2L2 9l2-4 3 1 2-1z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 upload:'<path d="M12 21V9m-5 5 5-5 5 5M4 7V3h16v4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 book:'<path d="M4 4h8a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3-3V4Zm11 3a3 3 0 0 1 3-3h2v14h-2a3 3 0 0 0-3 3"/>',
 fridge:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14M9 5v2m0 6v3"/>',
 sparkle:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
 save:'<path d="M4 3h14l3 3v15H3V3h1ZM7 3v7h10V3M7 21v-8h10v8"/>',
 fire:'<path d="M12 22c4 0 7-3.5 7-8 0-3-2-5-4-7 0 3-1 4-2 4 0-3-1-6-4-9 0 4-4 8-4 12 0 4.5 3 8 7 8Z"/>',
 warning:'<path d="m12 3 10 18H2L12 3Zm0 7v4m0 3h.01"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 bar:'<path d="M4 20V12m5 8V7m5 13V4m5 16v-9"/>',
};
export function icon(name:string,size=20):string {
 const body=paths[name]??paths.info;
 return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
export function pill(text:string,kind:'green'|'blue'|'amber'|'muted'='muted'):string { return `<span class="pill pill-${kind}">${escapeHTML(text)}</span>`; }
