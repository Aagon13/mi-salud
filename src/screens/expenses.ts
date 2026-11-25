import { icon } from '../ui/icons.js';
import { assistantCard } from '../ui/assistantCard.js';
import { escapeHTML, pretty } from '../lib/helpers.js';
import { monthSpending } from '../lib/buyingAdvice.js';
import type { AppData } from '../types.js';

export function expenses(s:AppData):string{
  const purchases=[...(s.purchases??[])].sort((a,b)=>b.date.localeCompare(a.date));
  const today=new Date().toISOString().slice(0,7);
  const monthly=monthSpending(s,today);
  const money=(n:number)=>n.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  return `<section class="page-intro">
    <div class="eyebrow">MIS COMPRAS</div>
    <h1>Compras y gastos</h1>
    <p>Controla cuánto pagas, qué productos te gustan y dónde te conviene comprarlos. La despensa está en su propio apartado.</p>
  </section>
  <div class="expense-overview">
    <div class="expense-total">
      <small>GASTO REGISTRADO ESTE MES</small>
      <strong>${money(monthly.total)}</strong>
      <span>${monthly.entries} artículos con precio · solo compras anotadas</span>
    </div>
    <div class="expense-quick-actions">
      <button class="btn btn-primary" type="button" data-action="open-receipt">${icon('camera',20)} Foto de ticket</button>
      <button class="btn btn-secondary" type="button" data-action="new-purchase">${icon('plus',19)} Registrar compra</button>
    </div>
  </div>
  <p class="expense-help">Puedes fotografiar el ticket desde aquí o registrar una compra sin ticket. Revisa los productos antes de guardarlos.</p>
    ${assistantCard()}
    <section class="card receipt-history-card">
      <div class="section-heading"><h2>${icon('camera',19)} Tickets guardados</h2><span>${(s.receipts??[]).length} fotos</span></div>
      <p>Las fotos se guardan comprimidas en este móvil. Puedes abrirlas para revisar el ticket original y recuperar los que aún no has importado.</p>
      ${(s.receipts??[]).length===0?`<div class="empty-sm"><p>Aún no hay tickets archivados. Haz tu primera foto con el botón superior.</p></div>`:
      ${[...(s.receipts??[])].sort((a,b)=>b.capturedAt.localeCompare(a.capturedAt)).map(r=>`<div class="receipt-history-row"><div class="receipt-history-icon">${icon('camera',20)}</div><div class="stock-info"><b>${escapeHTML(r.store||'Supermercado pendiente')}</b><small>${escapeHTML(r.date)} · ${r.status==='pending'?'Pendiente de revisar':'Importado · '+r.purchaseIds.length+' artículos'}</small><small>${(r.photoBytes/1024).toFixed(0)} KB · foto guardada</small></div><button type="button" class="btn btn-compact" data-action="view-receipt" data-id="${escapeHTML(r.id)}">${r.status==='pending'?'Revisar':'Ver foto'}</button><button type="button" class="icon-btn danger" data-action="delete-receipt" data-id="${escapeHTML(r.id)}" aria-label="Eliminar foto de ticket">${icon('trash',17)}</button></div>`).join('')}
    </section>
    <section class="card purchase-history-card">
      <div class="section-heading"><h2>Historial de compras</h2><button class="btn btn-secondary btn-compact" data-action="new-purchase">${icon("plus",16)} Registrar compra</button></div>
      <div class="purchase-summary"><b>${money(monthly.total)}</b><span>Registrado en ${today} · ${monthly.entries} artículos con precio</span></div>
      <p>Indica el supermercado, cuánto pagaste y tu valoración de 1 a 5. Así iré aprendiendo qué productos prefieres.</p>
      ${purchases.length===0?`<div class="empty-sm"><p>Sin compras registradas todavía. Puedes empezar sin ticket: registra el mismo producto en dos supermercados y compáralos.</p></div>`:
      purchases.slice(0,25).map(entry=>`<div class="purchase-history-row"><div class="stock-info"><b>${escapeHTML(entry.product)}</b><small>${escapeHTML(entry.store)} · ${entry.date} · ${pretty(entry.quantity)} ${entry.unit} · ${entry.totalPrice===undefined?"Sin precio":money(entry.totalPrice)}${entry.quality===undefined?"":" · ⭐ "+entry.quality+"/5"}</small>${entry.note?`<small>${escapeHTML(entry.note)}</small>`:""}</div><button class="icon-btn" data-action="edit-purchase" data-id="${escapeHTML(entry.id)}" aria-label="Editar compra">${icon("edit",17)}</button><button class="icon-btn danger" data-action="delete-purchase" data-id="${escapeHTML(entry.id)}" aria-label="Eliminar compra">${icon("trash",17)}</button></div>`).join("")}
      ${purchases.length>25?`<p class="note">Mostrando las 25 compras más recientes de ${purchases.length}.</p>`:""}
    </section>

`;
}
