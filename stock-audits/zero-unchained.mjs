import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {kp,admin,rows,mapLimit} from './audit-stock.mjs';
const folder='재고_변경_SUNWOO_UNCHAINED';fs.mkdirSync(folder,{recursive:true});
const write=(n,x)=>fs.writeFileSync(`${folder}/${n}.json`,JSON.stringify(x,null,2));
async function stocks(id){let url=`${admin}/api/stocks/${id}?page_size=100`;const result=[];for(let page=0;page<20;page++){const d=JSON.parse(await kp(url));if(!Array.isArray(d.data?.data))throw Error('Unexpected stock response');for(const r of d.data.data){if(Number(r.product_id)!==id)throw Error('Product ID mismatch');result.push(r);}if(!d.info.next_url)break;url=new URL(d.info.next_url,'https://www.kpoptown.com').href;}if(!result.length)throw Error('Missing stock');if(new Set(result.map(r=>r.combination_id)).size!==result.length)throw Error('Duplicate options');return result;}
if(process.argv[2]==='prepare'){
const found=[];for(let offset=0;offset<3000;offset+=300){const body=new URLSearchParams({filter_category:'',filter_column_name:'UNCHAINED',filter_column_reference:'',filter_column_active:'',filter_column_id_product:'',filter_column_price:'',filter_column_sav_quantity:'',products_filter_submit:''});const h=await kp(`${admin}/sell/catalog/products/${offset}/300/id_product/desc`,{method:'POST',body});const a=rows(h);found.push(...a);if(a.length<300)break;}
const targets=found.filter(x=>/THE BOYZ SUNWOO UNCHAINED Goods\s*-/i.test(x.name));if(!targets.length)throw Error('No matching products');if(new Set(targets.map(x=>x.id)).size!==targets.length)throw Error('Duplicate targets');write('검색결과',found);write('대상목록',targets);
const before=await mapLimit(targets,3,async(p)=>{const data=await stocks(p.id);if(data.some(r=>r.product_name!==p.name))throw Error('Title mismatch '+p.id);return{...p,data,capturedAt:new Date().toISOString()};});write('변경전_백업',before);if(before.some(x=>x.error))throw Error(JSON.stringify(before.filter(x=>x.error)));
console.log(JSON.stringify({count:targets.length,options:before.reduce((s,x)=>s+x.data.length,0),targets:targets.map(x=>({id:x.id,name:x.name,quantity:x.quantity,active:x.active}))},null,2));
}
if(process.argv[2]==='apply'){
const before=JSON.parse(fs.readFileSync(`${folder}/변경전_백업.json`));const targets=JSON.parse(fs.readFileSync(`${folder}/대상목록.json`));if(before.some(x=>x.error)||before.length!==targets.length)throw Error('Invalid backup');
const c=JSON.parse(fs.readFileSync(path.join(os.tmpdir(),'kp-cookies.json'),'utf8').replace(/^\uFEFF/,''));const cookie=c.map(x=>`${x.Name}=${x.Value}`).join('; ');
const log=x=>fs.appendFileSync(`${folder}/변경로그.jsonl`,JSON.stringify({...x,time:new Date().toISOString()})+'\n');
const results=[];
for(const p of targets){let current=await stocks(p.id);if(current.some(r=>r.product_name!==p.name))throw Error('Live title mismatch');const status=current.map(r=>[r.combination_id,Number(r.active)]);
for(const r of current){const quantity=Number(r.product_available_quantity);if(!Number.isSafeInteger(quantity))throw Error('Invalid quantity');if(quantity===0)continue;const url=new URL(r.edit_url,'https://www.kpoptown.com');const expected=`/admin258tcvgyxtyc4r6cyar/index.php/api/stocks/product/${p.id}`+(Number(r.combination_id)?`/combination/${r.combination_id}`:'');if(url.origin!=='https://www.kpoptown.com'||url.pathname!==expected)throw Error('Unexpected edit URL');
log({id:p.id,option:r.combination_id,from:quantity,delta:-quantity,action:'start'});
try{const response=await fetch(url,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({delta:-quantity}),signal:AbortSignal.timeout(60000)});const t=await response.text();if(!response.ok||t.includes('id="login_form"'))throw Error('Stock update failed or session expired');const d=JSON.parse(t);if(d.error)throw Error(JSON.stringify(d.error));}catch(e){const now=(await stocks(p.id)).find(x=>x.combination_id===r.combination_id);if(Number(now?.product_available_quantity)!==0)throw e;}
}
const after=await stocks(p.id);if(after.some(r=>Number(r.product_available_quantity)!==0)||after.some(r=>status.find(x=>x[0]===r.combination_id)?.[1]!==Number(r.active)))throw Error('Final stock/status verification failed');
const result={id:p.id,name:p.name,ok:true,quantity:0,active:after[0].active,options:after.map(r=>({id:r.combination_id,name:r.combination_name,quantity:r.product_available_quantity,reserved:r.product_reserved_quantity})),verifiedAt:new Date().toISOString()};results.push(result);write('처리결과',results);log({id:p.id,action:'verified'});console.log(JSON.stringify({done:results.length,total:targets.length,id:p.id,ok:true}));
}
const q=s=>'"'+String(s??'').replaceAll('"','""')+'"';fs.writeFileSync(`${folder}/처리결과.csv`,'\ufeff'+[['상품번호','관리자 상품명','판매재고','status(유지)','재고 항목 수'],...results.map(x=>[x.id,x.name,0,Number(x.active)?'초록색':'회색',x.options.length])].map(x=>x.map(q).join(',')).join('\r\n'));console.log(JSON.stringify({success:results.length,options:results.reduce((s,x)=>s+x.options.length,0),allZero:true,statusUnchanged:true}));
}
