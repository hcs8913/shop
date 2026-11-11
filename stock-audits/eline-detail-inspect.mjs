import fs from 'node:fs';import {extract} from './eline-harvest.mjs';
const d=extract(fs.readFileSync('eline-audit/list-test.html','utf8')).products;const p=d.find(p=>p.productId==='81784a49-5ec3-483a-8b49-008d3548ed47');console.log(Object.keys(p||{}));console.log(JSON.stringify(p,(k,v)=>/Html|Text|Spec|shipping|Policy|Notice|description/i.test(k)?undefined:v).slice(0,6500));
