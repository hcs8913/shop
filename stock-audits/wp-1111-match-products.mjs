import fs from 'node:fs';
import {save} from './wp-1111-core.mjs';
const read=n=>JSON.parse(fs.readFileSync(`wp-1111/${n}.json`));
const norm=s=>(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const aliases={2:['J-HOPE','JIN','JIMIN','V LAYOVER','V TYPE','House Of BTS','365 BTS'],7:['JEONGHAN','JOSHUA','DINO','Picheolin','BSS','WONWOO','SEUNGKWAN'],3:['YEONJUN','BEOMGYU','HUENINGKAI','TAEHYUN'],112:['SUNGHO','LEEHAN','TAESAN','JAEHYUN','WOONHAK'],35:['Fromis 9'],67:['BAEKHO'],73:['Hwang Min Hyun'],134:['GIRLS GENERATION'],132:['TVXQ'],75:['EJ','MAKI']};
const artists=read('selected-artists');
const map=new Map();
for(const f of fs.readdirSync('wp-1111').filter(x=>/^collection-\d/.test(x))){for(const x of JSON.parse(fs.readFileSync('wp-1111/'+f))){let p=map.get(x.saleId);if(!p){p={...x,collections:[]};map.set(x.saleId,p);}if(!p.collections.includes(x.collection))p.collections.push(x.collection);}}
for(const a of artists){for(const x of read(`weverse-${a.artistId}`)){if(!map.has(x.saleId))map.set(x.saleId,{...x,collections:[]});}}
const cards=[...map.values()];save('weverse-cards',cards);
const groups=new Map();for(const c of cards){const k=c.artistId+'|'+norm(c.name)+'|'+(c.collections.slice().sort().map(norm).join('/'));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c);}
const names=a=>[a.name,a.shortName,...aliases[a.artistId]||[]].filter(x=>norm(x).length>=3);
const matches=[],unmatched=[],ambiguous=[];
for(const p of read('kp-merch')){
 const full=norm(p.name), padded=' '+full+' ';
 const aas=artists.filter(a=>names(a).some(x=>padded.includes(' '+norm(x)+' ')));
 const suffix=p.name.match(/(?:Goods|Merch|MD)\s*-\s*(.+)$/i)?.[1];
 let possibles=[];
 for(const a of aas){for(const [,cs] of groups){if(cs[0].artistId!==a.artistId)continue;const c=cs[0], nm=norm(c.name);
 const itemExact=suffix?norm(suffix)===nm:full.endsWith(nm);
 if(!itemExact||nm.length<3)continue;
 const col=c.collections.filter(x=>norm(x).length>2&&!names(a).some(n=>norm(n)===norm(x))&&full.includes(norm(x)));
 const generic=c.collections.every(x=>/light stick|official|lightstick/i.test(x));
 const years=c.collections.join(' ').match(/20\d\d/g)||[];const kpyears=p.name.match(/20\d\d/g)||[];
 if(years.length&&kpyears.length&&!years.some(y=>kpyears.includes(y)))continue;
 const strippedTitle=norm(p.name.replace(/^(?:\[[^\]]*\]\s*)+/,''));
 const noArtist=names(a).map(alias=>strippedTitle.startsWith(norm(alias)+' ')?strippedTitle.slice(norm(alias).length).trim():null).filter(Boolean);
 const standaloneExact=!suffix&&(strippedTitle===nm||noArtist.some(s=>s===nm||s==='official '+nm));
 const score=(suffix?10:6)+(col.length?15+Math.max(...col.map(x=>norm(x).length))/1000:0)+(generic?3:0)+(standaloneExact?18:0);
 possibles.push({score,collections:c.collections,items:cs});
 }}
 possibles.sort((a,b)=>b.score-a.score);
 if(!possibles.length){unmatched.push(p);continue;}
 const best=possibles.filter(x=>x.score===possibles[0].score);
 if(best.length===1&&best[0].score>=21){matches.push({...p,match:best[0]});}
 else ambiguous.push({...p,candidates:possibles.slice(0,6)});
}
save('matches',matches);save('unmatched',unmatched);save('ambiguous',ambiguous);
console.log(JSON.stringify({cards:cards.length,matched:matches.length,ambiguous:ambiguous.length,unmatched:unmatched.length,fullSoldOut:matches.filter(p=>p.match.items.every(c=>c.status==='SOLD_OUT')).length}));
