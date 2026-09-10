/**
 * app.js - 메인 애플리케이션 진입점 및 컨트롤러
 * UI 이벤트, 음성 인식 파이프라인, AI 생성 및 모달 관리
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM 요소 참조 (가장 먼저 정의)
  const micButton = document.getElementById('mic-button');
  const voiceStatusText = document.getElementById('voice-status-text');
  const promptInput = document.getElementById('prompt-input');
  const btnClearText = document.getElementById('btn-clear-text');
  const btnGenerate = document.getElementById('btn-generate');
  const progressBox = document.getElementById('progress-box');
  const progressText = document.getElementById('progress-text');
  const btnSettings = document.getElementById('btn-settings');
  const btnSupplierSettings = document.getElementById('btn-supplier-settings');
  const btnPrint = document.getElementById('btn-print');
  const btnAddRow = document.getElementById('btn-add-row');
  const btnReset = document.getElementById('btn-reset');

  // 모달 요소들
  const settingsModal = document.getElementById('settings-modal');
  const supplierModal = document.getElementById('supplier-modal');
  const apiKeyInput = document.getElementById('api-key-input');
  const modelSelect = document.getElementById('model-select');
  const customModelInput = document.getElementById('custom-model-input');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnSaveSupplier = document.getElementById('btn-save-supplier');
  const stampFileInput = document.getElementById('stamp-file-input');

  // 사이드바 내 빠른 API Key 입력 및 모델 필드
  const sideApiKeyInput = document.getElementById('side-api-key-input');
  const btnSideSaveKey = document.getElementById('btn-side-save-key');
  const sideModelSelect = document.getElementById('side-model-select');
  const sideApiStatus = document.getElementById('side-api-status');

  // 2. 초기 렌더링 및 상태 반영
  invoiceManager.render();
  initModelSelect();
  checkApiKeyStatus();

  // 사이드바 키 저장 이벤트
  if (btnSideSaveKey) {
    btnSideSaveKey.addEventListener('click', () => {
      const key = sideApiKeyInput.value.trim();
      if (!key) {
        showToast('API 키를 입력해 주세요.', 'error');
        sideApiKeyInput.focus();
        return;
      }
      aiService.setApiKey(key);
      if (sideModelSelect) {
        aiService.setModel(sideModelSelect.value);
      }
      checkApiKeyStatus();
      showToast('OpenRouter API Key가 성공적으로 저장되었습니다!', 'success');
    });
  }

  if (sideModelSelect) {
    sideModelSelect.addEventListener('change', (e) => {
      aiService.setModel(e.target.value);
      if (modelSelect) modelSelect.value = e.target.value;
      showToast(`AI 모델이 '${e.target.options[e.target.selectedIndex].text}'(으)로 변경되었습니다.`, 'info');
    });
  }

  // ==========================================
  // [A] 음성 인식 (STT) 이벤트 처리
  // ==========================================
  if (window.speechService.isSupported()) {
    speechService.onStatusChange(({ status, message }) => {
      voiceStatusText.innerText = message;
      if (status === 'recording') {
        micButton.classList.add('recording');
        showToast('음성 인식을 시작했습니다. 마이크에 대고 말씀해 주세요.', 'info');
      } else {
        micButton.classList.remove('recording');
      }
    });

    speechService.onResult(({ combined }) => {
      promptInput.value = combined;
      // 텍스트 영역 높이 자동 조절 또는 포커스 유지
      promptInput.scrollTop = promptInput.scrollHeight;
    });

    micButton.addEventListener('click', () => {
      speechService.toggle(promptInput.value);
    });
  } else {
    voiceStatusText.innerText = '이 브라우저는 음성 인식을 지원하지 않습니다. (텍스트 입력을 사용해 주세요)';
    micButton.style.opacity = '0.5';
    micButton.style.cursor = 'not-allowed';
    micButton.addEventListener('click', () => {
      showToast('Chrome 또는 Edge 브라우저에서 마이크 음성 인식이 지원됩니다.', 'error');
    });
  }

  // 텍스트 지우기 버튼
  btnClearText.addEventListener('click', () => {
    promptInput.value = '';
    promptInput.focus();
  });

  // 원클릭 샘플 템플릿 클릭
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.sample;
      if (CONFIG.SAMPLE_PROMPTS[type]) {
        promptInput.value = CONFIG.SAMPLE_PROMPTS[type];
        showToast(`'${chip.innerText}' 샘플 템플릿이 입력되었습니다.`, 'info');
      }
    });
  });

  // ==========================================
  // [B] AI 견적서 자동 생성 트리거
  // ==========================================
  btnGenerate.addEventListener('click', async () => {
    const rawText = promptInput.value.trim();

    if (!rawText) {
      showToast('견적서로 변환할 텍스트를 입력하거나 음성으로 말씀해 주세요.', 'error');
      promptInput.focus();
      return;
    }

    if (!aiService.hasApiKey()) {
      showToast('OpenRouter API Key를 먼저 등록해 주세요.', 'error');
      openModal(settingsModal);
      return;
    }

    // 로딩 UI 활성화
    setGeneratingState(true, 'AI가 비정형 내용을 분석하고 견적 항목을 추출 중입니다...');

    try {
      // 음성 녹음 중이면 자동 중지
      if (speechService.isRecording) {
        speechService.stop();
      }

      const extracted = await aiService.extractInvoiceData(rawText);

      // 견적서에 자동 매핑 및 연산 적용
      invoiceManager.applyExtractedData(extracted);

      setGeneratingState(false);
      showToast('견적서가 성공적으로 자동 완성되었습니다!', 'success');

      // 우측 견적서 영역으로 부드럽게 시선 유도
      const invoiceView = document.querySelector('.invoice-wrapper');
      if (invoiceView && window.innerWidth <= 860) {
        invoiceView.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      setGeneratingState(false);
      if (err.message === 'OPENROUTER_API_KEY_REQUIRED') {
        showToast('OpenRouter API Key가 필요합니다.', 'error');
        openModal(settingsModal);
      } else {
        showToast(err.message || '견적서 생성 중 오류가 발생했습니다.', 'error');
      }
    }
  });

  function setGeneratingState(isGenerating, message = '') {
    const spinner = btnGenerate.querySelector('.spinner');
    const btnText = btnGenerate.querySelector('.btn-text');

    if (isGenerating) {
      btnGenerate.disabled = true;
      spinner.style.display = 'inline-block';
      btnText.innerText = 'AI 견적서 변환 중...';
      progressBox.classList.add('show');
      progressText.innerText = message;
    } else {
      btnGenerate.disabled = false;
      spinner.style.display = 'none';
      btnText.innerText = '견적서 자동 생성 (AI 변환)';
      progressBox.classList.remove('show');
    }
  }

  // ==========================================
  // [C] 상단 툴바 및 견적서 조작 이벤트
  // ==========================================
  btnPrint.addEventListener('click', () => {
    invoiceManager.print();
  });

  const btnExportHwpx = document.getElementById('btn-export-hwpx');
  if (btnExportHwpx) {
    btnExportHwpx.addEventListener('click', async () => {
      showToast('한글(HWPX) 문서를 생성 중입니다...', 'info');
      const success = await invoiceManager.exportToHWPX();
      if (success) {
        showToast('한글(HWPX) 견적서가 성공적으로 다운로드되었습니다!', 'success');
      }
    });
  }

  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      invoiceManager.exportToCSV();
      showToast('엑셀 호환 CSV 파일로 저장되었습니다.', 'success');
    });
  }

  btnAddRow.addEventListener('click', () => {
    invoiceManager.addNewRow();
    showToast('새 품목 행이 추가되었습니다.', 'info');
  });

  btnReset.addEventListener('click', () => {
    invoiceManager.clearInvoice();
  });

  // 견적서 날짜 및 수신인 직접 편집 이벤트
  const recipientEl = document.getElementById('recipient-name');
  if (recipientEl) {
    recipientEl.addEventListener('blur', (e) => {
      invoiceManager.data.recipient = e.target.innerText.trim();
    });
  }

  ['date-year', 'date-month', 'date-day'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('blur', () => {
        const y = document.getElementById('date-year').innerText.trim();
        const m = document.getElementById('date-month').innerText.trim();
        const d = document.getElementById('date-day').innerText.trim();
        invoiceManager.data.date = { year: y, month: m, day: d };
      });
    }
  });

  const docNoEl = document.getElementById('invoice-doc-no');
  if (docNoEl) {
    docNoEl.addEventListener('blur', (e) => {
      invoiceManager.data.docNo = e.target.innerText.trim();
    });
  }

  // 도장 클릭 시 도장 업로드 유도
  const stampBox = document.getElementById('stamp-container');
  if (stampBox) {
    stampBox.addEventListener('click', () => {
      openModal(supplierModal);
    });
  }

  // ==========================================
  // [D] 설정 및 공급자 모달 제어
  // ==========================================
  function openSettingsModal() {
    apiKeyInput.value = aiService.getApiKey();
    const currentModel = aiService.getModel();
    
    // 모델 셀렉트에 존재하는지 확인
    let matched = false;
    for (let opt of modelSelect.options) {
      if (opt.value === currentModel) {
        modelSelect.value = currentModel;
        matched = true;
        break;
      }
    }
    if (!matched) {
      modelSelect.value = 'custom';
      customModelInput.style.display = 'block';
      customModelInput.value = currentModel;
    } else {
      customModelInput.style.display = 'none';
    }

    openModal(settingsModal);
    setTimeout(() => apiKeyInput.focus(), 100);
  }

  btnSettings.addEventListener('click', openSettingsModal);

  const headerStatusPill = document.getElementById('header-status-pill');
  if (headerStatusPill) {
    headerStatusPill.style.cursor = 'pointer';
    headerStatusPill.title = '클릭하여 OpenRouter AI 설정 열기';
    headerStatusPill.addEventListener('click', openSettingsModal);
  }

  if (sideApiStatus) {
    sideApiStatus.style.cursor = 'pointer';
    sideApiStatus.title = '클릭하여 상세 AI 설정 열기';
    sideApiStatus.addEventListener('click', openSettingsModal);
  }

  modelSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customModelInput.style.display = 'block';
      customModelInput.focus();
    } else {
      customModelInput.style.display = 'none';
    }
  });

  btnSaveSettings.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    let selectedModel = modelSelect.value;
    if (selectedModel === 'custom') {
      selectedModel = customModelInput.value.trim() || CONFIG.DEFAULT_MODEL;
    }

    aiService.setApiKey(key);
    aiService.setModel(selectedModel);

    checkApiKeyStatus();
    closeModal(settingsModal);
    showToast('AI 설정이 저장되었습니다.', 'success');
  });

  // 공급자 정보 모달
  btnSupplierSettings.addEventListener('click', () => {
    const s = invoiceManager.data.supplier || {};
    document.getElementById('modal-reg-no').value = s.regNumber || '';
    document.getElementById('modal-company').value = s.companyName || '';
    document.getElementById('modal-ceo').value = s.ceoName || '';
    document.getElementById('modal-addr').value = s.address || '';
    document.getElementById('modal-biz-type').value = s.bizType || '';
    document.getElementById('modal-biz-item').value = s.bizItem || '';
    document.getElementById('modal-tel').value = s.tel || '';

    openModal(supplierModal);
  });

  // 도장 이미지 파일 업로드
  stampFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일(PNG, JPG)만 업로드 가능합니다.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        localStorage.setItem(CONFIG.STORAGE_KEYS.STAMP_IMAGE, base64);
        showToast('도장 이미지가 성공적으로 등록되었습니다.', 'success');
        invoiceManager.renderSupplier();
      };
      reader.readAsDataURL(file);
    }
  });

  btnSaveSupplier.addEventListener('click', () => {
    const updated = {
      regNumber: document.getElementById('modal-reg-no').value.trim(),
      companyName: document.getElementById('modal-company').value.trim(),
      ceoName: document.getElementById('modal-ceo').value.trim(),
      address: document.getElementById('modal-addr').value.trim(),
      bizType: document.getElementById('modal-biz-type').value.trim(),
      bizItem: document.getElementById('modal-biz-item').value.trim(),
      tel: document.getElementById('modal-tel').value.trim()
    };

    invoiceManager.saveSupplierInfo(updated);
    invoiceManager.renderSupplier();
    closeModal(supplierModal);
    showToast('공급자(내 사업자) 정보가 저장되었습니다.', 'success');
  });

  // 모달 공통 닫기 이벤트
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // ==========================================
  // [E] 헬퍼 유틸리티 함수들
  // ==========================================
  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  function initModelSelect() {
    const currentModel = aiService.getModel();

    // 모달 내 셀렉트
    if (modelSelect) {
      modelSelect.innerHTML = '';
      CONFIG.AVAILABLE_MODELS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = `${m.name} (${m.cost})`;
        if (m.id === currentModel) opt.selected = true;
        modelSelect.appendChild(opt);
      });
      const customOpt = document.createElement('option');
      customOpt.value = 'custom';
      customOpt.innerText = '직접 모델 ID 입력...';
      modelSelect.appendChild(customOpt);
    }

    // 사이드바 간편 셀렉트
    if (sideModelSelect) {
      sideModelSelect.innerHTML = '';
      CONFIG.AVAILABLE_MODELS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        // 사이드바에는 간결한 이름 표기
        opt.innerText = m.name.split(' (')[0];
        if (m.id === currentModel) opt.selected = true;
        sideModelSelect.appendChild(opt);
      });
    }
  }

  function checkApiKeyStatus() {
    const dot = document.getElementById('header-status-dot');
    const text = document.getElementById('header-status-text');
    const currentKey = aiService.getApiKey();

    if (currentKey) {
      if (dot) dot.classList.add('active');
      if (text) text.innerText = 'AI 연동 준비됨';
      
      if (sideApiStatus) {
        sideApiStatus.innerText = '등록완료';
        sideApiStatus.style.background = 'rgba(16, 185, 129, 0.2)';
        sideApiStatus.style.color = '#34d399';
        sideApiStatus.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      }
      if (sideApiKeyInput) sideApiKeyInput.value = currentKey;
      if (apiKeyInput) apiKeyInput.value = currentKey;
    } else {
      if (dot) dot.classList.remove('active');
      if (text) text.innerText = 'API 키 설정 필요';

      if (sideApiStatus) {
        sideApiStatus.innerText = '미설정';
        sideApiStatus.style.background = 'rgba(245, 158, 11, 0.2)';
        sideApiStatus.style.color = '#fbbf24';
        sideApiStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      }
      if (sideApiKeyInput) sideApiKeyInput.value = '';
      if (apiKeyInput) apiKeyInput.value = '';
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  window.showToast = showToast;
});
