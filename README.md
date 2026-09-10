# 📑 AutoDocs - 스마트 AI 견적서 자동 생성기 (Smart AI Invoice)

> **말(음성)이나 두서없는 메모·이메일 텍스트를 입력하면, AI가 한국 표준 규격 견적서를 자동으로 완벽하게 작성해 주는 스마트 웹 서비스입니다.**  
> **OpenRouter API Key를 백엔드 환경변수(`OPENROUTER_API_KEY`)에 안전하게 은닉**하여 일반 사용자가 API 키를 입력할 필요 없이 바로 사용 및 안전한 배포가 가능합니다. (파이썬 없이 순수 Node.js & 표준 웹 기술 기반)

---

## 🌟 주요 핵심 기능

### 1. 🛡️ 보안 강화 백엔드 환경변수 아키텍처
- **API 키 완전 은닉**: `OPENROUTER_API_KEY`는 서버의 환경변수에만 보관되며, 클라이언트 브라우저로 절대 노출되지 않습니다.
- **간편한 사용자 경험**: 사용자는 별도의 API 키 발급이나 복잡한 입력 없이 즉시 AI 견적서 생성 기능을 이용할 수 있습니다.
- **가성비 모델 자유 선택**: Google Gemini 2.5 Flash, DeepSeek-V3 등 초저비용/고성능 AI 모델을 브라우저에서 편리하게 전환 가능합니다.

### 2. 🎙️ 멀티모달 스마트 입력
- **Web Speech API 기반 음성 인식 (STT)**: 마이크 버튼 클릭 한 번으로 사용자의 한국어 음성을 실시간 텍스트로 자동 변환합니다.
- **비정형 텍스트 수용**: 이메일 본문, 카카오톡 대화, 회의록, 두서없는 메모 등 어떤 형태의 글도 그대로 분석합니다.
- **원클릭 샘플 템플릿**: 인테리어 공사, 웹/AI 개발 외주, 사무 소모품 납품 등 3가지 원클릭 테스트 템플릿을 제공합니다.

### 3. 📋 한국 표준 견적서 양식 100% 재현 & 실시간 연산
- **표준 규격 준수**: 문서번호, 견적일자, 수신처, 공급자 5대 정보 박스, 16행 품목 격자 테이블, 합계금액 바
- **실시간 인라인 편집**: 견적서 화면의 모든 글자와 숫자를 직접 클릭하여 자유롭게 수정 가능
- **자동 계산 엔진**: 단가나 수량 변경 시 `공급가액(수량*단가)`, `세액(10%)`, `합계금액`, `한글금액("일금 OOO 원정")` 즉시 자동 재연산
- **회사 직인(도장) 등록**: 투명 배경 도장 이미지를 업로드하면 견적서 `(인)` 자리에 실제 도장처럼 선명하게 날인

### 4. 💾 다양한 문서 포맷 내보내기
- **📄 한글(HWPX) 다운로드**:
  - KS X 6101(OWPML) 표준 스키마를 100% 준수하여 순수 JavaScript(JSZip)로 생성
  - 한컴오피스 한글 2014~2024, 한글 뷰어, 폴라리스 오피스 등에서 "양식에 맞지 않습니다" 오류 없이 완벽하게 열리고 편집 가능
- **📊 엑셀(CSV) 다운로드**: 한글 깨짐 방지 UTF-8 BOM이 적용된 엑셀 호환 CSV 파일 내보내기 지원
- **🖨️ A4 인쇄 / PDF 저장**: 인쇄(`Ctrl/Cmd + P`) 시 좌측 패널 등 UI가 자동으로 숨겨지고 깔끔한 실제 견적서 서식만 A4 용지에 꽉 차게 출력

---

## 🛠️ 기술 스택

