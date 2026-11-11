import fs from 'node:fs';import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';
const h=fs.readFileSync('fans-audit/straykids.html','utf8'),$=load(h);
const attrs={};$('[data-testid]').each((i,e)=>attrs[$(e).attr('data-testid')]=(attrs[$(e).attr('data-testid')]||0)+1);console.log('TESTIDS',attrs);
const target=$('div').filter((i,e)=>$(e).children().length===0&&$(e).text().trim().includes('EVIL SKZOO ACRYLIC KEYRING')).first();console.log('TARGET',target.length);let el=target;for(let i=0;i<6&&el.length;i++){console.log(i,$(el).prop('tagName'),$(el).attr('class'),$(el).attr('style'),$(el).text().slice(0,240));el=el.parent();}console.log('ANCESTOR',target.parent().parent().parent().parent().toString().slice(0,5000));
console.log('TESTTEXT',h.match(/.{0,100}EVIL SKZOO ACRYLIC KEYRING{0,150}/)?.[0]);

