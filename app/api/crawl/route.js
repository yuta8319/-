// app/api/crawl/route.js
// Vercel Cronから週2回呼ばれる自動収集エンドポイント

import { crawlAll } from '@/lib/crawler';
import { geocode }  from '@/lib/geocode';
import { getExistingUrls, appendEvents } from '@/lib/sheets';

export const maxDuration = 300; // 最大5分（Vercel Pro必要・Hobbyは60秒）

export async function GET(request) {

  // ── セキュリティチェック ──────────────────────────────
  // Vercel Cronか、正しいCRON_SECRETを持つリクエストのみ許可
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🚀 自動収集開始:', new Date().toISOString());

  try {
    // ① 全ソースからイベントを収集
    const allEvents = await crawlAll();
    console.log(`📦 収集合計: ${allEvents.length}件`);

    // ② 既存URLと照合して重複を除去
    const existingUrls = await getExistingUrls();
    const newEvents = allEvents.filter(ev =>
      ev.url && !existingUrls.includes(ev.url)
    );
    console.log(`🆕 新規イベント: ${newEvents.length}件`);

    // ③ 座標を付与（会場名→緯度経度）
    const eventsWithCoords = [];
    for (const ev of newEvents) {
      const coords = await geocode(`${ev.place} ${ev.area}`);
      eventsWithCoords.push({
        ...ev,
        lat: coords.lat,
        lng: coords.lng,
        id: `ev${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        status: 'published', // 完全自動公開
        source: 'auto',
      });
    }

    // ④ スプレッドシートに書き込み
    const added = await appendEvents(eventsWithCoords);
    console.log(`✅ 書き込み完了: ${added}件`);

    return Response.json({
      success: true,
      fetched: allEvents.length,
      added,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Crawl error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
