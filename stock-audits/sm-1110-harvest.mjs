import fs from 'node:fs';import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';import {mapLimit} from './audit-stock.mjs';
function parseSmCards(html) {
  const $ = load(html);
  const cards = [];
  $('ul.prdList > li').each((_, el) => {
    const e = $(el);
    const linkEl = e.find('.name a').first();
    const href = linkEl.attr('href') || e.find('a[href*="/product/"]').first().attr('href');
    if (!href) return;
    
    const idMatch = href.match(/\/product\/[^\/]+\/(\d+)\//) || href.match(/product_no=(\d+)/);
    const id = idMatch ? idMatch[1] : null;
    if (!id) return;

    let name = linkEl.text().replace(/^상품명\s*:\s*/, '').trim().replace(/\s+/g, ' ');
    if (!name) {
      name = e.find('img').first().attr('alt') || '';
    }

    const soldOut = e.find('.soldout_icon .icon_img').length > 0;
    const image = e.find('.thumbnail img').first().attr('src') || '';
    const fullUrl = new URL(href, 'https://www.smtownandstore.com').href;

    cards.push({
      id,
      name,
      soldOut,
      image,
      url: fullUrl
    });
  });
  return cards;
}


const dir='sm-1110';const html=await(await fetch('https://www.smtownandstore.com/')).text();const $=load(html);const urls=[...new Set($('a[href*="celeb_"]').map((i,e)=>new URL($(e).attr('href'),'https://www.smtownandstore.com').href).get())];const all=[],summary=[];await mapLimit(urls,3,async base=>{const seen=new Set();let pages=0;for(let page=1;page<300;page++){const u=new URL(base);u.searchParams.set('page',page);const r=await fetch(u,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);const h=await r.text();const cards=parseSmCards(h);const fresh=cards.filter(p=>!seen.has(p.id));if(!fresh.length)break;for(const p of fresh){seen.add(p.id);all.push(p);}pages++;if(page%20===0)console.log('PAGES',u.searchParams.get('cate_no'),page,seen.size);}summary.push({url:base,pages,products:seen.size});console.log('CATEGORY',base,seen.size,pages);fs.writeFileSync(dir+'/harvest-summary.json',JSON.stringify(summary,null,2));});const unique=[...new Map(all.map(p=>[p.id,p])).values()];fs.writeFileSync(dir+'/sm-products.json',JSON.stringify(unique,null,2));console.log('DONE',unique.length);