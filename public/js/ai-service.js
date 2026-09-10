/**
 * ai-service.js - OpenRouter AI API 연동 및 프롬프트 처리 모듈
 * 비정형 텍스트/음성 내용을 분석하여 표준 견적서 JSON 구조로 변환
 */

class AIService {
  constructor() {
    this.model = localStorage.getItem(CONFIG.STORAGE_KEYS.MODEL) || CONFIG.DEFAULT_MODEL;
    this.isServerReady = false;
    this.defaultModel = CONFIG.DEFAULT_MODEL;
  }

  setModel(modelId) {
    this.model = modelId;
    localStorage.setItem(CONFIG.STORAGE_KEYS.MODEL, this.model);
  }

  getModel() {
    return this.model;
  }

  /**
   * 백엔드 서버의 환경변수(OPENROUTER_API_KEY) 설정 상태를 비동기로 확인
   */
  async checkServerStatus() {
    try {
      const response = await fetch(CONFIG.API_ENDPOINTS.STATUS, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        this.isServerReady = !!data.hasKey;
        if (data.defaultModel && !localStorage.getItem(CONFIG.STORAGE_KEYS.MODEL)) {
          this.model = data.defaultModel;
        }
        return data;
      }
    } catch (e) {
      console.warn('서버 상태 확인 실패:', e);
      this.isServerReady = false;
    }
    return { hasKey: false, status: 'error' };
  }

  /**
   * AI 연동 준비 여부 확인
   */
  hasApiKey() {
    return this.isServerReady;
  }

  /**
   * 백엔드 API(/api/extract)를 호출하여 견적서 구조 데이터 추출
   */
  async extractInvoiceData(rawInput) {
    if (!rawInput || rawInput.trim().length === 0) {
      throw new Error('견적서로 변환할 내용을 입력하거나 음성으로 말씀해 주세요.');
    }

    const response = await fetch(CONFIG.API_ENDPOINTS.EXTRACT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: rawInput,
        model: this.model
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (result.error === 'SERVER_KEY_NOT_CONFIGURED') {
        throw new Error('서버에 OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다. 백엔드 .env 설정을 확인해 주세요.');
      }
      throw new Error(result.message || `서버 처리 중 오류가 발생했습니다. (HTTP ${response.status})`);
    }

    if (!result.data) {
      throw new Error('AI 모델로부터 분석된 견적 데이터를 수신하지 못했습니다.');
    }

    // 반환된 데이터의 무결성 정규화
    return this.validateAndNormalize(result.data);
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
