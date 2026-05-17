// app/api/events/route.js
// フロントエンドにイベント一覧を返すAPI

import { getEvents } from '@/lib/sheets';

export const revalidate = 3600; // 1時間キャッシュ

export async function GET(request) {
  try {
    const events = await getEvents();

    // クエリパラメータでフィルタリング
    const { searchParams } = new URL(request.url);
    const area      = searchParams.get('area');
    const target    = searchParams.get('target');
    const category  = searchParams.get('category');
    const freeOnly  = searchParams.get('free') === 'true';
    const indoorOnly  = searchParams.get('indoor') === 'true';
    const outdoorOnly = searchParams.get('outdoor') === 'true';
    const month     = searchParams.get('month'); // "2026-05" 形式

    let filtered = events;

    if (area)      filtered = filtered.filter(e => e.area === area);
    if (target)    filtered = filtered.filter(e => e.target === target || e.target === 'all');
    if (category)  filtered = filtered.filter(e => e.category === category);
    if (freeOnly)  filtered = filtered.filter(e => e.free === true);
    if (indoorOnly)  filtered = filtered.filter(e => e.indoor === true);
    if (outdoorOnly) filtered = filtered.filter(e => e.indoor === false);
    if (month) {
      filtered = filtered.filter(e => e.date && e.date.startsWith(month.replace('-', '/')));
    }

    return Response.json({
      success: true,
      count: filtered.length,
      events: filtered,
    });

  } catch (error) {
    console.error('Events API error:', error);
    return Response.json(
      { success: false, error: 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
