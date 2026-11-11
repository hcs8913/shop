import fs from 'node:fs';
import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';
import {get,mapLimit} from './audit-stock.mjs';
const artists=['StrayKids','DAY6','TWICE','ITZY','NMIXX','NEXZ','XdinaryHeroes','NiziU','2PM','KickFlip'];
const all=[];
await mapLimit(artists,3,async artist=>{
 const url=`https://app.fans/shop/${artist}/category/merch?sort=LISTED_AT&tag=all`;
 const file=`fans-audit/${artist}-merch.html`;
 const html=fs.existsSync(file)?fs.readFileSync(file,'utf8'):await get(url);fs.writeFileSync(file,html);
 const $=load(html),cards=[];
 $('div[style*="-webkit-line-clamp: 2"]').each((i,e)=>{
 const title=$(e).text().trim(),card=$(e).parent().parent().parent();
 if(!card.find('img').length)return;
 const text=card.text();
 cards.push({artist,title,status:text.includes('SOLD OUT')?'SOLD OUT':text.includes('END OF SALE')?'END OF SALE':'NO SOLD-OUT LABEL',image:card.find('img').first().attr('src'),url});
 });
 all.push(...cards);console.log(artist,cards.length,cards.filter(c=>c.status!=='NO SOLD-OUT LABEL').length,$('title').text());
});
fs.writeFileSync('fans-audit/cards.json',JSON.stringify(all,null,2));