- **Backend**: Node.js, Express, dotenv (파이썬 사용 안 함)
- **Frontend**: HTML5, Vanilla CSS, Modern JavaScript (ES6+)
- **Library**: [JSZip](https://stuk.github.io/jszip/) (클라이언트 사이드 HWPX 패키징)
- **AI Integration**: [OpenRouter API](https://openrouter.ai/) (백엔드 프록시 및 환경변수 처리)
- **Voice STT**: Web Speech API (Chrome/Edge 내장)

---

## 📂 프로젝트 구조

```
autodocs/
├── .env.example            # 환경변수 템플릿 (OPENROUTER_API_KEY)
├── api/
│   └── index.js            # Vercel Serverless Function 엔트리포인트 (/api/status, /api/extract)
├── server.js               # 로컬 개발 및 Node.js 웹 서버
├── vercel.json             # Vercel 서버리스 라우팅 설정
├── package.json            # Node.js 프로젝트 설정 및 의존성
├── public/                 # Vercel CDN 및 정적 웹 호스팅 최적화 디렉토리
│   ├── index.html          # 메인 웹 진입점
│   ├── css/
│   │   ├── style.css       # 메인 UI 테마 스타일
│   │   └── invoice.css     # 견적서 A4 인쇄/화면 표준 서식
│   ├── js/
│   │   ├── lib/jszip.min.js# ZIP 압축 라이브러리
│   │   ├── config.js       # 전역 설정 및 모델 목록
│   │   ├── speech.js       # 음성인식(STT)
│   │   ├── ai-service.js   # 백엔드 API 연동 모듈
│   │   ├── invoice-manager.js # 견적서 연산 및 렌더링
│   │   ├── hwpx-generator.js  # HWPX 생성기
│   │   └── app.js          # 컨트롤러
│   └── assets/
│       └── hwpx-template/  # HWPX 표준 템플릿
```

---

## 🚀 빠른 시작 및 환경변수 설정

### 1. 환경변수 설정 (`.env`)
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 OpenRouter API 키를 설정합니다:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```env
# OpenRouter API Key (필수)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 포트 번호 (선택, 기본 3000)
PORT=3000
```
> **참고**: `.env` 파일은 `.gitignore`에 등록되어 있어 Git 저장소에 커밋되지 않습니다.

### 2. 의존성 설치 및 로컬 서버 실행
```bash
# 의존성 패키지 설치
npm install

# 서버 실행 (Express + 정적 웹 호스팅)
npm start
```
브라우저에서 `http://localhost:3000`으로 접속하면 바로 사용할 수 있습니다!

---

## ☁️ 배포 가이드 (Cloud Deployment)

### 🚀 Vercel 직접 배포 (GitHub 거치지 않고 바로 배포)

깃허브(Git commit/push)를 거치지 않고 로컬 터미널에서 명령 한 줄로 즉시 Vercel에 배포할 수 있습니다:

#### 1) 최초 1회 Vercel 로그인 및 프로젝트 연결
```bash
# Vercel 계정 로그인 (브라우저 인증)
npx vercel login

# 현재 프로젝트를 Vercel 프로젝트에 연동
npx vercel link
# (질문 프롬프트가 나오면 본인 계정 선택 및 기존 프로젝트 연결 진행)
```

#### 2) 원클릭 즉시 배포
```bash
# [추천] 실서버(Production)로 즉시 다이렉트 배포
npm run deploy:prod

# 또는 테스트용 임시 Preview 주소로 배포
npm run deploy
```

> **보안 안내**: `.vercelignore` 파일이 설정되어 있어 로컬의 `.env` 파일이나 민감한 소스코드가 Vercel로 업로드되지 않고 완벽하게 보호됩니다.

### 🌐 일반 Vercel GitHub 연동 배포 (대안)
1. GitHub 저장소(`autodocs`)를 Vercel에 임포트합니다.
2. Vercel 프로젝트 대시보드의 **Settings > Environment Variables**로 이동합니다.
3. 변수명 `OPENROUTER_API_KEY`에 본인의 OpenRouter API 키 값을 입력하고 저장합니다.
4. 배포를 진행하면 별도의 서버 설정 없이 즉시 운영 상태가 됩니다 (`vercel.json` 내장).

### ☁️ Cloudflare Pages 배포 (추천)

Cloudflare의 초고속 전 세계 엣지 네트워크에 무료로 배포할 수 있습니다:

#### 1) 최초 1회 Cloudflare 로그인
```bash
npx wrangler login
# (브라우저가 열리면 Cloudflare 계정 로그인 및 승인)
```

#### 2) 원클릭 배포
```bash
npm run deploy:cf
```
배포가 완료되면 `https://autodocs-invoice.pages.dev` 형태의 주소가 즉시 발급됩니다!

#### 3) 환경변수 설정
Cloudflare 대시보드에서:
1. **Compute (Workers & Pages)** ➔ `autodocs-invoice` 프로젝트 선택
2. **Settings** ➔ **Variables and Secrets**로 이동
3. `OPENROUTER_API_KEY` 변수를 추가하고 본인의 OpenRouter 키 값을 입력합니다.

### 일반 Node.js 서버 / 클라우드 호스팅 (Render, Railway, AWS 등)
- 환경변수에 `OPENROUTER_API_KEY`를 추가하고 `npm start`로 구동합니다.

---

## 📖 사용 순서 가이드

1. **연동 상태 확인**: 상단 헤더 및 좌측 사이드바에 **`서버 보안 연동 완료`** 상태가 표시되는지 확인합니다.
2. **공급자 정보**: 우측 상단 **`🏢 공급자 정보`**에서 본인의 사업자등록번호, 상호, 대표자명, 직인 이미지 등을 설정합니다. (브라우저 로컬 저장)
3. **내용 입력**:
   - 마이크 버튼을 눌러 음성으로 말하거나,
   - 원클릭 테스트 예시 칩(`💻 웹/AI 개발 외주` 등)을 누르거나,
   - 메모/이메일 내용을 직접 입력합니다.
4. **생성**: **`견적서 자동 생성 (AI 변환)`** 버튼을 누르면 AI가 비정형 내용을 분석하여 우측 견적서에 모든 내역을 자동 기재합니다.
5. **내보내기**: 상단의 **`📄 한글(HWPX)`**, **`📊 엑셀(CSV)`**, 또는 **`🖨️ 인쇄 / PDF 저장`**을 클릭하여 문서를 발행합니다.

---

## 📄 라이선스

MIT License
