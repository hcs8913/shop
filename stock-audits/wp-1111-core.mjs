import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp=os.tmpdir();
const cookieData=JSON.parse(fs.readFileSync(path.join(tmp,'kp-cookies.json'),'utf8').replace(/^\uFEFF/,''));
const cookie=cookieData.map(x=>`${x.Name}=${x.Value}`).join('; ');
export const admin='https://www.kpoptown.com/admin258tcvgyxtyc4r6cyar/index.php';
export async function get(url,opts={}) { for(let i=0;i<3;i++)try {const r=await fetch(url,{...opts,signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.text();}catch(e){if(i===2)throw e;} }
export async function kp(url,opts={}) {const h=await get(url,{...opts,headers:{Cookie:cookie,...opts.headers}});if(h.includes('id="login_form"'))throw Error('Admin session expired');return h;}
export function next(h){const m=h.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);return m?JSON.parse(m[1]):null;}
export function queries(d){return d?.props?.pageProps?.$dehydratedState?.queries||[];}
function decode(t){return t.replace(/&amp;/g,'&').replace(/&#039;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&nbsp;/g,' ');}
export function rows(h){return [...h.matchAll(/<tr[^>]*data-product-id="(\d+)"[^>]*>[\s\S]*?<\/tr>/g)].map(m=>({id:+m[1],name:decode(m[0].match(/#tab-step1">([^<]+)<\/a>/)?.[1]||''),quantity:+m[0].match(/data-product-quantity-value="([^"]+)"/)?.[1],active:m[0].includes("unitProductAction(this, 'deactivate')"),url:decode(m[0].match(/href="(https:\/\/www.kpoptown.com\/(?!admin)[^"]+)"/)?.[1]||'').split('?')[0]}));}
export async function mapLimit(arr,n,fn){const out=new Array(arr.length);let pos=0;await Promise.all(Array.from({length:Math.min(n,arr.length)},async()=>{while(pos<arr.length){const i=pos++;try{out[i]=await fn(arr[i],i);}catch(e){out[i]={error:String(e),input:arr[i]};}}}));return out;}
export function save(name,data){fs.mkdirSync('wp-1111',{recursive:true});fs.writeFileSync(`wp-1111/${name}.json`,JSON.stringify(data,null,2));}
if(process.argv[2]==='catalog'){
 const all=[];for(let offset=0;offset<20000;offset+=300){
 const form=new URLSearchParams({filter_category:process.argv[3]||'1211',filter_column_name:'',filter_column_reference:'',filter_column_active:'1',products_filter_submit:''});
 const h=await kp(`${admin}/sell/catalog/products/${offset}/300/id_product/desc`,{method:'POST',body:form});const found=rows(h);all.push(...found);console.log(JSON.stringify({offset,count:found.length,first:found[0]?.name,last:found.at(-1)?.name}));save(process.argv[3]?'kp-merch':'kp-hybe',all);if(found.length<300)break;
 }
}
