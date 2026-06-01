// app/api/crawl/route.js
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';
import { getExistingUrls, appendEvents } from '@/lib/sheets';

export const maxDuration = 60;

const SOURCES = [
  { name: 'tokyofesta-23ku',   url: 'https://tokyofesta.com/category/23ku/' },
  { name: 'tokyofesta-hanabi', url: 'https://tokyofesta.com/category/hanabi/' },
  { name: 'tokyofesta-kids',   url: 'https://tokyofesta.com/category/kids/' },
];

const TARGET_AREAS = [
  '\u5343\u4ee3\u7530\u533a','\u4e2d\u592e\u533a','\u6e2f\u533a','\u65b0\u5bbf\u533a','\u6587\u4eac\u533a','\u6e0b\u8c37\u533a',
  '\u53f0\u6771\u533a','\u58a8\u7530\u533a','\u6c5f\u6771\u533a','\u6c5f\u6238\u5ddd\u533a',
  '\u54c1\u5ddd\u533a','\u76ee\u9ed2\u533a','\u4e2d\u91ce\u533a','\u8c4a\u5cf6\u533a',
  '\u7df4\u99ac\u533a','\u4e16\u7530\u8c37\u533a','\u5317\u533a','\u8377\u5ddd\u533a','\u677f\u6a4b\u533a',
];

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
    console.error('scrapeHeadings error:', e.message);
    return [];
  }
}

async function extractChunk(client, text) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `以下のイベント一覧をJSON配列で返してください。JSONのみ、コードブロックなし、tagは文字列のみ（絵文字禁止）。会場から区を推測。日付はYYYY/MM/DD形式。\n\nフォーマット：[{"name":"","area":"〇〇区","date":"2026/MM/DD","endDate":"","place":"","category":"festival|food|music|art|sport|nature|fireworks|learn|nightlife","target":"all|kids|adult|family","free":false,"indoor":false,"tag":"festival","url":""}]\n\n${text}`
    }],
  });

  const raw = response.content[0].text.trim();
  let clean = '';
  for (const ch of raw) { if (ch !== '\u0060') clean += ch; }
  clean = clean.replace(/^json\n?/i, '').trim();

  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1) return [];

  try {
    const events = JSON.parse(clean.slice(start, end + 1));
    return Array.isArray(events) ? events : [];
  } catch(e) {
    try {
      const jsonStr = clean.slice(start, end + 1);
      const errPos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
      const safeEnd = jsonStr.lastIndexOf('}', errPos) + 1;
      const events = JSON.parse(jsonStr.slice(0, safeEnd) + ']');
      return Array.isArray(events) ? events : [];
    } catch(e2) {
      return [];
    }
  }
}

async function geocode(placeName) {
  if (!placeName || !process.env.GOOGLE_GEOCODING_KEY) return { lat: null, lng: null };
  try {
    const query = encodeURIComponent(placeName + ' 東京');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_GEOCODING_KEY}&language=ja`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].geometry.location;
    }
  } catch(e) {}
  return { lat: null, lng: null };
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🚀 自動収集開始（tokyofesta版）:', new Date().toISOString());

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results = [];

  for (const source of SOURCES) {
    console.log(`Searching: ${source.name}`);
    const headings = await scrapeHeadings(source.url);
    if (headings.length === 0) { console.log('  スキップ'); continue; }

    console.log(`  見出し: ${headings.length}件`);
    const half = Math.ceil(headings.length / 2);

    const events1 = await extractChunk(client, headings.slice(0, half).join('\n'));
    console.log(`  chunk1: ${events1.length}件`);
    await new Promise(r => setTimeout(r, 1000));

    const events2 = await extractChunk(client, headings.slice(half).join('\n'));
    console.log(`  chunk2: ${events2.length}件`);

    results.push(...events1, ...events2);
    await new Promise(r => setTimeout(r, 1000));
  }

  // フィルタ＋重複除去
  const filtered = results.filter(ev =>
    !ev.area || TARGET_AREAS.some(area => ev.area.includes(area.slice(0, 2)))
  );
  const unique = filtered.filter((ev, i, self) =>
    i === self.findIndex(e => e.name === ev.name && e.date === ev.date)
  );

  console.log(`合計: ${results.length}件 → フィルタ後: ${filtered.length}件 → 重複除去: ${unique.length}件`);

  // 既存URLと照合
  const existingUrls = await getExistingUrls();
  const newEvents = unique.filter(ev => !ev.url || !existingUrls.includes(ev.url));
  console.log(`新規: ${newEvents.length}件`);

  // 座標付与＆スプレッドシートに書き込み
  const withCoords = [];
  for (const ev of newEvents) {
    const coords = await geocode(`${ev.place} ${ev.area}`);
    withCoords.push({
      ...ev,
      lat: coords.lat,
      lng: coords.lng,
      id: `ev${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: 'published',
      source: 'auto',
    });
  }

  const added = await appendEvents(withCoords);
  console.log(`✅ 書き込み完了: ${added}件`);

  return Response.json({
    success: true,
    fetched: results.length,
    added,
    timestamp: new Date().toISOString(),
  });
}
