import Anthropic from '@anthropic-ai/sdk';
import { getExistingEvents, appendEvents } from '@/lib/sheets';

export const maxDuration = 60;

const SOURCES = [
  { name: 'tokyofesta-23ku',   url: 'https://tokyofesta.com/category/23ku/' },
  { name: 'tokyofesta-hanabi', url: 'https://tokyofesta.com/category/hanabi/' },
  { name: 'tokyofesta-kids',   url: 'https://tokyofesta.com/category/kids/' },
];

async function scrapeHeadings(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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
  } catch(e) { return []; }
}

async function extractChunk(client, text) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: `以下のイベント一覧をJSON配列に変換してください。JSONのみ返してください。コードブロック不要。

各イベントについて以下のフィールドを含めること：
- name: イベント名
- area: 東京の区名（例：渋谷区、新宿区）
- date: YYYY/MM/DD形式の開始日
- endDate: YYYY/MM/DD形式の終了日（不明なら空文字）
- place: 会場名
- category: 以下から必ず1つ選ぶ → festival/fireworks/music/food/art/sport/nature/learn/nightlife
- target: 以下から必ず1つ選ぶ → all/kids/adult/family/senior
- free: true/false
- indoor: true/false
- tag: 以下の絵文字から内容に最も合うものを必ず1つ選ぶ
  🌸=花見・春イベント
  🎆=花火大会
  🎵=音楽・ライブ
  🍜=グルメ・フード
  🎨=アート・工作
  ⚽=スポーツ
  🌊=海・水辺
  📚=学び・読書
  🌙=夜・ナイト
  ⛩️=神社・祭り
  🌿=縁日・癒し
  🎷=ジャズ・音楽
  🍺=ビール・グルメ
  🍷=ワイン・大人
  🥬=マルシェ・野菜
  ✈️=航空・乗り物
  🎌=アニメ・文化
  🔬=科学・学習
  🎉=お祭り全般
  🐟=動物・自然
  🍻=クラフトビール
  🐰=ふれあい動物
  🧺=ピクニック
  🎺=ブラス・音楽
- url: 空文字

イベント一覧:
` + text }],
  });
  let raw = response.content[0].text.trim();
  let clean = '';
  for (const ch of raw) { if (ch !== '\u0060') clean += ch; }
  clean = clean.replace(/^json\n?/i, '').trim();
  const s = clean.indexOf('[');
  const e = clean.lastIndexOf(']');
  if (s === -1 || e === -1) return [];
  try { return JSON.parse(clean.slice(s, e + 1)); } catch(err) { return []; }
}

async function geocode(placeName) {
  if (!placeName) return { lat: null, lng: null };
  try {
    const q = encodeURIComponent(placeName + ' 東京');
    const res = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + q + '&key=' + process.env.GOOGLE_GEOCODING_KEY + '&language=ja');
    const data = await res.json();
    if (data.status === 'OK') return data.results[0].geometry.location;
  } catch(e) {}
  return { lat: null, lng: null };
}

export async function GET(request) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const auth = request.headers.get('authorization');
  if (!isVercelCron && auth !== 'Bearer ' + process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('tokyofesta crawl start:', new Date().toISOString());
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results = [];

  for (const src of SOURCES) {
    console.log('src:', src.name);
    const headings = await scrapeHeadings(src.url);
    if (headings.length === 0) continue;
    console.log('headings:', headings.length);
    const half = Math.ceil(headings.length / 2);
    const e1 = await extractChunk(client, headings.slice(0, half).join('\n'));
    console.log('c1:', e1.length);
    await new Promise(r => setTimeout(r, 1000));
    const e2 = await extractChunk(client, headings.slice(half).join('\n'));
    console.log('c2:', e2.length);
    results.push(...e1, ...e2);
    await new Promise(r => setTimeout(r, 1000));
  }

  const unique = results.filter((ev, i, self) =>
    i === self.findIndex(e => e.name === ev.name && e.date === ev.date)
  );
  console.log('unique:', unique.length);

  const existingEvents = await getExistingEvents();
  const existingKeys = new Set(existingEvents.map(e => e.name + '_' + e.date));
  const newEvs = unique.filter(ev => !existingKeys.has(ev.name + '_' + ev.date));
  console.log('new:', newEvs.length);

  const final = [];
  for (const ev of newEvs) {
    const c = await geocode(ev.place + ' ' + ev.area);
    final.push({
      ...ev,
      url: '',
      lat: c.lat,
      lng: c.lng,
      id: 'ev' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      status: 'published',
      source: 'auto',
    });
  }

  const added = await appendEvents(final);
  console.log('added:', added);
  return Response.json({ success: true, fetched: results.length, added, timestamp: new Date().toISOString() });
}