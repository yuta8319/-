// lib/claude.js
// HTMLからイベント情報をClaude APIで抽出する

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `あなたは東京のイベント情報を収集・整理するアシスタントです。
与えられたHTMLテキストから、東京23区内で開催されるイベントを抽出してください。
必ずJSON配列のみを返してください。他のテキストや説明は一切不要です。`;

const USER_PROMPT_TEMPLATE = `以下のHTMLから東京23区内のイベント情報を抽出し、
JSON配列形式のみで返してください（前後の説明テキスト不要）。

抽出条件：
- 開催地が東京23区内であること
- 開催日が今日から3ヶ月以内であること
- イベント名・日付・場所が明記されていること

各イベントの形式：
[
  {
    "name": "イベント名（正式名称）",
    "area": "〇〇区（千代田区/中央区/港区/新宿区/文京区/台東区/墨田区/江東区/品川区/目黒区/大田区/世田谷区/渋谷区/中野区/杉並区/豊島区/北区/荒川区/板橋区/練馬区/足立区/葛飾区/江戸川区 のいずれか）",
    "date": "YYYY/MM/DD",
    "endDate": "YYYY/MM/DD（複数日なら。1日のみなら空文字）",
    "startTime": "HH:MM（不明なら空文字）",
    "endTime": "HH:MM（不明なら空文字）",
    "place": "会場名（正式名称）",
    "url": "イベントの詳細URL",
    "category": "festival|fireworks|music|food|art|sport|nature|learn|nightlife のいずれか",
    "target": "all|kids|adult|family|senior のいずれか",
    "free": true または false,
    "indoor": true または false,
    "tag": "内容を表す絵文字1文字"
  }
]

カテゴリ判定のヒント：
- festival: 祭り・縁日・神輿・盆踊り
- fireworks: 花火
- music: コンサート・ライブ・演奏会
- food: マルシェ・グルメ・フードフェス・ビール・ワイン
- art: アート・展示・博物館・工作
- sport: スポーツ・体験・アウトドア
- nature: 公園・自然・動物・花見
- learn: 学び・ワークショップ・読み聞かせ
- nightlife: 終了21時以降またはナイトイベント

対象者判定のヒント：
- kids: 子ども・こども・お子様・幼児・小学生
- adult: お酒・ビール・ワイン・18歳以上
- family: ファミリー・親子・家族
- senior: シニア・高齢者・60歳以上
- all: 上記以外または明示なし

HTMLテキスト：
{{HTML}}`;

export async function extractEvents(html, sourceName) {
  // HTMLが長すぎる場合は先頭20,000文字に切り詰め
  const truncated = html.slice(0, 20000);
  const prompt = USER_PROMPT_TEMPLATE.replace('{{HTML}}', truncated);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();

    // JSON部分だけを抽出（前後に余分なテキストがある場合の安全策）
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const events = JSON.parse(jsonMatch[0]);
    console.log(`✅ ${sourceName}: ${events.length}件抽出`);
    return Array.isArray(events) ? events : [];

  } catch (e) {
    console.error(`❌ ${sourceName} 抽出エラー:`, e.message);
    return [];
  }
}
