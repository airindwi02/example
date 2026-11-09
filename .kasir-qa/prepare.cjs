/* eslint-disable @typescript-eslint/no-require-imports -- Local preparation helper. */
const fs=require('fs');const postcss=require('postcss');
const src=postcss.parse(fs.readFileSync('app/owner/owner.css','utf8'));
const allowed=new Set('app sidebar brand active sidebar-bottom profile avatar workspace header page-title global-search bell bell-active clock main intro dashboard-art summary stat stat-warning columns table-wrap badge kritis cek menipis perlu-beli pemakaian penjualan shortcuts primary outline searchbox tabs pager panel empty empty-icon table-empty notice error backdrop dialog logout-icon dialog-actions notification-shade notifications notifications-title notification dot dot-red dot-amber dot-green dot-read notifications-all mobile-menu menu-shade open hidden'.split(' '));
const prefixes=['about','search-layout','search-heading','search-count','result-','recent'];
function keep(node){if(node.type==='rule'){const selectors=node.selectors.filter(sel=>{const classes=[...sel.matchAll(/\.o-([\w-]+)/g)].map(m=>m[1]);return classes.length&&classes.every(c=>allowed.has(c)||prefixes.some(p=>c.startsWith(p)))});if(!selectors.length){node.remove();return}node.selectors=selectors}else if(node.type==='atrule'&&node.nodes){[...node.nodes].forEach(keep);if(!node.nodes.length)node.remove()}}
[...src.nodes].forEach(keep);fs.writeFileSync('app/kasir/kasir.css',src.toString().replaceAll('o-','k-'));
fs.writeFileSync('app/kasir/KasirUI.tsx',fs.readFileSync('app/owner/OwnerUI.tsx','utf8').replaceAll('o-','k-'));
fs.writeFileSync('app/kasir/tentang-alana/page.tsx',fs.readFileSync('app/owner/tentang-alana/page.tsx','utf8').replaceAll('o-','k-').replaceAll('/owner/','/kasir/'));
