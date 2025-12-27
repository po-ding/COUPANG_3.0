// --- START OF FILE js/main.js ---

import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';

// 전역 윈도우 객체에 할당 (HTML onclick 속성에서 호출하기 위함)
window.viewDateDetails = function(date) { 
    document.getElementById('today-date-picker').value = date; 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove("active")); 
    document.querySelector('.tab-btn[data-view="today"]').classList.add("active"); 
    document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active')); 
    document.getElementById("today-view").classList.add("active"); 
    Stats.displayTodayRecords(date); 
};

window.toggleAllSummaryValues = function(gridElement) { 
    const items = gridElement.querySelectorAll('.summary-item'); 
    const isShowing = gridElement.classList.toggle('active'); 
    items.forEach(item => { 
        const valueEl = item.querySelector('.summary-value'); 
        if(isShowing) { item.classList.add('active'); valueEl.classList.remove('hidden'); } 
        else { item.classList.remove('active'); valueEl.classList.add('hidden'); } 
    }); 
};

// [추가] 최근 2주 기준 자주 방문한 장소 버튼 생성 함수
function renderFrequentLocationButtons() {
    const fromContainer = document.getElementById('top-from-centers');
    const toContainer = document.getElementById('top-to-centers');
    if (!fromContainer || !toContainer) return;

    // 최근 14일 기준 설정
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const fromCounts = {};
    const toCounts = {};

    Data.MEM_RECORDS.forEach(r => {
        const recordDate = new Date(r.date);
        // 1. 화물운송/대기 타입일 것  2. 최근 14일 이내일 것
        if ((r.type === '화물운송' || r.type === '대기') && recordDate >= twoWeeksAgo) {
            if (r.from) fromCounts[r.from] = (fromCounts[r.from] || 0) + 1;
            if (r.to) toCounts[r.to] = (toCounts[r.to] || 0) + 1;
        }
    });

    // 상위 5개 추출 (내림차순 정렬)
    const topFrom = Object.entries(fromCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topTo = Object.entries(toCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const buildButtons = (data, container, targetInputId) => {
        container.innerHTML = '';
        data.forEach(([name]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-loc-btn';
            btn.textContent = name;
            btn.title = name;
            btn.onclick = () => {
                const input = document.getElementById(targetInputId);
                input.value = name;
                input.dispatchEvent(new Event('input')); // 기존 주소/운임 자동입력 트리거
            };
            container.appendChild(btn);
        });
    };

    buildButtons(topFrom, fromContainer, 'from-center');
    buildButtons(topTo, toContainer, 'to-center');
}

// 초기화 함수
function initialSetup() {
    Data.loadAllData();
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist(); // 지출/수입 항목 자동완성 로드
    
    // 날짜 선택기(년/월) 초기화
    const y = new Date().getFullYear();
    const yrs = []; for(let i=0; i<5; i++) yrs.push(`<option value="${y-i}">${y-i}년</option>`);
    [document.getElementById('daily-year-select'), document.getElementById('weekly-year-select'), document.getElementById('monthly-year-select'), document.getElementById('print-year-select')].forEach(el => el.innerHTML = yrs.join(''));
    
    const ms = []; for(let i=1; i<=12; i++) ms.push(`<option value="${i.toString().padStart(2,'0')}">${i}월</option>`);
    [document.getElementById('daily-month-select'), document.getElementById('weekly-month-select'), document.getElementById('print-month-select')].forEach(el => { 
        el.innerHTML = ms.join(''); 
        el.value = (new Date().getMonth()+1).toString().padStart(2,'0'); 
    });

    // 설정값 로드
    document.getElementById('mileage-correction').value = localStorage.getItem('mileage_correction') || 0;
    document.getElementById('subsidy-limit').value = localStorage.getItem('fuel_subsidy_limit') || 0;
    
    // 오늘 날짜 설정 (04시 기준)
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    const statToday = Utils.getStatisticalDate(todayStr, nowTime);
    
    document.getElementById('today-date-picker').value = statToday;

    UI.resetForm();
    updateAllDisplays();

    // [OCR] 파일 입력 이벤트 리스너
    const ocrInput = document.getElementById('ocr-input');
    if (ocrInput) {
        ocrInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                UI.processReceiptImage(e.target.files[0]);
            }
        });
    }

    // [OCR] 실시간 금액 계산 로직
    const updateCalculations = () => {
        const lit = parseFloat(document.getElementById('ocr-liters').value) || 0;
        const price = parseInt(document.getElementById('ocr-price').value) || 0;
        let cost = parseInt(document.getElementById('ocr-cost').value) || 0;

        if (document.activeElement === document.getElementById('ocr-liters') || 
            document.activeElement === document.getElementById('ocr-price')) {
            if (lit > 0 && price > 0) {
                cost = Math.round(lit * price);
                document.getElementById('ocr-cost').value = cost;
            }
        } else {
            cost = parseInt(document.getElementById('ocr-cost').value) || 0;
        }

        const subsidy = parseInt(document.getElementById('ocr-subsidy').value) || 0;
        document.getElementById('ocr-net-cost').value = cost - subsidy;
    };
    
    const ocrIds = ['ocr-cost', 'ocr-liters', 'ocr-price', 'ocr-subsidy'];
    ocrIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateCalculations);
    });

    // [OCR] 재인식(초기화) 버튼
    const btnRetryOcr = document.getElementById('btn-retry-ocr');
    if (btnRetryOcr) {
        btnRetryOcr.addEventListener('click', () => {
            document.getElementById('ocr-date').value = '';
            document.getElementById('ocr-time').value = '';
            document.getElementById('ocr-cost').value = '';
            document.getElementById('ocr-liters').value = '';
            document.getElementById('ocr-price').value = '';
            document.getElementById('ocr-subsidy').value = '';
            document.getElementById('ocr-remaining').value = '';
            document.getElementById('ocr-net-cost').value = '';
            
            document.getElementById('ocr-input').value = '';
            document.getElementById('ocr-result-container').classList.add('hidden');
            document.getElementById('ocr-status').textContent = '';
        });
    }

    // [OCR] 저장하기 버튼
    const btnSaveOcr = document.getElementById('btn-save-ocr');
    if (btnSaveOcr) {
        btnSaveOcr.addEventListener('click', () => {
            const date = document.getElementById('ocr-date').value || Utils.getTodayString();
            const time = document.getElementById('ocr-time').value || "12:00";
            const cost = parseInt(document.getElementById('ocr-cost').value) || 0;
            const liters = parseFloat(document.getElementById('ocr-liters').value) || 0;
            const unitPrice = parseInt(document.getElementById('ocr-price').value) || 0;
            const subsidy = parseInt(document.getElementById('ocr-subsidy').value) || 0;
            const brand = "기타"; 

            if (cost === 0 && liters === 0) {
                alert("금액이나 주유량이 올바르지 않습니다.");
                return;
            }

            Data.addRecord({
                id: Date.now(),
                date: date,
                time: time,
                type: '주유소',
                cost: cost,
                income: 0,
                distance: 0,
                liters: liters,
                unitPrice: unitPrice,
                subsidy: subsidy,
                brand: brand
            });

            Utils.showToast("영수증 내역이 저장되었습니다.");
            btnRetryOcr.click(); 
            
            updateAllDisplays();
            Stats.displaySubsidyRecords();
            Stats.displayCurrentMonthData();
        });
    }
}

