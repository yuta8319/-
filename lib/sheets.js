// lib/sheets.js
import { google } from 'googleapis';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function getEvents() {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'イベントデータ!A4:R200',
  });
  const rows = res.data.values || [];
  return rows
    .filter(row => row[16] === 'published')
    .map(row => ({
      id:        row[0]  || '',
      name:      row[1]  || '',
      area:      row[2]  || '',
      date:      row[3]  || '',
      endDate:   row[4]  || '',
      startTime: row[5]  || '',
      endTime:   row[6]  || '',
      place:     row[7]  || '',
      lat:       parseFloat(row[8]) || null,
      lng:       parseFloat(row[9]) || null,
      url:       row[10] || '',
      tag:       row[11] || '🎉',
      category:  row[12] || 'festival',
      target:    row[13] || 'all',
      free:      row[14] === 'TRUE',
      indoor:    row[15] === 'TRUE',
      status:    row[16] || 'draft',
      source:    row[17] || 'manual',
    }));
}

export async function getExistingEvents() {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'イベントデータ!B4:D200',
  });
  const rows = res.data.values || [];
  return rows.map(row => ({
    name: row[0] || '',
    date: row[1] || '',
  }));
}

export async function appendEvents(events) {
  if (events.length === 0) return 0;
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const rows = events.map(ev => [
    ev.id,
    ev.name,
    ev.area,
    ev.date,
    ev.endDate    || '',
    ev.startTime  || '',
    ev.endTime    || '',
    ev.place,
    ev.lat        || '',
    ev.lng        || '',
    ev.url        || '',
    ev.tag        || '🎉',
    ev.category   || 'festival',
    ev.target     || 'all',
    ev.free       ? 'TRUE' : 'FALSE',
    ev.indoor     ? 'TRUE' : 'FALSE',
    ev.status     || 'published',
    ev.source     || 'auto',
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'イベントデータ!A4',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
  return rows.length;
}