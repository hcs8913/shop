import fs from 'node:fs';
const read=n=>JSON.parse(fs.readFileSync(`withmuu-audit/${n}.json`));
const details=new Map(read('verified-details').filter(x=>!x.error).map(x=>[x.id,x]));
const full=[],partial=[],review=read('review').map(x=>({id:x.id,name:x.name,reference:x.reference,reason:'동명 상품 또는 컬렉션 추가 대조 필요'}));
for(const p of read('matches')){const d=details.get(p.withmuu.id);if(!d){review.push({...p,reason:'상세 조회 실패'});continue;}const row={id:p.id,name:p.name,reference:p.reference,quantity:p.quantity,sourceName:d.name,sourceUrl:d.url,adminUrl:`https://www.kpoptown.com/admin258tcvgyxtyc4r6cyar/index.php/sell/catalog/products/${p.id}`,verifiedAt:d.verifiedAt,options:d.options.filter(o=>o.soldOut).map(o=>o.name).join(' / ')};if(d.fullSoldOut)full.push(row);else if(row.options)partial.push(row);}
const folder='위드뮤_점검_2026-11-03';fs.mkdirSync(folder,{recursive:true});
const fields=[['id','상품번호'],['name','관리자 상품명(원문)'],['reference','레퍼런스'],['quantity','관리자 수량'],['sourceName','위드뮤 상품명'],['options','위드뮤 품절 옵션(관리자 옵션 대조 전)'],['adminUrl','관리자 링크'],['sourceUrl','위드뮤 링크'],['verifiedAt','확인시각(UTC)']];
const q=x=>'"'+String(x??'').replaceAll('"','""')+'"';
function csv(name,data,cols=fields){fs.writeFileSync(`${folder}/${name}.csv`,'\ufeff'+[cols.map(x=>q(x[1])).join(','),...data.map(p=>cols.map(([key])=>q(p[key])).join(','))].join('\r\n'));}
csv('01_전체품절',full);csv('02_일부옵션품절_추가대조필요',partial);csv('03_동명상품_추가확인',review,[...fields.slice(0,3),['reason','확인 사유']]);csv('04_미일치',read('missing'),fields.slice(0,4));
const summary={targets:read('kp-products').length,md:read('md-products').length,matched:read('matches').length,full:full.length,partialCandidates:partial.length,review:review.length,unmatched:read('missing').length,errors:read('verified-details').filter(x=>x.error).length};fs.writeFileSync(`${folder}/점검요약.json`,JSON.stringify(summary,null,2));fs.writeFileSync(`${folder}/안내.txt`,'관리자 Collectible(80), status 활성, 레퍼런스 with/ 포함 상품과 위드뮤 MD를 대조했습니다.\n전체 품절은 위드뮤 상세 구매 버튼의 SOLD OUT 표시를 확인했습니다.\n일부 옵션 품절 목록은 위드뮤 옵션 기준이며 관리자 해당 옵션의 재고 추가 대조가 필요합니다.\n미일치 상품을 정상 판매로 판정하지 않았습니다.\n재고와 status는 수정하지 않았습니다.');
console.log(JSON.stringify(summary));console.log(JSON.stringify(full.slice(0,5).map(p=>({id:p.id,name:p.name,quantity:p.quantity})),null,2));