function updateAllDisplays() {
    const picker = document.getElementById('today-date-picker');
    const targetDate = picker.value || Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    
    Stats.displayTodayRecords(targetDate);
    Stats.displayDailyRecords();
    Stats.displayWeeklyRecords();
    Stats.displayMonthlyRecords();

    renderFrequentLocationButtons(); // [추가] 데이터 변경 시 버튼 최신화
}

function moveDate(offset) {
    const picker = document.getElementById('today-date-picker');
    if (!picker.value) picker.value = Utils.getTodayString();

    const parts = picker.value.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() + offset);

    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    const newDateStr = `${newY}-${newM}-${newD}`;

    picker.value = newDateStr;
    Stats.displayTodayRecords(newDateStr);
}

// 1. 운행 취소
UI.els.btnTripCancel.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData, type: '운행취소' });
    Utils.showToast('저장되었습니다.');
    UI.resetForm();
    
    const nowStatDate = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    document.getElementById('today-date-picker').value = nowStatDate;
    updateAllDisplays();
});

// 2. 운행 시작 (GPS 시간 사용)
UI.els.btnStartTrip.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    
    if (formData.type === '화물운송' && formData.distance <= 0) {
        alert('운행거리를 입력해주세요.');
        return;
    }

    Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData });
    Utils.showToast('저장되었습니다.');
    UI.resetForm();
    
    const nowStatDate = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    document.getElementById('today-date-picker').value = nowStatDate;
    updateAllDisplays();
});

