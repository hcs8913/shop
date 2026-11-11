import fs from 'node:fs';

const read = n => JSON.parse(fs.readFileSync(`smtown-audit/${n}.json`));
const details = new Map(read('verified-details').filter(x => !x.error).map(x => [x.id, x]));

const full = [];
const partial = [];
const review = read('review').map(x => ({
  id: x.id,
  name: x.name,
  reference: x.reference,
  reason: '동명 상품 또는 컬렉션 추가 대조 필요'
}));

for (const p of read('matches')) {
  const d = details.get(p.sm.id);
  if (!d) {
    review.push({ ...p, reason: '상세 조회 실패' });
    continue;
  }
  const row = {
    id: p.id,
    name: p.name,
    reference: p.reference,
    quantity: p.quantity,
    sourceName: d.name,
    sourceUrl: d.url,
    adminUrl: `https://www.kpoptown.com/admin258tcvgyxtyc4r6cyar/index.php/sell/catalog/products/${p.id}`,
    verifiedAt: d.verifiedAt,
    options: (d.options || []).filter(o => o.soldOut).map(o => o.name).join(' / ')
  };

  if (d.fullSoldOut) {
    full.push(row);
  } else if (row.options) {
    partial.push(row);
  }
}

const folder = 'SM_점검_2026-11-03';
fs.mkdirSync(folder, { recursive: true });

const fields = [
  ['id', '상품번호'],
  ['name', '관리자 상품명(원문)'],
  ['reference', '레퍼런스'],
  ['quantity', '관리자 수량'],
  ['sourceName', 'SMTOWN &STORE 상품명'],
  ['options', 'SM 품절 옵션(관리자 옵션 대조 전)'],
  ['adminUrl', '관리자 링크'],
  ['sourceUrl', 'SMTOWN &STORE 링크'],
  ['verifiedAt', '확인시각(UTC)']
];

const q = x => '"' + String(x ?? '').replaceAll('"', '""') + '"';

function csv(name, data, cols = fields) {
  fs.writeFileSync(
    `${folder}/${name}.csv`,
    '\ufeff' + [cols.map(x => q(x[1])).join(','), ...data.map(p => cols.map(([key]) => q(p[key])).join(','))].join('\r\n')
  );
}

csv('01_전체품절', full);
csv('02_일부옵션품절_추가대조필요', partial);
csv('03_동명상품_추가확인', review, [...fields.slice(0, 3), ['reason', '확인 사유']]);
csv('04_미일치', read('missing'), fields.slice(0, 4));

const summary = {
  targets: read('kp-products').length,
  smProducts: read('sm-products').length,
  matched: read('matches').length,
  full: full.length,
  partialCandidates: partial.length,
  review: review.length,
  unmatched: read('missing').length,
  errors: read('verified-details').filter(x => x.error).length
};

fs.writeFileSync(`${folder}/점검요약.json`, JSON.stringify(summary, null, 2));

const notice = [
  '관리자 상품 중 status 활성(초록색), 레퍼런스 sm/ 포함 상품(328건)과 SMTOWN &STORE 상품을 대조했습니다.',
  '전체 품절은 SMTOWN &STORE 상세 페이지의 is_soldout_icon 및 바로구매 버튼 비활성 상태를 확인했습니다.',
  '일부 옵션 품절 목록은 SMTOWN &STORE 옵션 기준이며 관리자 해당 옵션의 재고 추가 대조가 필요합니다.',
  '미일치 및 추가 확인 상품을 정상 판매로 임의 판정하지 않았습니다.',
  '사용자 요청에 따라 관리자 사이트의 재고 및 status는 일체 수정하지 않고 확인만 수행했습니다.'
].join('\n');

fs.writeFileSync(`${folder}/안내.txt`, notice);

console.log('SUMMARY:');
console.log(JSON.stringify(summary, null, 2));
console.log('Sample full sold out:');
console.log(JSON.stringify(full.slice(0, 5).map(p => ({ id: p.id, name: p.name, ref: p.reference, sm: p.sourceName })), null, 2));
