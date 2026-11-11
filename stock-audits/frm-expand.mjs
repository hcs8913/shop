import fs from 'node:fs';import {get,mapLimit} from './audit-stock.mjs';
export const headers={currency:'KRW',country:'KR',language:'en',lang:'en',timezone:'Asia/Seoul',version:'1.27.8'};
export const norm=s=>(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const key=s=>norm(s).replaceAll(' ','');
export const artist=s=>{const n=key(s);if(/sunghanbin/.test(n))return 'hanbin';if(/kimjaejoong/.test(n))return 'jaejoong';if(/fromis9/.test(n))return 'fromis';if(/donghae/.test(n))return 'donghae';if(/superjuniord.?e/.test(n))return 'dne';if(/sf9|dawon/.test(n))return 'sf9';if(/namwoohyun/.test(n))return 'woohyun';if(/leetaevin/.test(n))return 'taevin';if(/dpr/.test(n))return 'dpr';if(/loossemble|loonaassemble/.test(n))return 'loossemble';if(/parksiwoo/.test(n))return 'siwoo';return n;};
export async function api(route,file,fresh=false){if(!fresh&&fs.existsSync(file)){const d=JSON.parse(fs.readFileSync(file));if(d.code===200)return d.data;}const d=JSON.parse(await get('https://store-api.frommyarti.com'+route,{headers}));fs.writeFileSync(file,JSON.stringify(d,null,2));if(d.code!==200)throw Error(JSON.stringify(d).slice(0,200));return d.data;}
if(process.argv[2]==='run'){
fs.mkdirSync('frm-audit/details',{recursive:true});
const md=[...new Map([...JSON.parse(fs.readFileSync('frm-audit/md.json')),...JSON.parse(fs.readFileSync('frm-audit/all.json'))].map(p=>[`${p.isBundle?'b':'g'}${p.id}`,p])).values()];
const wanted=new Set(['hanbin','jaejoong','fromis','donghae','onew','sf9','wendy','woohyun','dne','btob','apink','dpr','taevin','chuu','loossemble','onlyoneof','siwoo']);
const target=md.filter(p=>wanted.has(artist(p.artiName))&&!/fansign|video call|live stream|reservation|viewing code|luckydraw/i.test(p.name));
console.log('TARGET',target.length,'BUNDLES',target.filter(x=>x.isBundle).length);
const expanded=await mapLimit(target,4,async(p,i)=>{if(i%30===0)console.log('Expand',i);if(!p.isBundle)return {...p,parent:null};const d=await api(`/bundles/${p.id}/bundleGoods`,`frm-audit/details/bundle-${p.id}.json`);return{...p,children:d.bundleGoods};});
fs.writeFileSync('frm-audit/expanded.json',JSON.stringify(expanded,null,2));
const leaves=expanded.filter(p=>!p.error).flatMap(p=>p.isBundle?(p.children||[]).map(c=>({...c,parent:{id:p.id,name:p.name,status:p.status,artiName:p.artiName},url:`https://store.frommyarti.com/bundle/${p.id}`})):[{...p,url:`https://store.frommyarti.com/goods/${p.id}`}]);
fs.writeFileSync('frm-audit/leaves.json',JSON.stringify(leaves,null,2));console.log('LEAVES',leaves.length,'ERRORS',expanded.filter(p=>p.error));
}