// [추가] 2-1. 운행 등록 (시간 입력 안함 -> 입력된 값 사용 또는 미입력시 유지)
UI.els.btnRegisterTrip.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    
    if (formData.type === '화물운송' && formData.distance <= 0) {
        alert('운행거리를 입력해주세요.');
        return;
    }

    // 운행 등록은 GPS 시간을 강제하지 않고, 현재 입력 양식에 있는 시간을 사용 (사용자가 별도 입력 안했다면 그 값 그대로)
    Data.addRecord({ 
        id: Date.now(), 
        date: UI.els.dateInput.value, 
        time: UI.els.timeInput.value, // 입력된 시간 사용
        ...formData 
    });
    
    Utils.showToast('등록되었습니다.');
    UI.resetForm();
    
    const statDate = Utils.getStatisticalDate(UI.els.dateInput.value, UI.els.timeInput.value);
    document.getElementById('today-date-picker').value = statDate;
    updateAllDisplays();
});

// 3. 운행 종료
UI.els.btnEndTrip.addEventListener('click', () => {
    Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
    Utils.showToast('운행 종료되었습니다.');
    UI.resetForm();
    
    const nowStatDate = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    document.getElementById('today-date-picker').value = nowStatDate;
    updateAllDisplays();
});

// 4. 일반 저장
UI.els.btnSaveGeneral.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    
    if (formData.type === '화물운송' && formData.distance <= 0) {
        alert('운행거리를 입력해주세요.');
        return;
    }

    if (formData.type === '지출' || formData.type === '수입') {
        if (formData.expenseItem) Data.updateExpenseItemData(formData.expenseItem);
    }

    Data.addRecord({ id: Date.now(), date: UI.els.dateInput.value, time: UI.els.timeInput.value, ...formData });
    Utils.showToast('저장되었습니다.');
    
    UI.populateExpenseDatalist();

    const statDate = Utils.getStatisticalDate(UI.els.dateInput.value, UI.els.timeInput.value);
    document.getElementById('today-date-picker').value = statDate;
    
    UI.resetForm();
    updateAllDisplays();
    
    if(formData.type === '주유소') Stats.displaySubsidyRecords();
});

// 5. 수정 완료
UI.els.btnUpdateRecord.addEventListener('click', () => {
    const id = parseInt(UI.els.editIdInput.value);
    const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
    if (index > -1) {
        const original = Data.MEM_RECORDS[index];
        const formData = UI.getFormDataWithoutTime();
        
        if (formData.type === '화물운송' && formData.from && formData.to) {
            const key = `${formData.from}-${formData.to}`;
            if(formData.distance > 0) Data.MEM_DISTANCES[key] = formData.distance;
            if(formData.income > 0) Data.MEM_FARES[key] = formData.income;
        }
        
        if (formData.type === '지출' || formData.type === '수입') {
            if (formData.expenseItem) Data.updateExpenseItemData(formData.expenseItem);
        }

        Data.MEM_RECORDS[index] = { ...original, ...formData, date: original.date, time: original.time };
        Data.saveData();
        UI.populateExpenseDatalist();
        Utils.showToast('수정 완료.');
        
        const statDate = Utils.getStatisticalDate(original.date, original.time);
        document.getElementById('today-date-picker').value = statDate;
        
        UI.resetForm();
        updateAllDisplays();
        if(formData.type === '주유소') Stats.displaySubsidyRecords();
    }
});

