/**
 * api/index.js - Vercel Serverless Function 엔트리포인트
 * /api/status 및 /api/extract 요청을 처리하는 Express 백엔드 API
 */

require('dotenv').config();
const express = require('express');

const app = express();

app.use(express.json());

// 1. 서버 상태 및 환경변수 설정 여부 확인 엔드포인트
app.get('/api/status', (req, res) => {
  const hasKey = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    hasKey: hasKey,
    defaultModel: process.env.DEFAULT_MODEL || 'google/gemini-2.5-flash'
  });
});

// 2. OpenRouter 견적서 자동 추출 API 엔드포인트
app.post('/api/extract', async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return res.status(500).json({
        error: 'SERVER_KEY_NOT_CONFIGURED',
        message: '서버 환경변수에 OPENROUTER_API_KEY가 설정되지 않았습니다. Vercel 환경변수 또는 .env에 키를 등록해 주세요.'
      });
    }

    const { text, model } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'EMPTY_TEXT',
        message: '견적서로 변환할 텍스트 내용을 입력해 주세요.'
      });
    }

    const selectedModel = model || process.env.DEFAULT_MODEL || 'google/gemini-2.5-flash';
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const curDay = today.getDate();

    const systemPrompt = `당신은 비정형 텍스트, 이메일, 회의 메모, 음성 녹취록에서 견적서에 필요한 필수 항목을 완벽하게 추출하여 한국 표준 견적서 JSON 데이터로 변환하는 전문 비즈니스 AI 비서입니다.

오늘 날짜 기준: ${curYear}년 ${curMonth}월 ${curDay}일

[추출 및 정제 규칙]
1. 수신인(recipient): 고객사, 바이어, 발주자 회사명 또는 담당자 이름. 없으면 빈 문자열("").
2. 일자(date): 텍스트에 언급된 견적 일자. 없으면 오늘 날짜({ year: "${curYear}", month: "${curMonth}", day: "${curDay}" }).
3. 문서번호(docNo): 언급된 견적 번호. 없으면 빈 문자열("").
4. 품목 목록(items):
   - name: 품명 (구체적이고 명확한 제품명/서비스명)
   - spec: 규격/단위 (예: "EA", "박스", "1식", "m2", "개", "개월" 등. 없으면 "1식" 또는 "")
   - qty: 수량 (정수 또는 실수 숫자, 기본 1)
   - unitPrice: 단가 (숫자, 원 단위)
   - supplyPrice: 공급가액 (기본적으로 qty * unitPrice, 숫자)
   - tax: 세액 (한국 기본 부가세 10% = supplyPrice * 0.1, 정수 반올림. 단, 부가세 포함으로 명시된 경우 공급가액과 세액을 분리 계산)
   - remark: 비고 (품목별 추가 옵션, 비고 사항, 자재 포함 여부 등)
5. 공급자 정보(supplier): 텍스트 내에 공급처/발행처 정보가 언급된 경우에만 추출(regNumber, companyName, ceoName, address, bizType, bizItem, tel). 없으면 각 필드를 null로 설정.

반드시 다른 부가적인 설명 없이 오직 유효한 순수 JSON만 응답하세요. JSON 스키마 형식:
{
  "docNo": "문서번호",
  "date": { "year": "2026", "month": "3", "day": "15" },
  "recipient": "수신처 회사명 또는 성함",
  "supplier": {
    "regNumber": null,
    "companyName": null,
    "ceoName": null,
    "address": null,
    "bizType": null,
    "bizItem": null,
    "tel": null
  },
  "items": [
    {
      "name": "품목명",
      "spec": "규격",
      "qty": 1,
      "unitPrice": 100000,
      "supplyPrice": 100000,
      "tax": 10000,
      "remark": ""
    }
  ],
  "note": "전체 특이사항 또는 결제조건"
}`;

    // OpenRouter API 호출
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/svtwow/autodocs',
        'X-Title': 'AutoDocs Smart Invoice'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));
      const msg = errorData.error?.message || `OpenRouter API 요청 실패 (HTTP ${openRouterResponse.status})`;
      return res.status(openRouterResponse.status).json({ error: 'AI_API_ERROR', message: msg });
    }

    const data = await openRouterResponse.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'EMPTY_AI_RESPONSE', message: 'AI 모델로부터 응답을 받지 못했습니다.' });
    }

    // 마크다운 코드 블록 제거 및 JSON 파싱
    let cleanJson = content.trim();
    if (cleanJson.includes('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        cleanJson = match[1].trim();
      }
    }

    try {
      const parsedData = JSON.parse(cleanJson);
      res.json({
        success: true,
        data: parsedData
      });
    } catch (parseErr) {
      console.error('JSON 파싱 실패 원본:', content);
      res.status(500).json({
        error: 'JSON_PARSE_ERROR',
        message: 'AI 모델이 올바른 JSON 규격으로 응답하지 않았습니다. 다시 시도해 주세요.'
      });
    }

  } catch (err) {
    console.error('서버 처리 오류:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: err.message || '서버 내부 오류가 발생했습니다.'
    });
  }
});

module.exports = app;
