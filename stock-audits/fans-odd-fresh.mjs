import fs from 'node:fs';
import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';
import {get,kp,admin,rows} from './audit-stock.mjs';
const dir='fans-odd-fresh-2026-11-09';fs.mkdirSync(dir,{recursive:true});
const html=await get('https://app.fans/shop/StrayKids/promotion/atrk6ur0dl');fs.writeFileSync(dir+'/source.html',html);const $=load(html);const cards=[];
$('div[style*="-webkit-line-clamp: 2"]').each((i,e)=>{const title=$(e).text().trim(),card=$(e).parent().parent().parent();if(card.find('img').length)cards.push({title,status:card.text().includes('SOLD OUT')?'SOLD OUT':'AVAILABLE',image:card.find('img').first().attr('src')});});fs.writeFileSync(dir+'/source-cards.json',JSON.stringify(cards,null,2));console.log('SOURCE',JSON.stringify(cards));
const h=await kp(`${admin}/sell/catalog/products/0/300/id_product/desc`,{method:'POST',body:new URLSearchParams({filter_category:'',filter_column_name:'STRAY KIDS ODD & FRESH Goods',filter_column_reference:'',filter_column_active:'',products_filter_submit:''})});const products=rows(h);fs.writeFileSync(dir+'/kp-products.json',JSON.stringify(products,null,2));console.log('KP',JSON.stringify(products));
