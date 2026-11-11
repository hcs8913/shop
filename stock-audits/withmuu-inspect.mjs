import fs from 'node:fs';
import {get,kp,admin,rows} from './audit-stock.mjs';
fs.mkdirSync('withmuu-audit',{recursive:true});
try{const h=await kp(`${admin}/sell/catalog/products/0/300/id_product/desc`,{method:'POST',body:new URLSearchParams({filter_category:'80',filter_column_name:'',filter_column_reference:'with/',filter_column_active:'1',products_filter_submit:''})});fs.writeFileSync('withmuu-audit/admin-list.tmp.html',h);const a=rows(h);fs.writeFileSync('withmuu-audit/kp-products.json',JSON.stringify(a,null,2));console.log('KP',a.length,JSON.stringify(a.slice(0,8)));}catch(e){console.log('ADMIN',String(e));}
const r=await fetch('https://withmuu.com/');const h=await r.text();fs.writeFileSync('withmuu-audit/home.html',h);console.log('WITHMUU',r.status,r.url,h.slice(0,600));console.log('LINKS',[...h.matchAll(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g)].filter(x=>/MD|굿즈/.test(x[2])).map(x=>[x[1],x[2].replace(/<[^>]+>/g,' ').trim()]).slice(0,30));
