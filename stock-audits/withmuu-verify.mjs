import fs from 'node:fs';
import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';
import {fetchWith} from './withmuu-list.mjs';
import {mapLimit} from './audit-stock.mjs';
const matches=JSON.parse(fs.readFileSync('withmuu-audit/matches.json'));const unique=[...new Map(matches.map(x=>[x.withmuu.id,x.withmuu])).values()];
fs.mkdirSync('withmuu-audit/details',{recursive:true});
const results=await mapLimit(unique,3,async(p,i)=>{const html=await fetchWith(p.url);if(!html.includes(`var goodsNo = '${p.id}'`))throw Error('Unexpected product response '+p.id);const $=load(html);const buttonText=$('.btn_choice_box').text().replace(/\s+/g,' ').trim();const options=$('select[name*="option"] option').toArray().filter(o=>$(o).attr('value')).map(o=>({name:$(o).text().replace(/\s+/g,' ').trim(),value:$(o).attr('value'),soldOut:$(o).is('[disabled]')||/품절|sold\s*out/i.test($(o).text())}));
const data={id:p.id,name:p.name,url:p.url,fullSoldOut:/SOLD\s*OUT|품절/i.test(buttonText),buttonText,options,optionDisplay:html.match(/'setOptionDisplayFl'\s*:\s*'([^']+)'/)?.[1],verifiedAt:new Date().toISOString()};fs.writeFileSync(`withmuu-audit/details/${p.id}.json`,JSON.stringify(data,null,2));if(i%100===0)console.log('Verified',i,'/',unique.length);return data;});fs.writeFileSync('withmuu-audit/verified-details.json',JSON.stringify(results,null,2));console.log(JSON.stringify({count:results.length,full:results.filter(x=>x.fullSoldOut).length,partial:results.filter(x=>!x.fullSoldOut&&x.options?.some(o=>o.soldOut)).length,errors:results.filter(x=>x.error)}));
