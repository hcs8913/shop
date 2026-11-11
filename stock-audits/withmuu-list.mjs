import fs from 'node:fs';
import {get} from './audit-stock.mjs';
const state=JSON.parse(fs.readFileSync('withmuu-audit/anonymous-browser-state.json'));
export const cookie=state.cookies.filter(c=>/withmuu\.com$/.test(c.domain)).map(c=>`${c.name}=${c.value}`).join('; ');
export async function fetchWith(url){const h=await get(url,{headers:{Cookie:cookie,'User-Agent':'Mozilla/5.0'}});if(h.includes('NetFunnel_Action')&&!h.includes('goods_view.php'))throw Error('Withmuu queue session expired');return h;}
if(process.argv[2]==='inspect'){const h=await fetchWith('https://withmuu.com/goods/goods_list.php?cateCd=003');fs.writeFileSync('withmuu-audit/md-page.html',h);console.log(h.length);console.log([...h.matchAll(/.{0,90}(?:goodsCnt|totalGoodsCnt|goods_count|goodsNo=|soldout|soldOut|page=|pageNum=|pageSize).{0,180}/g)].slice(0,25).map(x=>x[0]).join('\n'));}
