/**
 * ai-service.js - OpenRouter AI API 연동 및 프롬프트 처리 모듈
 * 비정형 텍스트/음성 내용을 분석하여 표준 견적서 JSON 구조로 변환
 */

class AIService {
  constructor() {
    this.apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY) || '';
    this.model = localStorage.getItem(CONFIG.STORAGE_KEYS.MODEL) || CONFIG.DEFAULT_MODEL;
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, this.apiKey);
  }

  getApiKey() {
    return this.apiKey;
  }

  setModel(modelId) {
    this.model = modelId;
    localStorage.setItem(CONFIG.STORAGE_KEYS.MODEL, this.model);
  }

  getModel() {
    return this.model;
  }

  hasApiKey() {
    return !!this.apiKey;
  }

  /**
   * OpenRouter에 전송할 시스템 및 유저 프롬프트 구성
   */
  buildMessages(userInput) {
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

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];
  }

  /**
   * OpenRouter API 호출 및 견적서 구조 파싱
   */
  async extractInvoiceData(rawInput) {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY_REQUIRED');
    }

    if (!rawInput || rawInput.trim().length === 0) {
      throw new Error('내용을 입력하거나 음성으로 말씀해 주세요.');
    }

    const messages = this.buildMessages(rawInput);

    const response = await fetch(CONFIG.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin || 'http://localhost',
        'X-Title': 'Smart Invoice Auto-Filler'
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.1, // 정밀한 추출을 위해 낮은 온도
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `API 요청 실패 (HTTP ${response.status})`;
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI 모델로부터 응답을 받지 못했습니다.');
    }

    return this.parseJsonResponse(content);
  }

  /**
   * LLM 응답 텍스트에서 JSON 추출 및 정제
   */
  parseJsonResponse(responseText) {
    let cleanJson = responseText.trim();

    // 마크다운 ```json ... ``` 코드 블록 제거
    if (cleanJson.includes('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        cleanJson = match[1].trim();
      }
    }

    try {
      const parsed = JSON.parse(cleanJson);
      return this.validateAndNormalize(parsed);
    } catch (e) {
      console.error('JSON 파싱 실패 원본 응답:', responseText);
      throw new Error('AI 모델이 올바른 JSON 규격으로 응답하지 않았습니다. 다시 시도해 주세요.');
    }
  }

  /**
   * 파싱된 데이터의 필수 필드 보정 및 수식 검증
   */
  validateAndNormalize(data) {
    const today = new Date();
    const normalized = {
      docNo: data.docNo || '',
      date: {
        year: data.date?.year || String(today.getFullYear()),
        month: data.date?.month || String(today.getMonth() + 1),
        day: data.date?.day || String(today.getDate())
      },
      recipient: data.recipient || '',
      supplier: data.supplier || null,
      items: Array.isArray(data.items) ? data.items : [],
      note: data.note || ''
    };

    // 각 품목 수치 정규화
    normalized.items = normalized.items.map(item => {
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      let supplyPrice = Number(item.supplyPrice);
      if (isNaN(supplyPrice) || supplyPrice === 0) {
        supplyPrice = qty * unitPrice;
      }
      let tax = Number(item.tax);
      if (isNaN(tax)) {
        tax = Math.round(supplyPrice * 0.1);
      }

      return {
        name: String(item.name || '').trim(),
        spec: String(item.spec || '').trim(),
        qty: qty,
        unitPrice: unitPrice,
        supplyPrice: supplyPrice,
        tax: tax,
        remark: String(item.remark || '').trim()
      };
    });

    return normalized;
  }
}

// 전역 인스턴스 등록
window.aiService = new AIService();
