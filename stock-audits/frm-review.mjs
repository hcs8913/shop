import fs from 'node:fs';
const ds=JSON.parse(fs.readFileSync('frm-audit/goods-details.json')),map=new Map(ds.map(s=>[s.id,s]));
for(const p of JSON.parse(fs.readFileSync('frm-audit/candidates.json'))){if(!p.candidates.length)continue;console.log(p.id,p.name);for(const c of p.candidates){const s=map.get(c.id);console.log('=>',s.id,s.status,c.parent?.status,s.name,'END',s.endDate,'OPTIONS',JSON.stringify(s.options.map(o=>({id:o.id,name:o.name,status:o.status,keys:Object.keys(o)}))));}}
