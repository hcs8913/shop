import fs from 'node:fs';
import {chromium} from './withmuu-audit/browser-runtime/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({locale:'ko-KR'});const page=await context.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message.slice(0,150)));
await page.goto('https://withmuu.com/',{waitUntil:'domcontentloaded',timeout:60000});
for(let i=0;i<6;i++){await page.waitForTimeout(5000);const html=await page.content();const text=await page.locator('body').innerText();console.log(JSON.stringify({step:i,url:page.url(),length:html.length,text:text.slice(0,500)}));fs.writeFileSync('withmuu-audit/browser-home.html',html);if(html.includes('goods_list.php')||html.includes('goods_view.php'))break;}
console.log('MDLINKS',await page.locator('a').evaluateAll(a=>a.filter(x=>/MD|굿즈/.test(x.textContent)).map(x=>({text:x.textContent.trim(),href:x.href})).slice(0,30)));
await context.storageState({path:'withmuu-audit/anonymous-browser-state.json'});await browser.close();
