import fs from 'node:fs';import {get,mapLimit} from './audit-stock.mjs';
const base='https://store-api.frommyarti.com';
const headers={currency:'KRW',country:'KR',language:'en',lang:'en',timezone:'Asia/Seoul',version:'1.27.8'};
const scope=process.argv[2]==='all'?'all':'md',query=scope==='all'?'':'menuId=3&';
const count=JSON.parse(await get(`${base}/product/goods/count?${query}`));console.log('COUNT',count);
const all=[];for(let offset=0;offset<5000;offset+=100){const file=`frm-audit/${scope}-list-${offset}.json`;let d=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;if(d?.code!==200)d=JSON.parse(await get(`${base}/product/goods?${query}offset=${offset}&limit=100`,{headers}));fs.writeFileSync(file,JSON.stringify(d,null,2));const a=d.data?.goods;if(!Array.isArray(a))throw Error(JSON.stringify(d).slice(0,1000));all.push(...a);console.log(offset,a.length);if(a.length<100)break;}
fs.writeFileSync(`frm-audit/${scope}.json`,JSON.stringify(all,null,2));console.log('TOTAL',all.length,'UNIQUE',new Set(all.map(p=>`${p.isBundle?'b':'g'}${p.id}`)).size);
