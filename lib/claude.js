import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SYSTEM = `あなたは東京のイベント情報を整理するアシスタントです。JSON配列のみ返してください。マークダウンのコードブロックは使わないでください。`;
const PROMPT = `以下のイベント一覧から情報を抽出してJSON配列で返してください。コードブロックなしでJSONのみ返すこと。会場から区を推測（上野公園→台東区、代々木公園→渋谷区、日比谷公園→千代田区、池袋→豊島区、中野→中野区、隅田公園→墨田区、恵比寿→渋谷区、六本木→港区、秋葉原→千代田区、木場→江東区、大崎→品川区）。日付はYYYY/MM/DD形式。JSON形式：[{"name":"","area":"","date":"","endDate":"","startTime":"","endTime":"","place":"","url":"","category":"festival|food|music|art|sport|nature|learn|nightlife","target":"all|kids|adult|family","free":false,"indoor":false,"tag":""}]\nテキスト：\n{{TEXT}}`;
export async function extractEvents(text, sourceName) {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: 'user', content: PROMPT.replace('{{TEXT}}', text.slice(0, 15000)) }],
    });
    let raw = response.content[0].text.trim();
    raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1) { console.log(`  no JSON (${sourceName})`); return []; }
    const events = JSON.parse(raw.slice(start, end + 1));
    console.log(`  claude: ${events.length}件 (${sourceName})`);
    return Array.isArray(events) ? events : [];
  } catch (e) {
    console.error(`  error (${sourceName}):`, e.message);
    return [];
  }
}