// 6. 현재 시간으로 종료
UI.els.btnEditEndTrip.addEventListener('click', () => {
    const nowTime = Utils.getCurrentTimeString();
    const nowDate = Utils.getTodayString();
    const id = parseInt(UI.els.editIdInput.value);
    const index = Data.MEM_RECORDS.findIndex(r => r.id === id);

    if (index > -1 && Data.MEM_RECORDS[index].type === '운행종료') {
        Data.MEM_RECORDS[index].date = nowDate;
        Data.MEM_RECORDS[index].time = nowTime;
        Utils.showToast('종료 시간이 현재로 업데이트됨.');
    } else {
        Data.addRecord({ id: Date.now(), date: nowDate, time: nowTime, type: '운행종료', distance: 0, cost: 0, income: 0 });
        Utils.showToast('운행 종료되었습니다.');
    }
    
    Data.saveData();
    UI.resetForm();
    const statDate = Utils.getStatisticalDate(nowDate, nowTime);
    document.getElementById('today-date-picker').value = statDate;
    updateAllDisplays();
});

// 7. 삭제
UI.els.btnDeleteRecord.addEventListener('click', () => {
    if(confirm('삭제하시겠습니까?')) {
        const id = parseInt(UI.els.editIdInput.value);
        const target = Data.MEM_RECORDS.find(r => r.id === id);
        let stayDate = document.getElementById('today-date-picker').value;
        if(target) stayDate = Utils.getStatisticalDate(target.date, target.time);

        Data.removeRecord(id);
        UI.resetForm();
        document.getElementById('today-date-picker').value = stayDate;
        updateAllDisplays();
    }
});

UI.els.btnCancelEdit.addEventListener('click', UI.resetForm);

UI.els.addressDisplay.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); 
    if(e.target.classList.contains('address-clickable')) {
        Utils.copyTextToClipboard(e.target.dataset.address, '주소 복사됨');
    }
    return false;
});

[UI.els.fromCenterInput, UI.els.toCenterInput].forEach(input => {
    input.addEventListener('input', () => {
        const from = UI.els.fromCenterInput.value.trim();
        const to = UI.els.toCenterInput.value.trim();
        if((UI.els.typeSelect.value === '화물운송' || UI.els.typeSelect.value === '대기') && from && to) {
            const key = `${from}-${to}`;
            if(Data.MEM_FARES[key]) UI.els.incomeInput.value = (Data.MEM_FARES[key]/10000).toFixed(2);
            if(Data.MEM_DISTANCES[key]) UI.els.manualDistanceInput.value = Data.MEM_DISTANCES[key];
            if(Data.MEM_COSTS[key]) UI.els.costInput.value = (Data.MEM_COSTS[key]/10000).toFixed(2);
        }
        UI.updateAddressDisplay();
    });
});

UI.els.fuelUnitPriceInput.addEventListener('input', () => { const p=parseFloat(UI.els.fuelUnitPriceInput.value)||0, l=parseFloat(UI.els.fuelLitersInput.value)||0; if(p&&l) UI.els.costInput.value=(p*l/10000).toFixed(2); });
UI.els.fuelLitersInput.addEventListener('input', () => { const p=parseFloat(UI.els.fuelUnitPriceInput.value)||0, l=parseFloat(UI.els.fuelLitersInput.value)||0; if(p&&l) UI.els.costInput.value=(p*l/10000).toFixed(2); });
UI.els.typeSelect.addEventListener('change', UI.toggleUI);

