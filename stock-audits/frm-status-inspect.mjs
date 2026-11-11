import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync('frm-audit/leaves.json'));
console.log(a.filter(p=>/SUNGHANBIN|ONEW|SF9|Nam woo|DPR|D&E|Loossemble/.test(p.artiName)).map(p=>[p.id,p.status,p.name,p.parent?.name]).filter(x=>/FLOW|나무|TREE|DAWON|다원|ALIVE|동해|RIDING|MUG|CANDLE|KINEMA|Kinema|키네마|LANYARD|PERCENT|SUN CATCHER|CAMERA/.test(x.join(' '))));
const d=JSON.parse(fs.readFileSync('frm-audit/goods-details.json'));console.log('OPTIONS',d.filter(x=>[5952,67755].includes(x.id)).map(p=>({id:p.id,name:p.name,keys:Object.keys(p),options:p.options})));
