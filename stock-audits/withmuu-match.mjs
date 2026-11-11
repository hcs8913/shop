import fs from 'node:fs';
const read=n=>JSON.parse(fs.readFileSync(`withmuu-audit/${n}.json`));
export const norm=s=>(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const compact=s=>norm(s).replaceAll(' ','');
const stop=new Set(['pre','order','2nd','3rd','4th','goods','official','the','in','of','and','a','an','2026','2025','2024','2023','2022']);
const md=read('md-products').map(p=>{const first=p.name.split(/\s\/\s/)[0];return{...p,norm:norm(p.name),compact:compact(p.name),item:compact(first.replace(/^.*?\s[-–]\s(?:\d{1,2}[.\s]*)?/,''))};});
const matched=[],review=[],missing=[];
for(const p of read('kp-products')){
const refParts=p.reference.split(/with\//i)[1]?.split('/').map(x=>x.trim()).filter(Boolean)||[];
const type=compact(refParts.at(-1)||'');const collection=compact(refParts.slice(0,-1).join(' '));
const prefix=p.name.replace(/^(?:\[[^\]]*\]\s*)+/,'').split(/\s(?:Goods|Merch|MD)\s*-/i)[0];
const tokens=[...new Set(norm(prefix).split(' ').filter(x=>!stop.has(x)&&x.length>1))];
const candidates=[];
for(const w of md){
let itemScore=type===w.item?30:0;
if(!itemScore&&type.length>=3&&(w.item.endsWith(type)||type.endsWith(w.item))&&Math.min(type.length,w.item.length)/Math.max(type.length,w.item.length)>.65)itemScore=20;
if(!itemScore)continue;
const hits=tokens.filter(t=>w.norm.split(' ').includes(t)||t.length>=4&&w.compact.includes(t.replaceAll(' ',''))).length;
const ratio=tokens.length?hits/tokens.length:0;
const collectionMatch=collection.length>=3&&w.compact.includes(collection);
if(ratio<.66&&!collectionMatch)continue;
const years=p.name.match(/20\d\d/g)||[],wy=w.name.match(/20\d\d/g)||[];if(years.length&&wy.length&&!years.some(y=>wy.includes(y)))continue;
const score=itemScore+ratio*20+(collectionMatch?10:0);
candidates.push({...w,score,ratio,collectionMatch,itemScore});
}
candidates.sort((a,b)=>b.score-a.score);
if(!candidates.length){missing.push(p);continue;}
const top=candidates.filter(x=>x.score===candidates[0].score);
if(top.length===1&&top[0].itemScore===30&&(top[0].ratio>=.8||top[0].collectionMatch)&&tokens.length>=2)matched.push({...p,withmuu:top[0],referenceType:refParts.at(-1)});
else review.push({...p,referenceType:refParts.at(-1),candidates:candidates.slice(0,8)});
}
for(const [n,d] of [['matches',matched],['review',review],['missing',missing]])fs.writeFileSync(`withmuu-audit/${n}.json`,JSON.stringify(d,null,2));
console.log(JSON.stringify({kp:read('kp-products').length,md:md.length,matched:matched.length,soldout:matched.filter(x=>x.withmuu.soldOut).length,review:review.length,missing:missing.length}));
console.log(JSON.stringify(matched.filter(x=>x.withmuu.soldOut).slice(0,25).map(x=>({id:x.id,name:x.name,ref:x.reference,withmuu:x.withmuu.name})),null,2));