document.getElementById('refresh-btn').addEventListener('click', () => { UI.resetForm(); location.reload(); });
document.getElementById('today-date-picker').addEventListener('change', () => Stats.displayTodayRecords(document.getElementById('today-date-picker').value));
document.getElementById('prev-day-btn').addEventListener('click', () => moveDate(-1));
document.getElementById('next-day-btn').addEventListener('click', () => moveDate(1));

document.querySelector('#today-records-table tbody').addEventListener('click', (e) => {
    const target = e.target.closest('.location-clickable');
    if(target) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); 
        const center = target.getAttribute('data-center');
        if(center) {
            const loc = Data.MEM_LOCATIONS[center];
            if(loc && loc.address) Utils.copyTextToClipboard(loc.address, '주소 복사됨');
            else Utils.copyTextToClipboard(center, '이름 복사됨');
        }
        return false;
    }
});

document.querySelectorAll('.tab-btn').forEach(btn => { 
    btn.addEventListener("click", event => { 
        if(btn.parentElement.classList.contains('view-tabs')) { 
            event.preventDefault(); 
            document.querySelectorAll('.tab-btn').forEach(b => { if(b.parentElement.classList.contains('view-tabs')) b.classList.remove("active"); }); 
            btn.classList.add("active"); 
            document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active')); 
            document.getElementById(btn.dataset.view + "-view").classList.add("active"); 
            updateAllDisplays(); 
        } 
    }) 
});

const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const goToSettingsBtn = document.getElementById('go-to-settings-btn');
const backToMainBtn = document.getElementById('back-to-main-btn');

goToSettingsBtn.addEventListener("click", () => { 
    mainPage.classList.add("hidden"); 
    settingsPage.classList.remove("hidden"); 
    goToSettingsBtn.classList.add("hidden"); 
    backToMainBtn.classList.remove("hidden"); 
    Stats.displayCumulativeData(); 
    Stats.displayCurrentMonthData(); 
});
backToMainBtn.addEventListener("click", () => { 
    mainPage.classList.remove("hidden"); 
    settingsPage.classList.add("hidden"); 
    goToSettingsBtn.classList.remove("hidden"); 
    backToMainBtn.classList.add("hidden"); 
    updateAllDisplays(); 
});

[document.getElementById('toggle-center-management'), document.getElementById('toggle-batch-apply'), 
 document.getElementById('toggle-subsidy-management'), document.getElementById('toggle-mileage-management'), 
 document.getElementById('toggle-data-management'), document.getElementById('toggle-print-management')]
.forEach(header => { 
    header.addEventListener("click", () => { 
        const body = header.nextElementSibling; 
        header.classList.toggle("active"); 
        body.classList.toggle("hidden"); 
        if (header.id === 'toggle-subsidy-management' && !body.classList.contains('hidden')) Stats.displaySubsidyRecords(false); 
        if (header.id === 'toggle-center-management' && !body.classList.contains('hidden')) UI.displayCenterList();
    }); 
});

document.getElementById('center-search-input').addEventListener('input', () => UI.displayCenterList(document.getElementById('center-search-input').value));
document.getElementById('add-center-btn').addEventListener('click', () => { 
    const n = document.getElementById('new-center-name').value.trim(); 
    if(n) { 
        UI.addCenter(n, document.getElementById('new-center-address').value.trim(), document.getElementById('new-center-memo').value.trim()); 
        document.getElementById('new-center-name').value=''; 
        document.getElementById('new-center-address').value=''; 
        document.getElementById('new-center-memo').value=''; 
        UI.displayCenterList(document.getElementById('center-search-input').value); 
    } 
});

