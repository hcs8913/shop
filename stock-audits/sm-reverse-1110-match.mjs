import fs from 'node:fs';

const read = n => JSON.parse(fs.readFileSync(`sm-reverse-1110/${n}.json`));

export const norm = s => (s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const compact = s => norm(s).replaceAll(' ', '');

const synonyms = [
  [/light\s*stick/gi, 'fanlight'],
  [/응원봉/gi, 'fanlight'],
  [/keyring/gi, 'key ring'],
  [/키링/gi, 'key ring'],
  [/포토팩/gi, 'photo pack'],
  [/엽서/gi, 'postcard'],
  [/티셔츠/gi, 't shirt'],
  [/후디/gi, 'hoodie']
];

function applySynonyms(s) {
  let res = s || '';
  for (const [re, rep] of synonyms) {
    res = res.replace(re, rep);
  }
  return res;
}

const stop = new Set([
  'pre', 'order', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  'goods', 'official', 'the', 'in', 'of', 'and', 'a', 'an', 'at', 'to', 'for', 'ver', 'version',
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018',
  'smart', 'album', 'mini', 'set', 'dvd', 'cd', 'photobook', 'md'
]);

const members = [
  'taeyeon', 'sunny', 'tiffany', 'hyoyeon', 'yuri', 'sooyoung', 'yoona', 'seohyun',
  'leeteuk', 'heechul', 'yesung', 'shindong', 'eunhyuk', 'donghae', 'siwon', 'ryeowook', 'kyuhyun',
  'onew', 'jonghyun', 'key', 'minho', 'taemin',
  'xiumin', 'suho', 'lay', 'baekhyun', 'chen', 'chanyeol', 'do', 'kai', 'sehun',
  'irene', 'seulgi', 'wendy', 'joy', 'yeri',
  'taeyong', 'taeil', 'johnny', 'yuta', 'kun', 'doyoung', 'ten', 'jaehyun', 'winwin', 'jungwoo', 'lucas', 'mark', 'xiaojun', 'hendery', 'renjun', 'jeno', 'haechan', 'jaemin', 'yangyang', 'chenle', 'jisung', 'shion', 'riku', 'yushi', 'jaehee', 'ryo', 'sakuya',
  'karina', 'giselle', 'winter', 'ningning',
  'shotaro', 'eunseok', 'sungchan', 'wonbin', 'sohee', 'anton',
  'boa', 'victoria', 'amber', 'luna', 'krystal'
];

function extractKpParts(p) {
  const afterSm = p.reference.split(/sm\//i)[1] || '';
  const refParts = afterSm.split('/').map(x => x.trim()).filter(Boolean);
  const synRef = applySynonyms(afterSm);

  const synName = applySynonyms(p.name);
  const cleanName = synName.replace(/^(?:\[[^\]]*\]\s*)+/, '').trim();
  const splitDash = cleanName.split(/\s(?:Goods|Merch|MD|Album)\s*[-–]\s*/i);
  let prefix = splitDash[0];
  let item = splitDash.length > 1 ? splitDash.slice(1).join(' - ') : cleanName.split(/\s*[-–]\s*/).slice(1).join(' - ');
  if (!item) item = cleanName;

  const itemCompact = compact(item);
  const tokens = [...new Set(norm(prefix + ' ' + item + ' ' + synRef).split(' ').filter(x => !stop.has(x) && x.length > 1))];
  const itemTokens = [...new Set(norm(item).split(' ').filter(x => !stop.has(x) && x.length > 1))];

  // Find member if any
  const matchedMembers = members.filter(m => norm(p.name + ' ' + afterSm).split(' ').includes(m));

  return {
    cleanName,
    prefix,
    item,
    itemCompact,
    tokens,
    itemTokens,
    matchedMembers,
    refParts
  };
}

function extractSmParts(s) {
  const synName = applySynonyms(s.name);
  const cleanName = synName.replace(/^(?:\[[^\]]*\]\s*)+/, '').trim();
  const tokens = [...new Set(norm(synName).split(' ').filter(x => !stop.has(x) && x.length > 1))];
  const itemCompact = compact(cleanName);
  const matchedMembers = members.filter(m => norm(synName).split(' ').includes(m));

  return {
    cleanName,
    compact: compact(synName),
    norm: norm(synName),
    itemCompact,
    tokens,
    matchedMembers
  };
}

