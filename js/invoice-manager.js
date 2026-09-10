/**
 * invoice-manager.js - 견적서 렌더링, 수식 자동 연산, 한국어 금액 변환 및 상태 관리
 */

class InvoiceManager {
  constructor() {
    this.TOTAL_ROWS = 16; // 표준 A4 양식 고정 행 수
    this.data = {
      docNo: '',
      date: {
        year: String(new Date().getFullYear()),
        month: String(new Date().getMonth() + 1),
        day: String(new Date().getDate())
      },
      recipient: '',
      supplier: this.loadSupplierInfo(),
      items: [],
      note: ''
    };
  }

  /**
   * 저장된 공급자 정보 로드 (없으면 기본값 사용)
   */
  loadSupplierInfo() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SUPPLIER_INFO);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('공급자 정보 파싱 실패', e);
      }
    }
    return { ...CONFIG.DEFAULT_SUPPLIER };
  }

  /**
   * 공급자 정보 로컬스토리지 저장
   */
  saveSupplierInfo(supplierData) {
    this.data.supplier = { ...supplierData };
    localStorage.setItem(CONFIG.STORAGE_KEYS.SUPPLIER_INFO, JSON.stringify(this.data.supplier));
  }

  /**
   * 숫자 금액을 한국어 읽기 형식으로 변환 (견적서/공문서 표준)
   * 위변조 방지를 위해 '일' 단위도 명확히 표기 (예: 1,100,000 -> 일백일십만)
   */
  numberToKorean(num) {
    if (!num || isNaN(num) || num <= 0) return '영';

    const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const smallUnits = ['', '십', '백', '천'];
    const bigUnits = ['', '만', '억', '조'];

    let result = '';
    let unitCount = 0;
    let tempNum = Math.floor(num);

    while (tempNum > 0) {
      let chunk = tempNum % 10000;
      let chunkStr = '';

      for (let i = 0; i < 4; i++) {
        let digit = chunk % 10;
        if (digit > 0) {
          let unitName = smallUnits[i];
          let digitName = units[digit];
          chunkStr = digitName + unitName + chunkStr;
        }
        chunk = Math.floor(chunk / 10);
      }

      if (chunkStr.length > 0) {
        chunkStr += bigUnits[unitCount];
        result = chunkStr + (result ? ' ' + result : '');
      }

      tempNum = Math.floor(tempNum / 10000);
      unitCount++;
    }

    return result.trim();
  }

  /**
   * 1,000 단위 콤마 포맷터
   */
  formatNumber(val) {
    if (val === null || val === undefined || isNaN(val) || val === '') return '0';
    return Number(val).toLocaleString('ko-KR');
  }

  /**
   * 문자열에서 숫자만 추출
   */
  parseNumber(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const clean = String(str).replace(/[^\d.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  /**
   * AI 추출 데이터를 견적서 모델에 적용
   */
  applyExtractedData(extracted) {
    if (extracted.docNo) this.data.docNo = extracted.docNo;
    if (extracted.date) this.data.date = extracted.date;
    if (extracted.recipient) this.data.recipient = extracted.recipient;
    
    // 공급자 정보가 구체적으로 추출된 경우만 갱신
    if (extracted.supplier) {
      for (const [key, val] of Object.entries(extracted.supplier)) {
        if (val && val.trim() !== '') {
          this.data.supplier[key] = val;
        }
      }
    }

    if (Array.isArray(extracted.items) && extracted.items.length > 0) {
      this.data.items = extracted.items;
    }

    if (extracted.note) this.data.note = extracted.note;

    this.render();
  }

  /**
   * 전체 견적서 화면 렌더링
   */
  render() {
    this.renderHeader();
    this.renderSupplier();
    this.renderItems();
    this.calculateTotals();
  }

  /**
   * 상단 헤더 렌더링 (번호, 날짜, 수신처)
   */
  renderHeader() {
    const docNoEl = document.getElementById('invoice-doc-no');
    if (docNoEl) docNoEl.innerText = this.data.docNo || '';

    const yearEl = document.getElementById('date-year');
    const monthEl = document.getElementById('date-month');
    const dayEl = document.getElementById('date-day');

    if (yearEl) yearEl.innerText = this.data.date.year || '';
    if (monthEl) monthEl.innerText = this.data.date.month || '';
    if (dayEl) dayEl.innerText = this.data.date.day || '';

    const recipientEl = document.getElementById('recipient-name');
    if (recipientEl) recipientEl.innerText = this.data.recipient || '';
  }

  /**
   * 공급자 정보 렌더링
   */
  renderSupplier() {
    const s = this.data.supplier || {};
    const map = {
      'supplier-reg-no': s.regNumber,
      'supplier-company': s.companyName,
      'supplier-ceo': s.ceoName,
      'supplier-addr': s.address,
      'supplier-biz-type': s.bizType,
      'supplier-biz-item': s.bizItem,
      'supplier-tel': s.tel
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.innerText = val || '';
    }

    // 도장 이미지 로드
    const stampImgData = localStorage.getItem(CONFIG.STORAGE_KEYS.STAMP_IMAGE);
    const stampContainer = document.getElementById('stamp-container');
    if (stampContainer) {
      if (stampImgData) {
        stampContainer.innerHTML = `<img src="${stampImgData}" alt="도장" />`;
      } else {
        stampContainer.innerHTML = `<span>(인)</span>`;
      }
    }
  }

  /**
   * 품목 테이블 렌더링 (최소 TOTAL_ROWS행 유지)
   */
  renderItems() {
    const tbody = document.getElementById('invoice-items-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const itemsCount = this.data.items.length;
    const rowCount = Math.max(this.TOTAL_ROWS, itemsCount);

    for (let i = 0; i < rowCount; i++) {
      const item = this.data.items[i] || null;
      const tr = document.createElement('tr');
      tr.dataset.index = i;

      if (item) {
        tr.innerHTML = `
          <td class="col-name editable-item" contenteditable="true" data-field="name">${item.name || ''}</td>
          <td class="col-spec editable-item" contenteditable="true" data-field="spec">${item.spec || ''}</td>
          <td class="col-qty editable-item" contenteditable="true" data-field="qty">${item.qty ? this.formatNumber(item.qty) : ''}</td>
          <td class="col-unit-price editable-item" contenteditable="true" data-field="unitPrice">${item.unitPrice ? this.formatNumber(item.unitPrice) : ''}</td>
          <td class="col-supply-price editable-item" contenteditable="true" data-field="supplyPrice">${item.supplyPrice ? this.formatNumber(item.supplyPrice) : ''}</td>
          <td class="col-tax editable-item" contenteditable="true" data-field="tax">${item.tax ? this.formatNumber(item.tax) : ''}</td>
          <td class="col-remark editable-item" contenteditable="true" data-field="remark">
            ${item.remark || ''}
            <button class="row-action-btn" title="행 삭제" onclick="invoiceManager.deleteRow(${i})">×</button>
          </td>
        `;
      } else {
        // 빈 행 (양식 유지용)
        tr.innerHTML = `
          <td class="col-name editable-item" contenteditable="true" data-field="name"></td>
          <td class="col-spec editable-item" contenteditable="true" data-field="spec"></td>
          <td class="col-qty editable-item" contenteditable="true" data-field="qty"></td>
          <td class="col-unit-price editable-item" contenteditable="true" data-field="unitPrice"></td>
          <td class="col-supply-price editable-item" contenteditable="true" data-field="supplyPrice"></td>
          <td class="col-tax editable-item" contenteditable="true" data-field="tax"></td>
          <td class="col-remark editable-item" contenteditable="true" data-field="remark"></td>
        `;
      }

      tbody.appendChild(tr);
    }

    this.bindTableEvents();
  }

  /**
   * 테이블 인라인 편집 이벤트 바인딩
   */
  bindTableEvents() {
    const cells = document.querySelectorAll('.editable-item');
    cells.forEach(cell => {
      cell.addEventListener('blur', (e) => {
        this.handleCellBlur(e.target);
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          cell.blur();
        }
      });
    });
  }

  /**
   * 셀 값 변경 시 데이터 동기화 및 재계산
   */
  handleCellBlur(cell) {
    const tr = cell.closest('tr');
    const index = parseInt(tr.dataset.index, 10);
    const field = cell.dataset.field;
    let text = cell.innerText.trim();

    if (!this.data.items[index]) {
      if (text.length === 0) return;
      this.data.items[index] = { name: '', spec: '', qty: 0, unitPrice: 0, supplyPrice: 0, tax: 0, remark: '' };
    }

    const item = this.data.items[index];

    if (field === 'qty' || field === 'unitPrice') {
      const numVal = this.parseNumber(text);
      item[field] = numVal;
      cell.innerText = numVal > 0 ? this.formatNumber(numVal) : '';

      // 수량과 단가가 있으면 공급가액과 세액 자동 재계산
      if (item.qty > 0 && item.unitPrice > 0) {
        item.supplyPrice = Math.round(item.qty * item.unitPrice);
        item.tax = Math.round(item.supplyPrice * 0.1);
        
        const supplyCell = tr.querySelector('[data-field="supplyPrice"]');
        const taxCell = tr.querySelector('[data-field="tax"]');
        if (supplyCell) supplyCell.innerText = this.formatNumber(item.supplyPrice);
        if (taxCell) taxCell.innerText = this.formatNumber(item.tax);
      }
    } else if (field === 'supplyPrice') {
      const numVal = this.parseNumber(text);
      item.supplyPrice = numVal;
      cell.innerText = numVal > 0 ? this.formatNumber(numVal) : '';
      if (!item.tax || item.tax === 0) {
        item.tax = Math.round(numVal * 0.1);
        const taxCell = tr.querySelector('[data-field="tax"]');
        if (taxCell) taxCell.innerText = this.formatNumber(item.tax);
      }
    } else if (field === 'tax') {
      const numVal = this.parseNumber(text);
      item.tax = numVal;
      cell.innerText = numVal > 0 ? this.formatNumber(numVal) : '';
    } else {
      item[field] = text;
    }

    this.calculateTotals();
  }

  /**
   * 품목 행 삭제
   */
  deleteRow(index) {
    if (this.data.items[index]) {
      this.data.items.splice(index, 1);
      this.renderItems();
      this.calculateTotals();
    }
  }

  /**
   * 품목 새 행 추가
   */
  addNewRow() {
    this.data.items.push({
      name: '',
      spec: '',
      qty: 1,
      unitPrice: 0,
      supplyPrice: 0,
      tax: 0,
      remark: ''
    });
    this.renderItems();
    this.calculateTotals();
  }

  /**
   * 공급가액 합계, 세액 합계, 총 합계 및 한글 금액 계산 및 UI 갱신
   */
  calculateTotals() {
    let totalQty = 0;
    let totalSupply = 0;
    let totalTax = 0;

    for (const item of this.data.items) {
      if (!item) continue;
      totalQty += Number(item.qty) || 0;
      totalSupply += Number(item.supplyPrice) || 0;
      totalTax += Number(item.tax) || 0;
    }

    const grandTotal = totalSupply + totalTax;

    // 테이블 하단 계
    const qtyTotalEl = document.getElementById('footer-total-qty');
    const supplyTotalEl = document.getElementById('footer-total-supply');
    const taxTotalEl = document.getElementById('footer-total-tax');

    if (qtyTotalEl) qtyTotalEl.innerText = totalQty > 0 ? this.formatNumber(totalQty) : '0';
    if (supplyTotalEl) supplyTotalEl.innerText = totalSupply > 0 ? this.formatNumber(totalSupply) : '0';
    if (taxTotalEl) taxTotalEl.innerText = totalTax > 0 ? this.formatNumber(totalTax) : '0';

    // 합계 금액 바 갱신 (한글 + 숫자)
    const koreanAmountEl = document.getElementById('korean-total-amount');
    const numberAmountEl = document.getElementById('number-total-amount');

    const koreanText = this.numberToKorean(grandTotal);

    if (koreanAmountEl) {
      koreanAmountEl.innerText = koreanText !== '영' ? `일금 ${koreanText} 원정` : '일금 영 원정';
    }

    if (numberAmountEl) {
      numberAmountEl.innerText = `(₩ ${this.formatNumber(grandTotal)} )`;
    }
  }

  /**
   * 견적서 내용 전체 초기화
   */
  clearInvoice() {
    if (!confirm('견적서 내용을 모두 초기화하시겠습니까?')) return;
    this.data.docNo = '';
    this.data.recipient = '';
    this.data.items = [];
    this.data.note = '';
    const today = new Date();
    this.data.date = {
      year: String(today.getFullYear()),
      month: String(today.getMonth() + 1),
      day: String(today.getDate())
    };
    this.render();
  }

  /**
   * 브라우저 인쇄 실행
   */
  print() {
    window.print();
  }

  /**
   * 엑셀 호환 CSV 내보내기 (BOM UTF-8 포함)
   */
  exportToCSV() {
    let csv = '\uFEFF'; // 한글 엑셀 깨짐 방지용 BOM
    csv += `견적서\n`;
    csv += `문서번호,${this.data.docNo}\n`;
    csv += `견적일자,${this.data.date.year}-${this.data.date.month}-${this.data.date.day}\n`;
    csv += `수신자,${this.data.recipient} 귀하\n`;
    csv += `공급자,상호:${this.data.supplier.companyName},등록번호:${this.data.supplier.regNumber},대표자:${this.data.supplier.ceoName},전화:${this.data.supplier.tel}\n\n`;
    
    csv += `품명,규격,수량,단가,공급가액,세액,비고\n`;

    let totalQty = 0;
    let totalSupply = 0;
    let totalTax = 0;

    for (const item of this.data.items) {
      if (!item || !item.name) continue;
      const name = `"${(item.name || '').replace(/"/g, '""')}"`;
      const spec = `"${(item.spec || '').replace(/"/g, '""')}"`;
      const qty = item.qty || 0;
      const unit = item.unitPrice || 0;
      const supply = item.supplyPrice || 0;
      const tax = item.tax || 0;
      const remark = `"${(item.remark || '').replace(/"/g, '""')}"`;

      totalQty += qty;
      totalSupply += supply;
      totalTax += tax;

      csv += `${name},${spec},${qty},${unit},${supply},${tax},${remark}\n`;
    }

    csv += `합계,,${totalQty},,${totalSupply},${totalTax},\n`;
    csv += `총합계(공급가액+세액),,,,,${totalSupply + totalTax},\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `견적서_${this.data.recipient || '고객'}_${this.data.date.year}${this.data.date.month}${this.data.date.day}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 한글 표준 HWPX 문서로 내보내기
   */
  async exportToHWPX() {
    if (!window.hwpxGenerator) {
      alert('HWPX 생성 모듈이 로드되지 않았습니다.');
      return false;
    }
    try {
      const blob = await window.hwpxGenerator.generateHwpx(this.data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `견적서_${this.data.recipient || '고객'}_${this.data.date.year}${this.data.date.month}${this.data.date.day}.hwpx`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error('HWPX 생성 실패:', err);
      alert('HWPX 파일 생성 중 오류가 발생했습니다: ' + err.message);
      return false;
    }
  }

  /**
   * JSON 백업 내보내기
   */
  exportToJSON() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `견적서_${this.data.recipient || '데이터'}_${this.data.date.year}${this.data.date.month}${this.data.date.day}.json`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * JSON 백업 불러오기
   */
  importFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        this.data = {
          docNo: parsed.docNo || '',
          date: parsed.date || this.data.date,
          recipient: parsed.recipient || '',
          supplier: parsed.supplier || this.data.supplier,
          items: Array.isArray(parsed.items) ? parsed.items : [],
          note: parsed.note || ''
        };
        this.render();
        return true;
      }
    } catch (e) {
      console.error('JSON 가져오기 오류:', e);
    }
    return false;
  }
}

// 전역 인스턴스 등록
window.invoiceManager = new InvoiceManager();
