import { crawlAll } from './crawler.js';
import { appendEvents, getExistingUrls } from './sheets.js';
import { geocode } from './geocode.js';
import { readFileSync } from 'fs';

process.env.GOOGLE_SERVICE_ACCOUNT_JSON = readFileSync('./service-account.json', 'utf8');

async function test() {
  console.log('🚀 収集＆書き込みテスト...\n');

  const events = await crawlAll();
  if (events.length === 0) { console.log('❌ 収集できませんでした'); return; }

  console.log(`\n📦 ${events.length}件収集`);
  console.log(JSON.stringify(events.slice(0, 3), null, 2));

  // 座標付与＆書き込み（最初の5件だけ）
  const withCoords = [];
  for (const ev of events.slice(0, 5)) {
    const coords = await geocode(`${ev.place} ${ev.area}`);
    withCoords.push({
      ...ev,
      lat: coords.lat,
      lng: coords.lng,
      id: `ev${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      status: 'published',
      source: 'auto',
      tag: ev.category === 'food' ? '\uD83C\uDF7C' : '\uD83C\uDF89',
    });
    await new Promise(r => setTimeout(r, 200));
  }

  const added = await appendEvents(withCoords);
  console.log(`\n✅ ${added}件をスプレッドシートに追加！`);
}

test().catch(console.error);