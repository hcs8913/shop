import fs from 'node:fs';import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';
for(const x of JSON.parse(fs.readFileSync('frm-audit/network-index.json')).filter(x=>/home\/menus|arti\?|recommendedGoods/.test(x.url))){const d=JSON.parse(fs.readFileSync(x.file));console.log(x.url,JSON.stringify(d).slice(0,3500));}
const $=load(fs.readFileSync('frm-audit/browser.html'));console.log('LINKS',$('a[href]').toArray().map(e=>[$(e).attr('href'),$(e).text().trim().slice(0,60)]).slice(0,45));
