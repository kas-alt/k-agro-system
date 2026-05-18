// Vercel Serverless Function — OSRM 경로 프록시
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: '좌표 파라미터가 필요합니다.' });
  }
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) {
      return res.status(404).json({ error: '경로를 찾을 수 없습니다.' });
    }
    return res.json({
      distanceM: data.routes[0].distance,
      durationSec: data.routes[0].duration,
    });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류: ' + e.message });
  }
}
