import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from './withmuu-audit/browser-runtime/node_modules/playwright-core/index.mjs';

const products=JSON.parse(fs.readFileSync('kq-audit/final-verified.json','utf8')).filter(p=>p.classification!=='available');
if(products.length!==19)throw Error('Expected 19 verified products');
const context=await chromium.launchPersistentContext(path.resolve('kq-audit/review-browser-profile'),{
 channel:'chrome',headless:false,viewport:null,args:['--start-maximized']
});
const cookiePath=path.join(os.tmpdir(),'kp-cookies.json');
if(fs.existsSync(cookiePath)){
 const raw=JSON.parse(fs.readFileSync(cookiePath,'utf8').replace(/^\uFEFF/,''));
 await context.addCookies((Array.isArray(raw)?raw:[raw]).map(c=>({name:c.Name,value:c.Value,domain:c.Domain,path:c.Path||'/'})));
}
const jobs=[];
for(const p of products){
 for(const url of [`https://www.kpoptown.com/admin258tcvgyxtyc4r6cyar/index.php/sell/catalog/products/${p.id}`,p.source.url]){
  if(!/^https:\/\/(www\.kpoptown\.com|kqshop\.kr)\//.test(url))throw Error('Unexpected review URL');
  const page=await context.newPage();jobs.push({page,url,id:p.id});
 }
}
const blank=context.pages().find(p=>p.url()==='about:blank'&&!jobs.some(j=>j.page===p));if(blank)await blank.close();
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<jobs.length){const j=jobs[cursor++];try{await j.page.goto(j.url,{waitUntil:'domcontentloaded',timeout:60000});console.log('OPEN',j.id,j.url);}catch(e){console.log('NAVIGATION',j.id,String(e).slice(0,120));}}}));
await jobs[0].page.bringToFront();
console.log('REVIEW_TABS_READY',context.pages().length);
context.on('close',()=>process.exit(0));
