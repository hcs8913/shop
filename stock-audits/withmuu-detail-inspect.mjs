import fs from 'node:fs';
import {fetchWith} from './withmuu-list.mjs';
const matches=JSON.parse(fs.readFileSync('withmuu-audit/matches.json'));
for(const p of [matches.find(x=>x.withmuu.soldOut),matches.find(x=>!x.withmuu.soldOut&&x.quantity>100)]){const h=await fetchWith(p.withmuu.url);fs.writeFileSync(`withmuu-audit/detail-${p.withmuu.id}.html`,h);console.log('PRODUCT',p.id,p.withmuu.id,p.withmuu.name);for(const term of ['soldOut','soldout','goodsView','optionSno','optionValue','optionStock','stockCnt','gd_goods_view','optionDisplayFl']){let i=h.indexOf(term);if(i>=0)console.log(term,h.slice(Math.max(0,i-150),i+850));}}
