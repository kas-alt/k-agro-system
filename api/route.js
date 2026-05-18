// Vercel Serverless Function — Tmap 경로안내 API 프록시
// 출발/도착 좌표를 받아 주행거리·소요시간·고속도로 통행료 반환
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: '좌표 파라미터가 필요합니다.' });
  }

  const TMAP_KEY = 'E0ZR1U6u4OyY1StTCgv32f4AVGj1pcF9P6BDoPci';

  try {
    const response = await fetch('https://apis.openapi.sk.com/tmap/routes?version=1', {
      method: 'POST',
      headers: {
        'appKey': TMAP_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        startX: fromLng,   // 경도
        startY: fromLat,   // 위도
        endX: toLng,
        endY: toLat,
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        searchOption: '0', // 최적경로
        trafficInfo: 'N',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Tmap API 오류 (${response.status}): ${errText}` });
    }

    const data = await response.json();
    const props = data?.features?.[0]?.properties;
    if (!props) {
      return res.status(502).json({ error: 'Tmap 응답 형식 오류' });
    }

    return res.json({
      distanceM: props.totalDistance,       // 미터
      durationSec: props.totalTime,          // 초
      tollFare: props.totalFare ?? 0,        // 통행료 (원)
    });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류: ' + e.message });
  }
}
