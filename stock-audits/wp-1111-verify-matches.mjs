import fs from 'node:fs';
import {get,mapLimit,save} from './wp-1111-core.mjs';
const matches=JSON.parse(fs.readFileSync('wp-1111/matches.json'));
const sales=[...new Map(matches.flatMap(p=>p.match.items.map(c=>[c.saleId,c]))).values()];
console.log('DETAILS',sales.length);
const details=await mapLimit(sales,4,async(c,i)=>{
 const headers={'X-Benx-ArtistId':String(c.artistId),'X-Benx-Currency':'KRW','X-Benx-Language':'ko','X-Benx-OS':'web','x-weverse-userCountry':'KR'};
 const cache=`wp-1111/sale-${c.saleId}.json`;
 const d=JSON.parse(await get(`https://shop.weverse.io/api/wvs/product/api/v1/sales/${c.saleId}?displayPlatform=WEB`,{headers}));
 save(`sale-${c.saleId}`,d);if(i%100===0)console.log('Verified',i);return{saleId:c.saleId,status:d.status,name:d.name,options:d.option?.options||[],partnerCode:d.partnerCode,verifiedAt:new Date().toISOString()};
});save('verified-sales',details);
const dm=new Map(details.filter(x=>!x.error).map(x=>[x.saleId,x]));
const full=[],partial=[],available=[],review=[];
for(const p of matches){const ds=p.match.items.map(c=>dm.get(c.saleId));
if(ds.some(x=>!x)){review.push({...p,reason:'상세 조회 실패'});continue;}
const seasonal=/season.?s greetings/i.test(p.name)&&!ds.some(d=>d.name.match(/20\d\d/)?.[0]===p.name.match(/20\d\d/)?.[0]);
if(seasonal){review.push({...p,reason:'시즌 연도 일치 확인 필요'});continue;}
if(ds.length>1){review.push({...p,reason:'같은 상품명의 판매 건이 여러 개여서 상품 이미지·판매 차수 추가 대조 필요'});continue;}
const r={...p,verified:ds};
if(ds.every(x=>x.status==='SOLD_OUT'))full.push(r);
else if(ds.some(x=>x.options.some(o=>o.isSoldOut)))partial.push(r);
else available.push(r);
}
save('full-soldout',full);save('partial-soldout',partial);save('available',available);save('review-matches',review);
console.log(JSON.stringify({full:full.length,partial:partial.length,available:available.length,review:review.length}));
