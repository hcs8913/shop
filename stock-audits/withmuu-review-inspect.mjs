import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync('withmuu-audit/matches.json'));console.log('LOW RATIO',JSON.stringify(a.filter(x=>x.withmuu.soldOut&&x.withmuu.ratio<.8).map(x=>({id:x.id,name:x.name,ref:x.reference,source:x.withmuu.name,ratio:x.withmuu.ratio})),null,2));
console.log('TAIL',JSON.stringify(a.filter(x=>x.withmuu.soldOut).slice(-20).map(x=>({id:x.id,name:x.name,ref:x.reference,source:x.withmuu.name})),null,2));
