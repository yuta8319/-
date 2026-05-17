// lib/geocode.js
// 会場名・住所から緯度・経度を取得する

export async function geocode(placeName) {
  if (!placeName) return { lat: null, lng: null };

  const query = encodeURIComponent(placeName + ' 東京');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_GEOCODING_KEY}&language=ja`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch (e) {
    console.error('Geocode error:', placeName, e.message);
  }

  return { lat: null, lng: null };
}
