import fs from 'node:fs';
import {kp,admin,mapLimit,save} from './audit-stock.mjs';
const read=n=>JSON.parse(fs.readFileSync(`audit-data/${n}.json`));
const candidates=[...read('full-soldout'),...read('partial-soldout')];
function val(h,id){const tag=[...h.matchAll(/<input\b[^>]*>/g)].find(x=>x[0].includes(`id="${id}"`))?.[0]||'';return tag.match(/value="([^"]*)"/)?.[1]||'';}
const results=await mapLimit(candidates,3,async(p,i)=>{
if(fs.existsSync(`audit-data/admin-${p.id}.json`))return read(`admin-${p.id}`);
const h=await kp(`${admin}/sell/catalog/products/${p.id}`);
const activeTag=h.match(/<input\b[^>]*id="form_step1_active"[^>]*>/)?.[0]||'';
const active=/\bchecked(?:=|\s|>)/.test(activeTag);
const ids=h.match(/data-ids-product-attribute="([^"]*)"/)?.[1]?.split(',').filter(Boolean)||[];
const combos=[];
for(let offset=0;offset<ids.length;offset+=50){const ch=await kp(`${admin}/sell/catalog/products/combinations/form/${ids.slice(offset,offset+50).join('-')}`);
for(const part of ch.split(/(?=<tr class="combination loaded")/).filter(x=>x.startsWith('<tr'))){const id=part.match(/data-index="(\d+)"/)?.[1];if(!id)continue;const name=part.match(/<td>([\s\S]*?)<\/td>/)?.[1]?.replace(/<[^>]+>/g,'').trim()||'';combos.push({id:+id,name,quantity:+val(part,`combination_${id}_attribute_quantity`)});}
}
const data={id:p.id,name:val(h,'form_step1_name_1'),active,quantity:+val(h,'form_step3_qty_0'),reference:val(h,'form_step6_reference')||val(h,'form_step1_reference'),combinations:combos,ownStockHint:/실재고/.test(h),verifiedAt:new Date().toISOString()};
save(`admin-${p.id}`,data);if(i%25===0)console.log(JSON.stringify({done:i,total:candidates.length,name:data.name,combinations:combos.length}));return data;
});save('admin-verified',results);console.log('DONE',results.length,'errors',results.filter(x=>x.error).length);
