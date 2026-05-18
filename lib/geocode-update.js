import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const credentials = JSON.parse(readFileSync('./service-account.json', 'utf8'));

async function getAuth() {
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function geocode(placeName) {
  const query = encodeURIComponent(placeName + ' 東京');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_GEOCODING_KEY}&language=ja`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  return { lat: '', lng: '' };
}

async function main() {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: '📅イベントデータ!A4:R200',
  });

  const rows = res.data.values || [];
  const updates = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const place = row[7];
    const area  = row[2];
    const lat   = row[8];
    const lng   = row[9];

    if (place && (!lat || !lng)) {
      console.log(`📍 座標取得中: ${place} ${area}`);
      const coords = await geocode(`${place} ${area}`);
      updates.push({
        range: `📅イベントデータ!I${i + 4}:J${i + 4}`,
        values: [[coords.lat, coords.lng]],
      });
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (updates.length === 0) {
    console.log('✅ 更新対象なし');
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  });

  console.log(`✅ ${updates.length}件の座標を更新しました`);
}

main().catch(console.error);