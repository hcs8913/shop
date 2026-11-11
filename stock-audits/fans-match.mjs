import fs from 'node:fs';
const norm=s=>(s||'').normalize('NFKC').toLowerCase().replace(/key\s+ring/g,'keyring').replace(/photo\s+card/g,'photocard').replace(/t[ -]?shirt/g,'tshirt').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const compact=s=>norm(s).replaceAll(' ','');
const cards=JSON.parse(fs.readFileSync('fans-audit/cards.json'));
const kp=JSON.parse(fs.readFileSync('fans-audit/kp.json'));
const out=[],missing=[];
for(const p of kp){
 if(/Album|\bCD\b/i.test(p.name)){missing.push({...p,reason:'Outside Merch scope'});continue;}
 const artist=/stray kids|skzoo/i.test(p.name)?'StrayKids':/day6|sungjin/i.test(p.name)?'DAY6':/twice|nayeon/i.test(p.name)?'TWICE':/itzy/i.test(p.name)?'ITZY':/nmixx/i.test(p.name)?'NMIXX':/nexz/i.test(p.name)?'NEXZ':/xdinary/i.test(p.name)?'XdinaryHeroes':/niziu/i.test(p.name)?'NiziU':/2pm|junho/i.test(p.name)?'2PM':/kickflip/i.test(p.name)?'KickFlip':null;
 const clean=p.name.replace(/^(?:\[[^\]]*\]\s*)+/,'');
 const parts=clean.split(/\sGoods\s*-\s*/i);let item=parts.length>1?norm(parts.slice(1).join(' - ')):norm(clean.replace(/stray kids|twice|day6|2pm|kickflip|xdinary heroes/ig,''));
 let collection=norm(parts[0].replace(/\b(?:stray kids|twice|day6|sungjin|nayeon|itzy|nmixx|nexz|xdinary heroes|niziu|2pm|skzoo)\b|\uC624\uD6C4\uC14B\uC774/ig,'').replace(/\b(goods|ongoing)\b/ig,''));
 const cs=cards.filter(c=>c.artist===artist).map(c=>{
 let ci=norm(c.title.split(/\s+-\s+/)[0].replace(/^(?:ITZY|Stray Kids|오후셋이)\s+/i,''));
 let exact=ci===item||compact(ci)===compact(item);
 if(!exact&&compact(c.title)===compact(item))exact=true;
 const ct=collection.split(' ').filter(t=>t.length>1&&!['in','of','the','and','goods'].includes(t));
 const ratio=ct.length?ct.filter(t=>norm(c.title).split(' ').includes(t)||t.length>3&&compact(c.title).includes(t)).length/ct.length:1;
 return {...c,exact,ratio,score:(exact?100:0)+ratio*30};
 }).filter(c=>c.exact&&c.ratio>=.8).sort((a,b)=>b.score-a.score);
 if(cs.length)out.push({...p,candidates:cs});else missing.push({...p,reason:'Matching requires review'});
}
fs.writeFileSync('fans-audit/matches.json',JSON.stringify(out,null,2));fs.writeFileSync('fans-audit/unmatched.json',JSON.stringify(missing,null,2));
console.log('MATCH',out.length,'SOLD',out.filter(p=>p.candidates.every(c=>c.status!=='NO SOLD-OUT LABEL')).length,'UNMATCHED',missing.length);
console.log(out.filter(p=>p.candidates.every(c=>c.status!=='NO SOLD-OUT LABEL')).map(p=>`${p.id} ${p.name}\n => ${p.candidates.map(c=>c.status+' '+c.title).join(' | ')}`).join('\n'));

