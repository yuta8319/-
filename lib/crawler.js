// lib/crawler.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TARGET_AREAS = [
  '\u5343\u4ee3\u7530\u533a','\u4e2d\u592e\u533a','\u6e2f\u533a','\u65b0\u5bbf\u533a','\u6587\u4eac\u533a','\u6e0b\u8c37\u533a',
  '\u53f0\u6771\u533a','\u58a8\u7530\u533a','\u6c5f\u6771\u533a','\u6c5f\u6238\u5ddd\u533a',
  '\u54c1\u5ddd\u533a','\u76ee\u9ed2\u533a','\u4e2d\u91ce\u533a','\u8c4a\u5cf6\u533a',
  '\u7df4\u99ac\u533a','\u4e16\u7530\u8c37\u533a','\u5317\u533a','\u8377\u5ddd\u533a','\u677f\u6a4b\u533a',
];

const SOURCES = [
  { name: 'tokyofesta-23ku',    url: 'https://tokyofesta.com/category/23ku/' },
  { name: 'tokyofesta-hanabi',  url: 'https://tokyofesta.com/category/hanabi/' },
  { name: 'tokyofesta-kids',    url: 'https://tokyofesta.com/category/kids/' },
];

async function extractChunk(text, label) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{ 
      role: 'user', 
      content: `以下のイベント一覧をJSON配列で返してください。JSONのみ、コードブロックなし、tagは文字列のみ（絵文字禁止）。\n\nフォーマット：[{"name":"","area":"〇〇区","date":"2026/MM/DD","endDate":"","place":"","category":"festival","target":"all","free":false,"indoor":false,"tag":"festival","url":""}]\n\n${text}`
    }],
  });

  const raw = response.content[0].text.trim();
  
  // バッククォート除去（文字コードで指定）
  let clean = '';
  for (const ch of raw) { if (ch !== '\u0060') clean += ch; }
  clean = clean.replace(/^json\n?/i, '').trim();
  
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1) { console.log(`  ${label}: JSON不完全`); return []; }
  
  try {
    const events = JSON.parse(clean.slice(start, end + 1));
    console.log(`  ${label}: ${events.length}件抽出`);
    return Array.isArray(events) ? events : [];
  } catch(e) {
    // エラー箇所の前まで部分抽出
    try {
      const jsonStr = clean.slice(start, end + 1);
      const errPos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
      // エラー位置より前の最後の完結したオブジェクトまで切り取る
      const safeEnd = jsonStr.lastIndexOf('}', errPos) + 1;
      const partial = jsonStr.slice(0, safeEnd) + ']';
      const events = JSON.parse(partial);
      console.log(`  ${label}: ${events.length}件（部分抽出）`);
      return Array.isArray(events) ? events : [];
    } catch(e2) {
      console.log(`  ${label}: 解析エラー`);
      return [];
    }
  }
}

async function scrapeHeadings(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const headings = [];
    for (const match of html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text.length > 5) headings.push(text);
    }
    return headings;
  } catch(e) {
    console.error(`  fetch error: ${e.message}`);
    return [];
  }
}

export async function crawlAll() {
  const results = [];

  for (const source of SOURCES) {
    console.log(`\nSearching: ${source.name}`);
    const headings = await scrapeHeadings(source.url);
    if (headings.length === 0) { console.log('  スキップ'); continue; }
    
    console.log(`  見出し: ${headings.length}件 → 2分割処理`);
    const half = Math.ceil(headings.length / 2);
    
    const events1 = await extractChunk(headings.slice(0, half).join('\n'), 'chunk1');
    await new Promise(r => setTimeout(r, 1000));
    const events2 = await extractChunk(headings.slice(half).join('\n'), 'chunk2');
    
    results.push(...events1, ...events2);
    await new Promise(r => setTimeout(r, 1000));
  }

  // フィルタ＋重複除去
  const filtered = results.filter(ev => 
    !ev.area || TARGET_AREAS.some(area => ev.area.includes(area.slice(0,2)))
  );
  const unique = filtered.filter((ev, i, self) =>
    i === self.findIndex(e => e.name === ev.name && e.date === ev.date)
  );

  console.log(`\n合計: ${results.length}件 → フィルタ後: ${filtered.length}件 → 重複除去後: ${unique.length}件`);
  return unique;
}