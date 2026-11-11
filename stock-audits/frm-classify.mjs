import fs from 'node:fs';import {key} from './frm-expand.mjs';
const ds=new Map(JSON.parse(fs.readFileSync('frm-audit/goods-details.json')).map(s=>[s.id,s]));
const genericIds={86213:6231,86212:6230,86211:6229,86210:6228,86209:6227,86208:6226,86207:6225,86206:6224,86205:6223,86204:6222,86203:6221,86202:6220,86201:6219};
const result=JSON.parse(fs.readFileSync('frm-audit/candidates.json')).map(p=>{
 const candidates=p.candidates.map(c=>{const s=ds.get(c.id);if(!s)return {...c,error:'Missing detail'};let options=s.options;if(c.generic){options=options.filter(o=>o.id===genericIds[p.id]);}
 const ended=s.status==='quit'||s.endDate&&s.endDate<Date.now()||s.parentDetail&&(s.parentDetail.status==='quit'||s.parentDetail.endDate&&s.parentDetail.endDate<Date.now());
 const unavailable=Boolean(ended||s.status==='soldout'||options.length&&options.every(o=>o.status==='soldout'||o.status==='quit'));
 return {...s,optionsForProduct:options,fullSoldOut:unavailable,reason:ended?'판매 종료':s.status==='soldout'?'품절':unavailable?'전체 옵션 품절':'판매 중',partial:!unavailable&&options.some(o=>o.status==='soldout'||o.status==='quit')};});
 return {...p,candidates,classification:!candidates.length||candidates.some(c=>c.error)?'review':candidates.every(c=>c.fullSoldOut)?'full':candidates.some(c=>c.partial)?'partial':'available'};});
fs.writeFileSync('frm-audit/classified.json',JSON.stringify(result,null,2));
console.log(Object.fromEntries(['full','partial','available','review'].map(k=>[k,result.filter(p=>p.classification===k).length])));
for(const p of result.filter(p=>['full','partial'].includes(p.classification)))console.log(p.classification,p.id,p.name,p.candidates.map(c=>({id:c.id,reason:c.reason,options:c.optionsForProduct?.filter(o=>o.status!=='ready').map(o=>o.name),parent:c.parent?.name})));
