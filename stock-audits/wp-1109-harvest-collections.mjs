import fs from 'node:fs';
import {get,mapLimit,save} from './wp-1109-core.mjs';
const read=n=>JSON.parse(fs.readFileSync(`wp-1109/${n}.json`));
const artists=read('selected-artists');const tasks=[];
for(const a of artists){for(const c of read(`categories-${a.artistId}`).filter(c=>!/membership/i.test(c.name))){for(const child of c.childCategories||[])tasks.push({artist:a.artistId,artistName:a.name,parent:c.categoryId,parentName:c.name,child:child.categoryId,collection:child.name});}}
console.log('COLLECTIONS',tasks.length);
const collected=await mapLimit(tasks,4,async(t,i)=>{
const headers={'X-Benx-ArtistId':String(t.artist),'X-Benx-Currency':'KRW','X-Benx-Language':'ko','X-Benx-OS':'web','x-weverse-userCountry':'KR'};
const cards=[];let lastIdx;const seen=new Set();
for(let page=0;page<60;page++){
const params=new URLSearchParams({displayPlatform:'WEB',size:'100',excludeSoldOut:'false',isDomesticDelivery:'false',childCategoryId:String(t.child),...(lastIdx!==undefined?{lastIdx:String(lastIdx)}:{})});
const d=JSON.parse(await get(`https://shop.weverse.io/api/wvs/internal/display/api/v1/artist-home/categories/${t.parent}/sales?${params}`,{headers}));let fresh=0;
for(const p of d.productCards||[])if(!seen.has(p.saleId)){seen.add(p.saleId);cards.push({...p,artistId:t.artist,category:t.parentName,categoryId:t.parent,collection:t.collection,childCategoryId:t.child});fresh++;}
if(!fresh||d.lastIdx==null)break;lastIdx=d.lastIdx;
}
if(i%50===0)console.log(JSON.stringify({done:i,total:tasks.length,artist:t.artistName,collection:t.collection,count:cards.length}));
save(`collection-${t.artist}-${t.child}`,cards);return{...t,count:cards.length};
});save('collections-summary',collected);console.log('DONE',collected.length,collected.filter(x=>x.error));
