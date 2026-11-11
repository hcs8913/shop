import fs from 'node:fs';
const r=n=>JSON.parse(fs.readFileSync(`audit-data/${n}.json`));
const summary=r('harvest-summary');
console.log('SUMMARY',summary.length,summary.reduce((s,x)=>s+(x.cards||0),0),summary.filter(x=>x.error));
for(const x of summary.filter(x=>x.categories===0))console.log(x.artist,JSON.stringify(r(`categories-${x.id}`).map(c=>({id:c.categoryId,name:c.name}))));
for(const id of [2,3,7,165,124]){const a=r(`weverse-${id}`);console.log('unique',id,a.length,new Set(a.map(x=>x.saleId)).size);}
