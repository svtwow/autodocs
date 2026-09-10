/**
 * config.js - 전역 설정 및 모델 목록, 샘플 데이터 관리
 */

const CONFIG = {
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  STORAGE_KEYS: {
    API_KEY: 'invoice_ai_openrouter_key',
    MODEL: 'invoice_ai_selected_model',
    SUPPLIER_INFO: 'invoice_ai_supplier_info',
    STAMP_IMAGE: 'invoice_ai_stamp_img'
  },
  DEFAULT_MODEL: 'google/gemini-2.5-flash',
  
  // 저렴하고 가성비 좋은 추천 모델 목록
  AVAILABLE_MODELS: [
    {
      id: 'google/gemini-2.5-flash',
      name: 'Google: Gemini 2.5 Flash (초고속/초저비용 추천)',
      cost: '입력 $0.075 / 출력 $0.30 (1M 토큰당)'
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek: DeepSeek-V3 (고성능/초저비용)',
      cost: '입력 $0.14 / 출력 $0.28 (1M 토큰당)'
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Meta: Llama 3.3 70B Instruct (우수한 오픈소스)',
      cost: '입력 $0.12 / 출력 $0.30 (1M 토큰당)'
    },
    {
      id: 'qwen/qwen-2.5-72b-instruct',
      name: 'Qwen: Qwen 2.5 72B Instruct (뛰어난 다국어/한국어)',
      cost: '입력 $0.23 / 출력 $0.40 (1M 토큰당)'
    },
    {
      id: 'google/gemini-flash-1.5-8b',
      name: 'Google: Gemini Flash 1.5 8B (초경량)',
      cost: '입력 $0.0375 / 출력 $0.15 (1M 토큰당)'
    }
  ],

  // 빠른 테스트를 위한 원클릭 샘플 프롬프트
  SAMPLE_PROMPTS: {
    interior: `[사무실 인테리어 공사 견적 초안]
수신처: (주)넥스트이노베이션 귀하
공사일자: 2026년 3월 15일

회의실 방음 가벽 설치 공사 1식 단가 2,500,000원
바닥 고급 데코타일 시공 85헤베(m2) 당 단가 35,000원
LED 매립형 슬림 조명 교체 24개 개당 45,000원
폐기물 처리 및 공사 후 준공 청소 1식 600,000원
전기 배선 추가 증설 공사 1식 500,000원

부가세는 별도로 계산해서 넣어주고, 비고에 자재 포함 여부 적어줘.`,

    webdev: `김팀장님, 지난 미팅에서 논의된 AI 챗봇 견적 메일 공유합니다.

받는 분: 주식회사 알파솔루션
견적일자: 오늘 날짜로

내역:
1. 반응형 웹 관리자 대시보드 UI/UX 설계 및 퍼블리싱 (1식, 단가 4,000,000원)
2. OpenRouter AI LLM API 연동 및 프롬프트 파이프라인 개발 (1식, 단가 3,500,000원)
3. 클라우드 서버 배포 및 도메인 SSL 보안 세팅 (1식, 800,000원)
4. 기술 교육 및 3개월 하자보수 유지관리 (3개월, 월 단가 500,000원)

부가세 10% 별도 반영해서 합계 금액 뽑아주세요.`,

    supplies: `[정기 소모품 및 사무기기 납품 내역]
거래처: 미래테크놀로지 구매팀
날짜: 이번주

- 복사용지 A4 (Double A 80g) 50박스 박스당 32,000원
- 토너 카트리지 (삼성 CLT-K506S 정품) 4개 개당 85,000원
- 무선 인체공학 마우스/키보드 세트 (로지텍 MK295) 15세트 세트당 42,000원
- 네스프레소 호환 커피캡슐 500개 개당 650원
- 미니 각티슈 (200매 3겹) 100개 개당 1,500원

모두 부가세 10% 포함해서 최종 견적서 만들어줘.`
  },

  // 기본 공급자 정보 (기본값)
  DEFAULT_SUPPLIER: {
    regNumber: '123-45-67890',
    companyName: '스마트에이아이솔루션',
    ceoName: '홍길동',
    address: '서울특별시 강남구 테헤란로 123, 5층',
    bizType: '정보통신업',
    bizItem: '소프트웨어 개발 및 공급',
    tel: '02-555-0199'
  }
};
