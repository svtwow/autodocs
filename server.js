/**
 * server.js - 로컬 개발 및 일반 Node.js 호스팅용 웹 서버
 * api/index.js의 API 엔드포인트와 정적 웹 파일을 함께 서빙합니다.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const app = require('./api/index.js');

const PORT = process.env.PORT || 3000;

// 정적 웹 파일 서빙 (HTML, CSS, JS, Assets는 public/ 폴더에서 서빙)
app.use(express.static(path.join(__dirname, 'public')));

// 루트 접속 시 index.html 서빙 명시
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 로컬 서버 실행
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 AutoDocs 서버가 실행 중입니다.`);
    console.log(`🌐 주소: http://localhost:${PORT}`);
    console.log(`🔑 OpenRouter 환경변수 설정: ${process.env.OPENROUTER_API_KEY ? '완료 (Key 로드됨)' : '미설정 (OPENROUTER_API_KEY 필요)'}`);
    console.log(`========================================`);
  });
}

module.exports = app;
