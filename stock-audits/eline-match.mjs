import fs from 'node:fs';
export const norm=s=>(s||'').normalize('NFKC').toLowerCase().replace(/key\s+ring/g,'keyring').replace(/photo\s+card/g,'photocard').replace(/t[ -]?shirts?/g,'tshirt').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const compact=s=>norm(s).replaceAll(' ','');
const stop=new Set(['pre','order','goods','official','the','in','of','and','a','an','to','for','ver','version','md','pop','up','store','2026','2025','2024','2023','2022','2021','2020','1st','2nd','3rd','4th','5th']);
const aliases={'miss trot 2':'미스트롯2','our unwritten seoul':'미지의서울','unintentional love story':'비의도적연애담','yumi s cells':'유미의세포들','jay s space':'제이스페이스','jang minho':'장민호','chungha':'청하','park ji hoon':'박지훈','ong seongwu':'옹성우','choi byung chan':'최병찬','moon jong up':'문종업','yoon jisung':'윤지성'};
const md=JSON.parse(fs.readFileSync('eline-audit/md.json')).map(p=>({...p,n:norm(p.name+' '+(p.artistName||'')),c:compact(p.name+' '+(p.artistName||'')),item:compact(p.name.split('_')[1]?.replace(/^\d+(?:-\d+)?[.\s]*/, '')||p.name)}));
const kp=JSON.parse(fs.readFileSync('eline-audit/kp.json')),found=[],missing=[];
for(const p of kp){const clean=p.name.replace(/^(?:\[[^\]]*\]\s*)+/,'');const [prefix,...tails]=clean.split(/\s(?:Goods|Merch|MD)\s*[-–]\s*/i);const item=norm(tails.join(' - ')),itemc=compact(item),pref=norm(prefix),tokens=[...new Set(pref.split(' ').filter(t=>t.length>1&&!stop.has(t)))];const ref=p.reference.split(/eline\//i)[1]?.split('/').map(x=>x.trim()).filter(Boolean)||[],type=compact(ref.at(-1)||''),collections=ref.slice(0,-1).filter(x=>compact(x).length>=3&&!/^(syn|pop|팝업|공식|굿즈|md|가수|콘서트)/i.test(x)).map(compact);
const candidates=[];
for(const s of md){let itemScore=0;if(type.length>=2&&s.item===type)itemScore=55;else if(type.length>=3&&(s.item.includes(type)||type.includes(s.item)&&s.item.length>=3))itemScore=38;else if(type.length>=3&&s.c.includes(type))itemScore=28;
if(itemc.length>=3&&s.c.includes(itemc))itemScore=Math.max(itemScore,42);
if(!itemScore&&itemc.length){const it=item.split(' ').filter(t=>t.length>1&&!stop.has(t));if(it.length&&it.filter(t=>s.n.split(' ').includes(t)).length/it.length>=.9)itemScore=24;}
if(!itemScore&&!tails.length&&compact(clean).length>=5&&s.c.includes(compact(clean)))itemScore=55;
if(!itemScore)continue;const hits=tokens.filter(t=>s.n.split(' ').includes(t)||t.length>=3&&s.c.includes(t)).length;let ratio=tokens.length?hits/tokens.length:0;if(compact(prefix).length>=3&&s.c.includes(compact(prefix)))ratio=1;const col=collections.some(x=>s.c.includes(x));const alias=Object.entries(aliases).some(([a,b])=>pref.includes(a)&&s.c.includes(b));if(ratio<.5&&!col&&!alias)continue;
const score=itemScore+ratio*35+(col?15:0)+(alias?12:0);candidates.push({...s,id:s.productId,url:`https://www.everlineshop.com/products/${s.productId}`,image:s.thumbnailUrl,score,ratio,col,alias,itemScore});}
candidates.sort((a,b)=>b.score-a.score);if(candidates.length)found.push({...p,candidates:candidates.filter(s=>s.score>=candidates[0].score-14).slice(0,8)});else missing.push(p);
}
fs.writeFileSync('eline-audit/candidates.json',JSON.stringify(found,null,2));fs.writeFileSync('eline-audit/unmatched.json',JSON.stringify(missing,null,2));console.log({kp:kp.length,source:md.length,candidates:found.length,missing:missing.length,soldCandidates:found.filter(p=>p.candidates.some(s=>s.isSoldOut||s.purchaseBlockedReason==='AFTER_SALES')).length});console.log('MISSING',missing.slice(0,35).map(p=>[p.name,p.reference]));
