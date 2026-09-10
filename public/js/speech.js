/**
 * speech.js - Web Speech API 기반 음성 인식 (STT) 모듈
 * 브라우저 내장 마이크를 활용하여 음성을 텍스트로 실시간 변환
 */

class SpeechService {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.finalTranscript = '';
    this.onResultCallback = null;
    this.onStatusChangeCallback = null;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('이 브라우저는 Web Speech API를 지원하지 않습니다.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;       // 말을 멈추어도 계속 청취
    this.recognition.interimResults = true;   // 말하는 도중 중간 결과 표시
    this.recognition.lang = 'ko-KR';          // 한국어 기본 설정
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isRecording = true;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({ status: 'recording', message: '음성을 듣고 있습니다... 말씀해 주세요.' });
      }
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback({
          final: this.finalTranscript.trim(),
          interim: interimTranscript.trim(),
          combined: (this.finalTranscript + interimTranscript).trim()
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      let errorMsg = '음성 인식 중 문제가 발생했습니다.';
      if (event.error === 'not-allowed') {
        errorMsg = '마이크 사용 권한이 차단되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.';
      } else if (event.error === 'no-speech') {
        errorMsg = '음성이 감지되지 않았습니다.';
      }
      this.isRecording = false;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({ status: 'error', message: errorMsg });
      }
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({ status: 'stopped', message: '음성 인식이 종료되었습니다.' });
      }
    };
  }

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  start(initialText = '') {
    if (!this.isSupported()) {
      alert('사용하시는 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge 브라우저를 권장합니다.');
      return false;
    }

    if (this.isRecording) {
      this.stop();
      return false;
    }

    this.finalTranscript = initialText ? initialText + ' ' : '';
    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.error('STT 시작 오류:', err);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
  }

  toggle(currentText = '') {
    if (this.isRecording) {
      this.stop();
      return false;
    } else {
      return this.start(currentText);
    }
  }

  onResult(callback) {
    this.onResultCallback = callback;
  }

  onStatusChange(callback) {
    this.onStatusChangeCallback = callback;
  }
}

// 전역 인스턴스 등록
window.speechService = new SpeechService();
