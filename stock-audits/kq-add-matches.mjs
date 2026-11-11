import fs from 'node:fs';
const kp=JSON.parse(fs.readFileSync('kq-audit/kp.json')),md=JSON.parse(fs.readFileSync('kq-audit/md.json')),found=JSON.parse(fs.readFileSync('kq-audit/candidates.json'));
const manual={108401:'802',108396:'803',100277:'739',90163:'656',90158:'661',90157:'662',81564:'500',79716:'485',73939:'438'};
for(const [id,sid] of Object.entries(manual)){const p=kp.find(p=>p.id===Number(id)),s=md.find(s=>s.id===sid);if(!p||!s)throw Error(id);found.push({...p,candidates:[{...s,score:100,textManual:true}]});}
found.sort((a,b)=>b.id-a.id);fs.writeFileSync('kq-audit/candidates.json',JSON.stringify(found,null,2));fs.writeFileSync('kq-audit/unmatched.json',JSON.stringify(kp.filter(p=>!found.some(f=>f.id===p.id)),null,2));console.log(found.map(p=>[p.id,p.candidates.map(s=>s.id+' '+s.name)]));
