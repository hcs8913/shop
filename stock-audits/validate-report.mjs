import fs from 'node:fs';
const read=n=>JSON.parse(fs.readFileSync(`audit-data/${n}.json`));
const rows=read('final-results');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#0?39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<');
const issues=[];for(const r of rows){const a=read(`admin-${r.id}`);if(!a.active||a.quantity<=0)issues.push('inactive '+r.id);if(decode(a.name)!==r.name)issues.push('title '+r.id);if(!r.options.length)issues.push('no options '+r.id);if(r.kind==='일부 옵션 품절'&&r.options.some(c=>c.quantity<=0))issues.push('zero qty '+r.id);}
const html=fs.readFileSync('재고_점검_2026-11-02/품절_검색표.html','utf8');new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log(JSON.stringify({results:rows.length,unique:new Set(rows.map(x=>x.id)).size,htmlBytes:Buffer.byteLength(html),issues,ownStock:rows.filter(x=>x.ownStockHint).length,smallQuantity:rows.filter(x=>x.quantity<100).length,partners:[...new Set(read('verified-sales').map(x=>x.partnerCode))]}));
console.log('PARTIAL',JSON.stringify(rows.filter(x=>x.kind==='일부 옵션 품절').map(x=>({id:x.id,name:x.name,options:x.affectedOptions})),null,2));
console.log('TOP',JSON.stringify(rows.filter(x=>x.kind==='전체 품절').slice(0,10).map(x=>({id:x.id,name:x.name,q:x.quantity,options:x.affectedOptions})),null,2));
