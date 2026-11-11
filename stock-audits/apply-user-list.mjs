import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {kp,admin,mapLimit} from './audit-stock.mjs';
const folder=process.env.STOCK_TASK_FOLDER||'재고_변경_2026-11-02';fs.mkdirSync(folder,{recursive:true});
const sourcePath=process.env.STOCK_TASK_SOURCE||'재고_점검_2026-11-02/01_전체품절.csv';
const bytes=fs.readFileSync(sourcePath);let text,encoding;
try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);encoding='UTF-8';}catch{text=new TextDecoder('euc-kr').decode(bytes);encoding='CP949';}
function parse(s,sep){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===sep){row.push(cell);cell='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
const parsed=parse(text.replace(/^\uFEFF/,''),text.split(/\r?\n/)[0].includes('\t')?'\t':',');
const quantityColumn=parsed[0].findIndex(x=>/관리자.*수량/.test(x));
const targets=parsed.slice(1).map(r=>({id:Number(r[0]),name:r[1],inputQuantity:Number(r[quantityColumn>=0?quantityColumn:4])}));
let original=JSON.parse(fs.readFileSync('audit-data/final-results.json'));
if(process.env.STOCK_TASK_SOURCE){const details=JSON.parse(fs.readFileSync('withmuu-audit/verified-details.json'));const sold=new Set(details.filter(x=>x.fullSoldOut).map(x=>x.id));original=JSON.parse(fs.readFileSync('withmuu-audit/matches.json')).filter(x=>sold.has(x.withmuu.id)).map(x=>({...x,kind:'전체 품절'}));}
for(const p of targets){if(!Number.isSafeInteger(p.id)||p.id<=0)throw Error('Invalid product ID');const old=original.find(x=>x.id===p.id&&x.kind==='전체 품절');if(!old)throw Error(`Not in original full-soldout results: ${p.id}`);if(old.name!==p.name)throw Error(`Title mismatch ${p.id}: ${p.name}`);}
if(new Set(targets.map(x=>x.id)).size!==targets.length)throw Error('Duplicate product IDs');
const write=(file,data)=>fs.writeFileSync(`${folder}/${file}.json`,JSON.stringify(data,null,2));
write('대상목록',{source:sourcePath,encoding,count:targets.length,targets});
export async function stocks(id){const all=[];let url=`${admin}/api/stocks/${id}?page_size=100&page_index=1`;const seen=new Set();for(let i=0;i<30;i++){const d=JSON.parse(await kp(url));if(!Array.isArray(d.data?.data))throw Error('Unexpected stock response');for(const r of d.data.data){if(Number(r.product_id)!==id)throw Error('Stock product ID mismatch');if(seen.has(Number(r.combination_id)))throw Error('Duplicate combination');seen.add(Number(r.combination_id));all.push(r);}if(!d.info.next_url)break;url=new URL(d.info.next_url,'https://www.kpoptown.com').href;}if(!all.length)throw Error('Product not found');return all;}
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#0?39;|&apos;/g,"'").replace(/&quot;/g,'"');
if(process.argv[2]==='prepare'){
fs.copyFileSync(sourcePath,`${folder}/입력원본.csv`);
const before=await mapLimit(targets,3,async(p,i)=>{const data=await stocks(p.id);if(data.some(r=>decode(r.product_name)!==p.name))throw Error('Live title mismatch '+p.id);if(i%25===0)console.log('Read',i,'/',targets.length);return{...p,capturedAt:new Date().toISOString(),data};});
write('변경전_백업',before);const errors=before.filter(x=>x.error);console.log(JSON.stringify({targets:targets.length,errors,options:before.reduce((s,p)=>s+(p.data?.length||0),0),active:before.filter(p=>p.data?.some(r=>Number(r.active)===1)).length,nonZeroOptions:before.flatMap(p=>p.data||[]).filter(r=>Number(r.product_available_quantity)!==0).length}));if(errors.length)process.exitCode=1;
}
if(process.argv[2]==='apply'){
const backup=JSON.parse(fs.readFileSync(`${folder}/변경전_백업.json`));if(backup.length!==targets.length||backup.some(x=>x.error)||targets.some(p=>!backup.some(b=>b.id===p.id&&b.name===p.name)))throw Error('Incomplete or mismatched backup');
const cookie=JSON.parse(fs.readFileSync(path.join(os.tmpdir(),'kp-cookies.json'),'utf8').replace(/^\uFEFF/,'')).map(x=>`${x.Name}=${x.Value}`).join('; ');
async function postOnce(url,body,type){const res=await fetch(url,{method:'POST',headers:{Cookie:cookie,'Content-Type':type},body,signal:AbortSignal.timeout(60000)});const text=await res.text();if(!res.ok)throw Error(`Mutation HTTP ${res.status}: ${text.slice(0,150)}`);if(text.includes('id="login_form"'))throw Error('Session expired');return text;}
const logfile=`${folder}/변경로그.jsonl`;const log=data=>fs.appendFileSync(logfile,JSON.stringify({...data,time:new Date().toISOString()})+'\n');
const previousPath=`${folder}/처리결과.json`;
const results=fs.existsSync(previousPath)?JSON.parse(fs.readFileSync(previousPath)).filter(r=>r.ok&&targets.some(p=>p.id===r.id&&p.name===r.name)):[];
const completed=new Set(results.map(r=>r.id));
for(const p of targets.filter(p=>!completed.has(p.id))){try{
let current=await stocks(p.id);if(current.some(r=>decode(r.product_name)!==p.name))throw Error('Live title mismatch');
if(current.some(r=>Number(r.active)!==0)){
log({id:p.id,action:'deactivate-start'});
const stateText=await postOnce(`${admin}/sell/catalog/products/unit/deactivate/${p.id}`,new URLSearchParams({redirect_url:`/admin258tcvgyxtyc4r6cyar/index.php/api/stocks/${p.id}?page_size=100`}).toString(),'application/x-www-form-urlencoded');
let state;try{state=JSON.parse(stateText);}catch{}
if(state?.data?.data?.length&&!state.info?.next_url&&state.data.data.every(r=>Number(r.product_id)===p.id))current=state.data.data;else current=await stocks(p.id);
if(current.some(r=>Number(r.active)!==0))throw Error('Deactivation verification failed');log({id:p.id,action:'deactivate-confirmed'});
}
for(const r of current){const quantity=Number(r.product_available_quantity);if(!Number.isSafeInteger(quantity))throw Error('Invalid stock quantity');if(quantity===0)continue;
const edit=new URL(r.edit_url,'https://www.kpoptown.com');const expected=`/admin258tcvgyxtyc4r6cyar/index.php/api/stocks/product/${p.id}`+(Number(r.combination_id)?`/combination/${r.combination_id}`:'');
if(edit.origin!=='https://www.kpoptown.com'||edit.pathname!==expected)throw Error('Unexpected stock edit URL');
log({id:p.id,combinationId:r.combination_id,action:'quantity-start',from:quantity,delta:-quantity,physical:r.product_physical_quantity,reserved:r.product_reserved_quantity});
let response;try{response=JSON.parse(await postOnce(edit.href,JSON.stringify({delta:-quantity}),'application/json'));}catch(e){const check=await stocks(p.id);const now=check.find(x=>Number(x.combination_id)===Number(r.combination_id));if(Number(now?.product_available_quantity)!==0)throw e;response={confirmedAfterError:true};}
if(response.error)throw Error(JSON.stringify(response.error));log({id:p.id,combinationId:r.combination_id,action:'quantity-response',available:response.product_available_quantity,confirmedAfterError:response.confirmedAfterError||false});
}
const after=await stocks(p.id);const ok=after.every(r=>Number(r.active)===0&&Number(r.product_available_quantity)===0);if(!ok)throw Error('Final verification failed');
const result={id:p.id,name:p.name,ok:true,status:0,quantity:0,combinations:after.map(r=>({id:r.combination_id,name:r.combination_name,quantity:r.product_available_quantity,reserved:r.product_reserved_quantity,physical:r.product_physical_quantity})),verifiedAt:new Date().toISOString()};results.push(result);log({id:p.id,action:'verified',options:after.length});
console.log(JSON.stringify({done:results.length,total:targets.length,id:p.id,ok:true}));
}catch(e){const fail={id:p.id,name:p.name,ok:false,error:String(e)};results.push(fail);log(fail);console.log(JSON.stringify(fail));write('처리결과',results);throw e;}
write('처리결과',results);
}
console.log('ALL VERIFIED',results.length);
}