const smProducts = read('sm-products').filter(p=>!p.soldOut).map(s => ({
  ...s,
  ...extractSmParts(s)
}));

const matched = [];
const review = [];
const missing = [];

const kpProducts = read('kp-products').filter(p=>!p.active||p.quantity<=0);

for (const p of kpProducts) {
  const kpInfo = extractKpParts(p);
  const candidates = [];

  for (const s of smProducts) {
    // Member mismatch check: if kp specifies member, SM product must match or have no member
    if (kpInfo.matchedMembers.length > 0 && s.matchedMembers.length > 0) {
      if (!kpInfo.matchedMembers.some(m => s.matchedMembers.includes(m))) {
        continue;
      }
    }

    // 1. Item matching
    let itemScore = 0;
    if (kpInfo.itemCompact.length >= 3) {
      if (s.itemCompact === kpInfo.itemCompact || s.compact.endsWith(kpInfo.itemCompact)) {
        itemScore = 40; // Exact match
      } else if (s.itemCompact.includes(kpInfo.itemCompact)) {
        itemScore = 30; // Substring
      } else if (kpInfo.itemCompact.includes(s.itemCompact)) {
        itemScore = 25;
      } else if (kpInfo.itemTokens.length > 0) {
        const itemHits = kpInfo.itemTokens.filter(t => s.tokens.includes(t) || s.compact.includes(t)).length;
        if (itemHits === kpInfo.itemTokens.length) itemScore = 25;
        else if (itemHits >= 2 && itemHits / kpInfo.itemTokens.length >= 0.6) itemScore = 15;
      }
    }

    // 2. Token overlap
    const hits = kpInfo.tokens.filter(t => s.tokens.includes(t) || (t.length >= 4 && s.compact.includes(t))).length;
    const ratio = kpInfo.tokens.length ? hits / kpInfo.tokens.length : 0;

    // 3. Korean ref parts
    let refBonus = 0;
    if (kpInfo.refParts.length) {
      for (const part of kpInfo.refParts) {
        if (part.length >= 2 && s.norm.includes(part.toLowerCase())) {
          refBonus += 15;
        }
      }
    }

    // 4. Member match bonus
    let memberBonus = 0;
    if (kpInfo.matchedMembers.length > 0 && s.matchedMembers.length > 0) {
      if (kpInfo.matchedMembers.some(m => s.matchedMembers.includes(m))) {
        memberBonus = 20;
      }
    }

    // Years check
    const kpYears = p.name.match(/20\d\d/g) || [];
    const smYears = s.name.match(/20\d\d/g) || [];
    if (kpYears.length && smYears.length && !kpYears.some(y => smYears.includes(y))) {
      continue;
    }

    if (itemScore === 0 && ratio < 0.6 && refBonus === 0) continue;

    const score = itemScore + ratio * 30 + refBonus + memberBonus;
    candidates.push({
      ...s,
      score,
      ratio,
      itemScore,
      refBonus,
      memberBonus
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    missing.push(p);
    continue;
  }

  const top = candidates.filter(x => Math.abs(x.score - candidates[0].score) < 0.01);
  if (top.length === 1 && top[0].score >= 35 && (top[0].ratio >= 0.5 || top[0].itemScore >= 30)) {
    matched.push({
      ...p,
      sm: top[0]
    });
  } else if (candidates[0].score >= 25) {
    review.push({
      ...p,
      candidates: candidates.slice(0, 5)
    });
  } else {
    missing.push(p);
  }
}

console.log(JSON.stringify({
  totalKp: kpProducts.length,
  smProducts: smProducts.length,
  matched: matched.length,
  review: review.length,
  missing: missing.length,
  soldOutMatched: matched.filter(x => x.sm.soldOut).length
}, null, 2));

fs.writeFileSync('sm-reverse-1110/matches.json', JSON.stringify(matched, null, 2));
fs.writeFileSync('sm-reverse-1110/review.json', JSON.stringify(review, null, 2));
fs.writeFileSync('sm-reverse-1110/missing.json', JSON.stringify(missing, null, 2));
