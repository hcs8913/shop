import fs from 'node:fs';import path from 'node:path';
const dir='FANS_점검_2026-11-03';fs.mkdirSync(dir,{recursive:true});
const read=n=>JSON.parse(fs.readFileSync(`fans-audit/${n}.json`));
const confirmed=read('verified'),matches=read('matches'),unmatched=read('unmatched'),all=read('kp');
const csv=(name,headers,rows)=>fs.writeFileSync(`${dir}/${name}.csv`,'\uFEFF'+[headers,...rows].map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n'));
const optionRows=[];const rows=[];let sold=0,end=0;
for(const p of confirmed){
 if(p.error||p.stocks?.error)throw Error(`Unverified ${p.id}`);
 const stocks=p.stocks?.data?.data;
 if(!stocks?.length||p.stocks.info.total_page!==1)throw Error(`Missing stock page ${p.id}`);
 for(const s of stocks){if(Number(s.product_id)!==p.id||Number(s.active)!==1||!s.product_reference.toLowerCase().includes('jyp/'))throw Error(`Admin condition ${p.id}`);optionRows.push([p.id,s.product_name,s.product_reference,s.combination_id,s.combination_name,s.combination_reference,s.product_available_quantity,s.product_reserved_quantity,s.product_physical_quantity,p.candidates[0].status,p.candidates[0].url]);}
 const c=p.candidates[0];if(c.status==='SOLD OUT')sold++;else if(c.status==='END OF SALE')end++;else throw Error('Not sold out');
 rows.push([p.id,stocks[0].product_name,p.reference,'초록색',stocks.reduce((n,s)=>n+Number(s.product_available_quantity),0),stocks.length,c.artist,c.title,c.status,'아티스트·상품명·컬렉션·이미지 일치',c.url,p.url]);
}
csv('01_전체품절',['상품ID','관리자 상품명','레퍼런스','KPOPTOWN status','판매가능 재고 합계','재고 옵션 행수','아티스트','FANS 상품명','FANS 표시','대조 결과','FANS 확인 URL','KPOPTOWN URL'],rows);
csv('02_품절상품_옵션별재고',['상품ID','관리자 상품명','레퍼런스','조합ID','옵션명','옵션 레퍼런스','판매가능 수량','예약 수량','실물 수량','FANS 표시','FANS 확인 URL'],optionRows);
const review=unmatched.filter(p=>!p.reason.includes('Outside'));
csv('03_동일상품_추가확인필요',['상품ID','관리자 상품명','레퍼런스','관리자 목록 수량','사유','KPOPTOWN URL'],review.map(p=>[p.id,p.name,p.reference,p.quantity,'수집된 FANS 화면에서 동일 상품을 확정하지 못함. 품절 판정하지 않음.',p.url]));
const noLabel=matches.filter(p=>!confirmed.some(c=>c.id===p.id));
csv('04_전체품절표시_미확인',['상품ID','관리자 상품명','레퍼런스','FANS 후보 상품명','FANS 표시','FANS 확인 URL','주의'],noLabel.map(p=>[p.id,p.name,p.reference,p.candidates.map(c=>c.title).join(' | '),p.candidates.map(c=>c.status).join(' | '),p.candidates[0].url,'목록상 전체품절 표시 미확인. 옵션별 정상 판매를 보장하지 않음.']));
csv('05_점검범위외_음반',['상품ID','관리자 상품명','레퍼런스'],unmatched.filter(p=>p.reason.includes('Outside')).map(p=>[p.id,p.name,p.reference]));
for(let i=0;i<4;i++)fs.copyFileSync(`fans-audit/proof-${i}.png`,`${dir}/이미지대조_${i+1}.png`);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>FANS 품절 점검</title><style>body{font:15px sans-serif;max-width:1250px;margin:30px auto}article{border-top:1px solid #ccc;padding:22px 0;break-inside:avoid}img{width:230px;height:230px;object-fit:contain;border:1px solid #ddd;margin:8px}b{color:#b42318}small{display:block;color:#666}</style><h1>FANS 품절 점검 — 2026-11-03</h1><p>초록색 status · jyp/ 레퍼런스 상품 중 이미지 대조를 마친 ${confirmed.length}개. SOLD OUT ${sold}개, END OF SALE ${end}개. 두 표시는 모두 품절로 취급.</p><p>재고/status 변경 없음. 옵션별 재고는 02 CSV 참고. 아래 표시는 수집한 공식 FANS 화면 기준이며 재입고·판매 재개에 따라 바뀔 수 있음.</p>${confirmed.map((p,i)=>`<article><h3>${i+1}. [${p.id}] ${esc(p.name)}</h3><b>${esc(p.candidates[0].status)}</b><p>${esc(p.candidates[0].title)}</p><small>${esc(p.reference)}</small><div><img src="data:image/jpeg;base64,${fs.readFileSync(p.kpImages[0]).toString('base64')}" alt="KPOPTOWN"><img src="data:image/jpeg;base64,${fs.readFileSync(p.sourceImage).toString('base64')}" alt="FANS"></div><a href="${esc(p.url)}">KPOPTOWN 상품</a> / <a href="${esc(p.candidates[0].url)}">FANS 확인 페이지</a></article>`).join('')}</html>`;
fs.writeFileSync(`${dir}/06_이미지대조_보고서.html`,html);
const summary={date:'2026-11-03',activeJyp:all.length,merchScope:all.length-unmatched.filter(p=>p.reason.includes('Outside')).length,confirmed:confirmed.length,soldOut:sold,endOfSale:end,optionRows:optionRows.length,noFullSoldOutLabel:noLabel.length,unresolved:review.length,albumExcluded:unmatched.filter(p=>p.reason.includes('Outside')).length};
fs.writeFileSync(`${dir}/00_안내.txt`,`FANS SHOP / KPOPTOWN 품절 점검\r\n2026-11-03\r\n\r\n${JSON.stringify(summary,null,2)}\r\n\r\n01: 관리자 초록 status·jyp/ 상품 중 아티스트, 상품명, 컬렉션, 이미지를 대조한 전체품절 목록. SOLD OUT과 END OF SALE 모두 포함. 관리자 제목은 그대로 보존.\r\n02: 01 상품의 관리자 옵션별 재고. 옵션별 판매가능 수량, 예약수량, 실물수량을 구분.\r\n03: 동일 상품 추가 확인 필요. 검색 부재를 품절로 판정하지 않음.\r\n04: 목록에서 전체품절 표시가 확인되지 않은 상품. 이미지 전체 수동 검증 또는 옵션별 판매 가능 확인을 완료한 목록이 아님. 일부 옵션 품절은 이 파일만으로 판단할 수 없음.\r\n05: Merch 점검 범위에서 제외한 음반.\r\n06: 품절 확정 상품 이미지 대조 보고서.\r\n\r\n공개 FANS 화면은 일부 과거 상품과 옵션 선택 UI를 전부 제공하지 않아 03 상품과 판매중 상품의 일부 옵션 품절은 확정하지 못함. FANS 확인 URL은 상품 카드가 실린 공식 페이지이며 카테고리 화면에 다른 탭 상품도 포함될 수 있음.\r\n관리자 재고와 status를 변경하지 않았음.\r\n`);
fs.writeFileSync('fans-audit/report-summary.json',JSON.stringify(summary,null,2));console.log(summary);
