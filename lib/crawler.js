// lib/crawler.js
// 各ソースサイトからHTMLを取得してイベントを抽出する

import { extractEvents } from './claude.js';

// ─── 収集ソース一覧 ───────────────────────────────────────
// 優先度A: 公式サイト
const SOURCES_A = [
  { name: '東京都観光', url: 'https://www.gotokyo.org/jp/events/index.html' },
  { name: '東京観光財団', url: 'https://www.tcvb.or.jp/jp/event/' },
  // 23区公式サイト（代表的な区）
  { name: '台東区イベント', url: 'https://www.city.taito.lg.jp/event/index.html' },
  { name: '新宿区イベント', url: 'https://www.city.shinjuku.lg.jp/event/index.html' },
  { name: '港区イベント',   url: 'https://www.city.minato.tokyo.jp/koho/kuse/koho/event/index.html' },
  { name: '渋谷区イベント', url: 'https://www.city.shibuya.tokyo.jp/event/index.html' },
  { name: '豊島区イベント', url: 'https://www.city.toshima.lg.jp/event/index.html' },
  { name: '世田谷区イベント', url: 'https://www.city.setagaya.lg.jp/event/index.html' },
];

// 優先度B: 民間サイト
const SOURCES_B = [
  { name: 'じゃらん東京イベント', url: 'https://www.jalan.net/event/010000/' },
  { name: 'eventbank東京', url: 'https://eventbank.jp/area/13/' },
  { name: 'こそだて応援団', url: 'https://www.kosodate.metro.tokyo.lg.jp/event/' },
  { name: 'ライブポケット東京', url: 'https://livepocket.jp/e?area=13' },
  { name: 'connpass東京', url: 'https://connpass.com/explore/ja.html?prefecture=tokyo' },
];

// ─── メイン処理 ───────────────────────────────────────────
export async function crawlAll() {
  const allSources = [...SOURCES_A, ...SOURCES_B];
  const results = [];

  for (const source of allSources) {
    console.log(`🔍 収集中: ${source.name}`);

    const html = await fetchPage(source.url);
    if (!html) continue;

    const events = await extractEvents(html, source.name);
    results.push(...events);

    // APIレート制限対策で少し待つ
    await sleep(1000);
  }

  return results;
}

// ─── HTMLフェッチ ─────────────────────────────────────────
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        // ブラウザに偽装してブロックを回避
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      },
      // タイムアウト10秒
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`⚠️ ${url}: HTTP ${res.status}`);
      return null;
    }

    return await res.text();
  } catch (e) {
    console.error(`❌ フェッチ失敗: ${url}`, e.message);
    return null;
  }
}

// ─── ユーティリティ ───────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
