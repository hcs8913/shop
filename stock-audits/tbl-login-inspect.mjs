import {chromium} from './withmuu-audit/browser-runtime/node_modules/playwright-core/index.mjs';
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();await p.goto('https://www.kpoptown.com/admin258tcvgyxtyc4r6cyar/index.php');console.log(await p.locator('input').evaluateAll(es=>es.map(e=>({name:e.name,type:e.type,id:e.id}))));await b.close();
