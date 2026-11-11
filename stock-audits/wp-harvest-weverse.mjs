import fs from 'node:fs';
import {get,mapLimit,save} from './wp-core.mjs';
const read=n=>JSON.parse(fs.readFileSync(`wp-audit/${n}.json`));
const products=read('kp-merch');
const artists=read('artists');
export const norm=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const aliases={2:['J-HOPE','JIN','JIMIN','V LAYOVER','V TYPE'],7:['JEONGHAN','JOSHUA','DINO','Picheolin','BSS','WONWOO','SEUNGKWAN'],3:['YEONJUN','BEOMGYU','HUENINGKAI','TAEHYUN'],112:['SUNGHO','LEEHAN','TAESAN','JAEHYUN','WOONHAK']};
export function names(a){return [...new Set([a.name,a.shortName,...aliases[a.artistId]||[]])].filter(x=>norm(x).length>=3);}
const selected=artists.filter(a=>names(a).some(alias=>products.some(p=>(' '+norm(p.name)+' ').includes(' '+norm(alias)+' '))));
save('selected-artists',selected);
console.log('ARTISTS',selected.map(x=>`${x.artistId}:${x.name}`).join(', '));
export async function api(artist,route,params={}){const headers={'X-Benx-ArtistId':String(artist),'X-Benx-Currency':'KRW','X-Benx-Language':'ko','X-Benx-OS':'web','x-weverse-userCountry':'KR'};return JSON.parse(await get('https://shop.weverse.io/api/wvs/internal/display/api/v1/'+route+'?'+new URLSearchParams(params),{headers}));}
if(process.argv[2]==='run'){
const results=await mapLimit(selected,3,async artist=>{
const cats=await api(artist.artistId,'artist-home/categories',{displayPlatform:'WEB',includeChild:'true'});
save(`categories-${artist.artistId}`,cats);
const scope=cats.filter(c=>!/membership/i.test(c.name));
const cards=[];let pageCount=0;
for(const c of scope){let lastIdx;let seen=new Set();for(let page=0;page<200;page++){
const params={displayPlatform:'WEB',size:'100',excludeSoldOut:'false',isDomesticDelivery:'false',...(lastIdx!==undefined?{lastIdx:String(lastIdx)}:{})};
const d=await api(artist.artistId,`artist-home/categories/${c.categoryId}/sales`,params);pageCount++;
const found=d.productCards||[];for(const p of found)cards.push({...p,artistId:artist.artistId,category:c.name,categoryId:c.categoryId});
if(!found.length||d.lastIdx===undefined||d.lastIdx===null||seen.has(d.lastIdx))break;
seen.add(d.lastIdx);lastIdx=d.lastIdx;
}
}
save(`weverse-${artist.artistId}`,cards);console.log(JSON.stringify({artist:artist.name,categories:scope.map(x=>x.name),cards:cards.length,pages:pageCount}));return{artist:artist.name,id:artist.artistId,categories:scope.length,cards:cards.length};
});save('harvest-summary',results);
}
