// Vercel Serverless Function — 카카오 Local API 프록시
// 브라우저에서 직접 호출하면 403이 나지만 서버에서 호출하면 정상 작동
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: 'addr 파라미터가 필요합니다.' });

  const KEY = 'dcbccacf6138abbc7d4c1ec499f57878';
  const headers = { Authorization: `KakaoAK ${KEY}` };

  try {
    // 1차: 주소 검색
    const r1 = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addr)}`,
      { headers }
    );
    if (!r1.ok) {
      const errBody = await r1.text();
      return res.status(502).json({ error: `카카오 주소API 오류 (${r1.status}): ${errBody}` });
    }
    const d1 = await r1.json();
    if (d1.documents && d1.documents.length > 0) {
      const doc = d1.documents[0];
      return res.json({ lat: parseFloat(doc.y), lng: parseFloat(doc.x), name: doc.address_name });
    }

    // 2차: 키워드 검색 (장소명, 건물명 등)
    const r2 = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(addr)}`,
      { headers }
    );
    if (!r2.ok) {
      const errBody = await r2.text();
      return res.status(502).json({ error: `카카오 키워드API 오류 (${r2.status}): ${errBody}` });
    }
    const d2 = await r2.json();
    if (d2.documents && d2.documents.length > 0) {
      const doc = d2.documents[0];
      return res.json({ lat: parseFloat(doc.y), lng: parseFloat(doc.x), name: doc.place_name });
    }

    return res.status(404).json({ error: `주소를 찾을 수 없습니다: "${addr}"\n전체 주소로 입력해 보세요 (예: 전라남도 나주시 빛가람로 736)` });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류: ' + e.message });
  }
}
