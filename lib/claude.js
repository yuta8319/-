// lib/claude.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function extractEvents(text, sourceName) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: 'イベント一覧をJSON配列で返してください。JSONのみ、コードブロックなし、tagは文字列のみ（絵文字禁止）。会場から区を推測。日付はYYYY/MM/DD形式。\n\n[{"name":"","area":"区","date":"2026/MM/DD","endDate":"","place":"","category":"festival","target":"all","free":false,"indoor":false,"tag":"festival","url":""}]\n\n' + text }],
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