import { getExistingEvents, appendEvents } from '@/lib/sheets';

export const maxDuration = 60;

const SOURCES = [
  { name: 'tokyofesta-23ku',   url: 'https://tokyofesta.com/category/23ku/' },
  { name: 'tokyofesta-hanabi', url: 'https://tokyofesta.com/category/hanabi/' },
  { name: 'tokyofesta-kids',   url: 'https://tokyofesta.com/category/kids/' },
];

function parseDate(str) {
  if (!str) return '';
  const m = str.match(/(\d+)月(\d+)日/);
  if (!m) return '';
  const year = new Date().getFullYear();
  return `${year}/${String(m[1]).padStart(2,'0')}/${String(m[2]).padStart(2,'0')}`;
}

function guessCategory(title) {
  if (/花火/.test(title)) return 'fireworks';
  if (/音楽|ライブ|コンサート|ジャズ/.test(title)) return 'music';
  if (/フード|グルメ|マルシェ|ビール|ワイン|食|フェス/.test(title)) return 'food';
  if (/アート|展示|博物館|美術/.test(title)) return 'art';
  if (/スポーツ|マラソン|ラン/.test(title)) return 'sport';
  if (/自然|公園|動物|花|桜/.test(title)) return 'nature';
  if (/学び|ワークショップ|工作|科学/.test(title)) return 'learn';
  if (/夜|ナイト|イルミ/.test(title)) return 'nightlife';
  return 'festival';
}

function guessTag(title) {
  if (/花火/.test(title)) return '🎆';
  if (/音楽|ライブ|コンサート/.test(title)) return '🎵';
  if (/ジャズ/.test(title)) return '🎷';
  if (/ビール|クラフトビール/.test(title)) return '🍺';
  if (/ワイン/.test(title)) return '🍷';
  if (/フード|グルメ|食|ラーメン|寿司/.test(title)) return '🍜';
  if (/マルシェ|野菜/.test(title)) return '🥬';
  if (/アート|展示|美術/.test(title)) return '🎨';
  if (/科学|学び/.test(title)) return '🔬';
  if (/スポーツ|マラソン/.test(title)) return '⚽';
  if (/動物|ふれあい/.test(title)) return '🐟';
  if (/神社|祭り|縁日/.test(title)) return '⛩️';
  if (/桜|花見/.test(title)) return '🌸';
  if (/夜|ナイト|イルミ/.test(title)) return '🌙';
  if (/航空|乗り物/.test(title)) return '✈️';
  if (/アニメ|文化/.test(title)) return '🎌';
  if (/ピクニック/.test(title)) return '🧺';
  return '🎉';
}

function guessTarget(title) {
  if (/子ども|キッズ|こども|親子|ファミリー|赤ちゃん/.test(title)) return 'kids';
  if (/大人|シニア|60歳/.test(title)) return 'adult';
  return 'all';
}

function guessArea(tags) {
  const areaMap = {
    '千代田区': '千代田区', '中央区': '中央区', '港区': '港区',
    '新宿区': '新宿区', '文京区': '文京区', '台東区': '台東区',
    '墨田区': '墨田区', '江東区': '江東区', '品川区': '品川区',
    '目黒区': '目黒区', '大田区': '大田区', '世田谷区': '世田谷区',
    '渋谷区': '渋谷区', '中野区': '中野区', '杉並区': '杉並区',
    '豊島区': '豊島区', '北区': '北区', '荒川区': '荒川区',
    '板橋区': '板橋区', '練馬区': '練馬区', '足立区': '足立区',
    '葛飾区': '葛飾区', '江戸川区': '江戸川区',
  };
  for (const tag of tags) {
    if (areaMap[tag]) return areaMap[tag];
  }
  return '東京都';
}

async function scrapeEvents(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const events = [];

    for (const match of html.matchAll(/<a href="(https:\/\/tokyofesta\.com\/[^"]+\/(\d+)\/)"[^>]*>[\s\S]*?<span class='event-term'>([\s\S]*?)<\/span>[\s\S]*?entry-card-tag">([\s\S]*?)<\/span>([\s\S]*?)<h2[^>]*>([\s\S]*?)<\/h2>/g)) {
      const postUrl = match[1];
      const termText = match[3].trim();
      const tag1 = match[4].replace(/<[^>]+>/g, '').trim();
      const titleRaw = match[6].replace(/<[^>]+>/g, '').trim();

      const tags = [];
      for (const tm of (match[5] + match[4]).matchAll(/entry-card-tag">([\s\S]*?)<\/span>/g)) {
        tags.push(tm[1].replace(/<[^>]+>/g, '').trim());
      }
      tags.push(tag1);

      const dateMatch = termText.match(/(\d+月\d+日)[^～〜\-]*[～〜\-].*?(\d+月\d+日)/);
      const date = dateMatch ? parseDate(dateMatch[1]) : parseDate(termText.match(/(\d+月\d+日)/)?.[1]);
      const endDate = dateMatch ? parseDate(dateMatch[2]) : date;

      const placeMatch = titleRaw.match(/[（(]([^）)]+)[）)]/);
      const place = placeMatch ? placeMatch[1].replace(/\d+月.*/, '').trim() : '';

      events.push({
        name: titleRaw,
        area: guessArea(tags),
        date,
        endDate,
        place,
        category: guessCategory(titleRaw),
        target: guessTarget(titleRaw),
        tag: guessTag(titleRaw),
        free: /無料/.test(titleRaw) || /入場無料/.test(titleRaw),
        indoor: /館|ホール|センター|デパート|百貨店/.test(place),
        url: postUrl,
      });
    }
    return events;
  } catch(e) {
    console.error('scrape error:', e);
    return [];
  }
}

async function geocode(placeName) {
  if (!placeName) return { lat: null, lng: null };
  try {
    const q = encodeURIComponent(placeName + ' 東京');
    const res = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + q + '&key=' + process.env.GOOGLE_GEOCODING_KEY + '&language=ja&region=jp');
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

  const { searchParams } = new URL(request.url);
  const sourceIndex = parseInt(searchParams.get('source') || '0');
  const src = SOURCES[sourceIndex];
  if (!src) {
    return Response.json({ error: 'Invalid source index' }, { status: 400 });
  }

  console.log('crawl start:', src.name, new Date().toISOString());

  const results = await scrapeEvents(src.url);
  console.log('scraped:', results.length);

  const unique = results.filter((ev, i, self) =>
    i === self.findIndex(e => e.name === ev.name && e.date === ev.date)
  );

  const existingEvents = await getExistingEvents();
  const existingKeys = new Set(existingEvents.map(e => e.name + '_' + e.date));
  const newEvs = unique.filter(ev => !existingKeys.has(ev.name + '_' + ev.date));
  console.log('new:', newEvs.length);

  const final = [];
  for (const ev of newEvs.slice(0, 20)) {
    const c = await geocode(ev.place + ' ' + ev.area);
    final.push({
      ...ev,
      lat: c.lat,
      lng: c.lng,
      id: 'ev' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      status: 'published',
      source: 'auto',
    });
  }

  const added = await appendEvents(final);
  console.log('added:', added);
  return Response.json({ success: true, source: src.name, fetched: results.length, added, timestamp: new Date().toISOString() });
}