document.getElementById('batch-apply-btn').addEventListener("click", () => { 
    const from = document.getElementById('batch-from-center').value.trim(); 
    const to = document.getElementById('batch-to-center').value.trim(); 
    const income = parseFloat(document.getElementById('batch-income').value) || 0; 
    if (!from || !to || income <= 0) { alert("값을 확인해주세요."); return; } 
    if (confirm(`${from}->${to} 구간 미정산 기록을 ${income}만원으로 일괄 적용할까요?`)) { 
        let count = 0; 
        const newRecords = Data.MEM_RECORDS.map(r => { 
            if (r.type === '화물운송' && r.from === from && r.to === to && r.income === 0) { count++; return { ...r, income: income * 10000 }; } 
            return r; 
        }); 
        Data.setRecords(newRecords); Data.saveData(); 
        document.getElementById('batch-status').textContent = `${count}건 적용됨`; 
        setTimeout(() => document.getElementById('batch-status').textContent = "", 3000); 
    } 
});

document.getElementById('subsidy-save-btn').addEventListener('click', () => { localStorage.setItem('fuel_subsidy_limit', document.getElementById('subsidy-limit').value); Utils.showToast('저장됨'); });
document.getElementById('mileage-correction-save-btn').addEventListener('click', () => { localStorage.setItem('mileage_correction', document.getElementById('mileage-correction').value); Utils.showToast('저장됨'); Stats.displayCumulativeData(); });

document.getElementById('export-json-btn').addEventListener('click', () => { 
    const data = { records: Data.MEM_RECORDS, centers: Data.MEM_CENTERS, locations: Data.MEM_LOCATIONS, fares: Data.MEM_FARES, distances: Data.MEM_DISTANCES, costs: Data.MEM_COSTS, subsidy: localStorage.getItem('fuel_subsidy_limit'), correction: localStorage.getItem('mileage_correction'), expenseItems: Data.MEM_EXPENSE_ITEMS }; 
    const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); 
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download=`backup_${Utils.getTodayString()}.json`; 
    document.body.appendChild(a); a.click(); document.body.removeChild(a); 
});
document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
document.getElementById('import-file-input').addEventListener('change', (e) => { 
    if(!confirm('덮어쓰시겠습니까?')) return; 
    const r = new FileReader(); 
    r.onload = (evt) => { 
        const d = JSON.parse(evt.target.result); 
        if(d.records) localStorage.setItem('records', JSON.stringify(d.records)); 
        if(d.centers) localStorage.setItem('logistics_centers', JSON.stringify(d.centers)); 
        if(d.locations) localStorage.setItem('saved_locations', JSON.stringify(d.locations)); 
        if(d.fares) localStorage.setItem('saved_fares', JSON.stringify(d.fares)); 
        if(d.distances) localStorage.setItem('saved_distances', JSON.stringify(d.distances)); 
        if(d.costs) localStorage.setItem('saved_costs', JSON.stringify(d.costs)); 
        if(d.subsidy) localStorage.setItem('fuel_subsidy_limit', d.subsidy); 
        if(d.correction) localStorage.setItem('mileage_correction', d.correction); 
        if(d.expenseItems) localStorage.setItem('saved_expense_items', JSON.stringify(d.expenseItems));
        alert('복원완료'); location.reload(); 
    }; 
    r.readAsText(e.target.files[0]); 
});
document.getElementById('clear-btn').addEventListener('click', () => { if(confirm('전체삭제?')) { localStorage.clear(); location.reload(); }});

const getPrintEls = () => ({ y: document.getElementById('print-year-select').value, m: document.getElementById('print-month-select').value });
document.getElementById('print-first-half-btn').addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'first', false) });
document.getElementById('print-second-half-btn').addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'second', false) });
document.getElementById('print-full-month-btn').addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'full', false) });
document.getElementById('print-first-half-detail-btn').addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'first', true) });
document.getElementById('print-second-half-detail-btn').addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'second', true) });
document.getElementById('print-full-month-detail-btn').addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'full', true) });

document.getElementById('mileage-summary-controls').querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.target.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        Stats.renderMileageSummary(e.target.dataset.period);
    });
});

document.addEventListener("DOMContentLoaded", initialSetup);