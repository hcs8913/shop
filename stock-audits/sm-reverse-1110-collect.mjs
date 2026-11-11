import fs from 'node:fs';
import {kp, admin, rows} from './audit-stock.mjs';

fs.mkdirSync('sm-reverse-1110', {recursive: true});

const all = [];
for (let offset = 0; offset < 10000; offset += 300) {
  const h = await kp(`${admin}/sell/catalog/products/${offset}/300/id_product/desc`, {
    method: 'POST',
    body: new URLSearchParams({
      filter_category: '',
      filter_column_name: '',
      filter_column_reference: 'sm/',
      filter_column_active: '',
      products_filter_submit: ''
    })
  });
  const found = rows(h);
  for (const p of found) {
    const row = [...h.matchAll(/<tr[^>]*data-product-id="(\d+)"[^>]*>[\s\S]*?<\/tr>/g)].find(x => +x[1] === p.id)?.[0];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    p.reference = cells[4];p.thumbnail = new URL(row.match(/<img[^>]*src="([^"]+)"/)?.[1]||'', 'https://www.kpoptown.com').href;
    if (!p.reference.toLowerCase().includes('sm/')) {
      throw Error('Filter mismatch ' + p.id);
    }
  }
  all.push(...found);
  console.log(JSON.stringify({offset, count: found.length}));
  fs.writeFileSync('sm-reverse-1110/kp-products.json', JSON.stringify(all, null, 2));
  if (found.length < 300) break;
}
console.log('TOTAL kp-products collected:', all.length);
