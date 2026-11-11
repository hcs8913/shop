import fs from 'node:fs';
import {load} from './withmuu-audit/browser-runtime/node_modules/cheerio/dist/esm/index.js';
import {mapLimit} from './audit-stock.mjs';

const matches = JSON.parse(fs.readFileSync('smtown-audit/matches.json'));
const unique = [...new Map(matches.map(x => [x.sm.id, x.sm])).values()];
console.log(`Unique SM products to verify: ${unique.length}`);

fs.mkdirSync('smtown-audit/details', {recursive: true});

const results = await mapLimit(unique, 3, async (p, i) => {
  try {
    const res = await fetch(p.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const $ = load(html);

    const isSoldoutIcon = html.match(/var is_soldout_icon = '([^']+)';/)?.[1];
    const buyBtn = $('a#action_buy, a.action_buy, a.btn_buy').first();
    const buyBtnHidden = buyBtn.hasClass('displaynone') || buyBtn.length === 0;
    const soldOutBtn = $('a.sold_out, .soldout');
    const soldOutBtnVisible = soldOutBtn.length > 0 && !soldOutBtn.hasClass('displaynone');

    const fullSoldOut = isSoldoutIcon === 'T' || buyBtnHidden || soldOutBtnVisible || p.soldOut;
    const buttonText = buyBtn.text().trim().replace(/\s+/g, ' ');

    const options = [];
    $('select[name*="option"], select[id*="option"]').each((_, sel) => {
      $(sel).find('option').each((__, opt) => {
        const val = $(opt).attr('value');
        const text = $(opt).text().trim().replace(/\s+/g, ' ');
        if (val && !val.startsWith('*') && text) {
          const isOptSold = $(opt).is(':disabled') || text.includes('품절') || text.includes('SOLD OUT');
          options.push({ name: text, value: val, soldOut: isOptSold });
        }
      });
    });

    const data = {
      id: p.id,
      name: p.name,
      url: p.url,
      fullSoldOut,
      isSoldoutIcon,
      buttonText,
      options,
      verifiedAt: new Date().toISOString()
    };

    fs.writeFileSync(`smtown-audit/details/${p.id}.json`, JSON.stringify(data, null, 2));
    if (i % 25 === 0) console.log(`Verified ${i}/${unique.length}`);
    return data;
  } catch (e) {
    console.error(`Error verifying ${p.id}: ${e.message}`);
    return { id: p.id, error: e.message };
  }
});

fs.writeFileSync('smtown-audit/verified-details.json', JSON.stringify(results, null, 2));

const fullCount = results.filter(x => x.fullSoldOut).length;
const partialCount = results.filter(x => !x.fullSoldOut && x.options?.some(o => o.soldOut)).length;
const errorCount = results.filter(x => x.error).length;

console.log(JSON.stringify({
  totalVerified: results.length,
  fullSoldOut: fullCount,
  partialSoldOut: partialCount,
  inStock: results.length - fullCount - partialCount - errorCount,
  errors: errorCount
}, null, 2));
