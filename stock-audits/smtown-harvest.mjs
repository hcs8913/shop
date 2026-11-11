import fs from 'node:fs';
import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';
import {mapLimit} from './audit-stock.mjs';

export function parseSmCards(html) {
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

async function harvest() {
  fs.mkdirSync('smtown-audit', {recursive: true});

  // 1. First get homepage and find all cate_no links
  const homeRes = await fetch('https://www.smtownandstore.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const homeHtml = await homeRes.text();
  const $home = load(homeHtml);

  const targets = new Map();
  // Celeb pages
  const celebIds = [45, 46, 47, 48, 49, 50, 51, 52, 53, 434, 665, 1132, 2003, 2613];
  for (const c of celebIds) {
    targets.set(String(c), `https://www.smtownandstore.com/product/celeb_common.html?cate_no=${c}`);
  }
  targets.set('45', 'https://www.smtownandstore.com/product/celeb_boa.html?cate_no=45');
  targets.set('46', 'https://www.smtownandstore.com/product/celeb_tvxq.html?cate_no=46');
  targets.set('47', 'https://www.smtownandstore.com/product/celeb_superjunior.html?cate_no=47');
  targets.set('48', 'https://www.smtownandstore.com/product/celeb_girlsgeneration.html?cate_no=48');
  targets.set('49', 'https://www.smtownandstore.com/product/celeb_shinee.html?cate_no=49');
  targets.set('50', 'https://www.smtownandstore.com/product/celeb_fx.html?cate_no=50');
  targets.set('51', 'https://www.smtownandstore.com/product/celeb_exo.html?cate_no=51');
  targets.set('52', 'https://www.smtownandstore.com/product/celeb_redvelvet.html?cate_no=52');
  targets.set('53', 'https://www.smtownandstore.com/product/celeb_nct.html?cate_no=53');
  targets.set('434', 'https://www.smtownandstore.com/product/celeb_wayv.html?cate_no=434');
  targets.set('665', 'https://www.smtownandstore.com/product/celeb_superm.html?cate_no=665');
  targets.set('1132', 'https://www.smtownandstore.com/product/celeb_aespa.html?cate_no=1132');
  targets.set('2003', 'https://www.smtownandstore.com/product/celeb_riize.html?cate_no=2003');
  targets.set('2613', 'https://www.smtownandstore.com/product/celeb_Hearts2Hearts.html?cate_no=2613');

  // Any other cate_no links from home
  $home('a[href*="cate_no="]').each((_, a) => {
    const href = $home(a).attr('href');
    const m = href.match(/cate_no=(\d+)/);
    if (m && !targets.has(m[1])) {
      targets.set(m[1], new URL(href, 'https://www.smtownandstore.com').href);
    }
  });

  console.log(`Total target category URLs to harvest: ${targets.size}`);

  const targetList = Array.from(targets.entries()).map(([cateId, url]) => ({cateId, url}));

  const allCards = [];
  const results = await mapLimit(targetList, 3, async (t, idx) => {
    try {
      const res = await fetch(t.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await res.text();
      const cards = parseSmCards(html);
      console.log(`[${idx + 1}/${targetList.length}] Cate ${t.cateId}: harvested ${cards.length} cards`);
      return cards;
    } catch (e) {
      console.error(`Error harvesting cate ${t.cateId}: ${e.message}`);
      return [];
    }
  });

  for (const list of results) {
    allCards.push(...list);
  }

  // Deduplicate by ID
  const uniqueMap = new Map();
  for (const c of allCards) {
    if (!uniqueMap.has(c.id)) {
      uniqueMap.set(c.id, c);
    } else {
      // If one of them has soldOut: true, or if we want latest, keep or combine
      const existing = uniqueMap.get(c.id);
      if (c.soldOut) existing.soldOut = true;
    }
  }

  const unique = Array.from(uniqueMap.values());
  console.log(`HARVEST COMPLETE! Total raw: ${allCards.length}, Unique products: ${unique.length}, Sold out: ${unique.filter(x => x.soldOut).length}`);

  fs.writeFileSync('smtown-audit/sm-products.json', JSON.stringify(unique, null, 2));
}

harvest();
