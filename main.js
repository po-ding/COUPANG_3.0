import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';

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

function renderFrequentLocationButtons() {
    const fromContainer = document.getElementById('top-from-centers');
    const toContainer = document.getElementById('top-to-centers');
    if (!fromContainer || !toContainer) return;

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const fromCounts = {};
    const toCounts = {};

    Data.MEM_RECORDS.forEach(r => {
        const recordDate = new Date(r.date);
        if ((r.type === '화물운송' || r.type === '대기') && recordDate >= twoWeeksAgo) {
            if (r.from) fromCounts[r.from] = (fromCounts[r.from] || 0) + 1;
            if (r.to) toCounts[r.to] = (toCounts[r.to] || 0) + 1;
        }
    });

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
                if(input) {
                    input.value = name;
                    input.dispatchEvent(new Event('input'));
                }
            };
            container.appendChild(btn);
        });
    };

    buildButtons(topFrom, fromContainer, 'from-center');
    buildButtons(topTo, toContainer, 'to-center');
}

function initialSetup() {
    Data.loadAllData();
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist();
    
    const y = new Date().getFullYear();
    const yrs = []; for(let i=0; i<5; i++) yrs.push(`<option value="${y-i}">${y-i}년</option>`);
    [document.getElementById('daily-year-select'), document.getElementById('weekly-year-select'), document.getElementById('monthly-year-select'), document.getElementById('print-year-select')].forEach(el => { if(el) el.innerHTML = yrs.join(''); });
    
    const ms = []; for(let i=1; i<=12; i++) ms.push(`<option value="${i.toString().padStart(2,'0')}">${i}월</option>`);
    [document.getElementById('daily-month-select'), document.getElementById('weekly-month-select'), document.getElementById('print-month-select')].forEach(el => { 
        if(el) { el.innerHTML = ms.join(''); el.value = (new Date().getMonth()+1).toString().padStart(2,'0'); }
    });

    const mC = document.getElementById('mileage-correction'); if(mC) mC.value = localStorage.getItem('mileage_correction') || 0;
    const sL = document.getElementById('subsidy-limit'); if(sL) sL.value = localStorage.getItem('fuel_subsidy_limit') || 0;
    
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    const statToday = Utils.getStatisticalDate(todayStr, nowTime);
    
    const picker = document.getElementById('today-date-picker');
    if(picker) picker.value = statToday;

    UI.resetForm();
    updateAllDisplays();

    // OCR 이벤트
    const ocrInput = document.getElementById('ocr-input');
    if (ocrInput) {
        ocrInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) UI.processReceiptImage(e.target.files[0]);
        });
    }
    // (OCR 나머지 리스너도 요소 확인 후 부착되도록 수정 생략 - 위 구조상 UI.js 내부는 이미 안전)
    
    // OCR 저장 버튼 등
    const btnSaveOcr = document.getElementById('btn-save-ocr');
    if (btnSaveOcr) {
        btnSaveOcr.addEventListener('click', () => {
            // ... (기존 OCR 저장 로직과 동일) ...
            // 내용이 길어 생략, 기존 코드 참조
            // 에러 안 나게 하려면 이 블록 안도 꼼꼼히 체크해야 함.
            const cost = parseInt(document.getElementById('ocr-cost')?.value) || 0;
            const liters = parseFloat(document.getElementById('ocr-liters')?.value) || 0;
            
            if (cost === 0 && liters === 0) { alert("금액이나 주유량이 올바르지 않습니다."); return; }

            Data.addRecord({
                id: Date.now(),
                date: document.getElementById('ocr-date')?.value || Utils.getTodayString(),
                time: document.getElementById('ocr-time')?.value || "12:00",
                type: '주유소',
                cost: cost,
                income: 0,
                distance: 0,
                liters: liters,
                unitPrice: parseInt(document.getElementById('ocr-price')?.value) || 0,
                subsidy: parseInt(document.getElementById('ocr-subsidy')?.value) || 0,
                brand: "기타"
            });
            Utils.showToast("영수증 내역이 저장되었습니다.");
            document.getElementById('btn-retry-ocr')?.click();
            updateAllDisplays();
            Stats.displaySubsidyRecords();
            Stats.displayCurrentMonthData();
        });
    }
    const btnRetryOcr = document.getElementById('btn-retry-ocr');
    if (btnRetryOcr) {
        btnRetryOcr.addEventListener('click', () => {
            ['ocr-date','ocr-time','ocr-cost','ocr-liters','ocr-price','ocr-subsidy','ocr-remaining','ocr-net-cost','ocr-input'].forEach(id => {
                const el = document.getElementById(id); if(el) el.value = '';
            });
            document.getElementById('ocr-result-container')?.classList.add('hidden');
            const status = document.getElementById('ocr-status'); if(status) status.textContent = '';
        });
    }
}

function updateAllDisplays() {
    const picker = document.getElementById('today-date-picker');
    if(!picker) return;
    const targetDate = picker.value || Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    
    Stats.displayTodayRecords(targetDate);
    Stats.displayDailyRecords();
    Stats.displayWeeklyRecords();
    Stats.displayMonthlyRecords();
    renderFrequentLocationButtons();
}

function moveDate(offset) {
    const picker = document.getElementById('today-date-picker');
    if (!picker || !picker.value) return;

    const parts = picker.value.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() + offset);

    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    
    picker.value = `${newY}-${newM}-${newD}`;
    Stats.displayTodayRecords(picker.value);
}

// *** 이벤트 리스너 안전하게 등록 (?. 사용) ***

// 1. 운행 취소
UI.els.btnTripCancel?.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData, type: '운행취소' });
    Utils.showToast('저장되었습니다.');
    UI.resetForm();
    const nowStatDate = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = nowStatDate;
    updateAllDisplays();
});

// 2. 운행 시작 (GPS 시간)
UI.els.btnStartTrip?.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
    Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData });
    Utils.showToast('저장되었습니다.');
    UI.resetForm();
    const nowStatDate = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = nowStatDate;
    updateAllDisplays();
});

// [추가] 2-1. 운행 등록 (시간 입력 안함)
UI.els.btnRegisterTrip?.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
    Data.addRecord({ id: Date.now(), date: UI.els.dateInput.value, time: UI.els.timeInput.value, ...formData });
    Utils.showToast('등록되었습니다.');
    UI.resetForm();
    const statDate = Utils.getStatisticalDate(UI.els.dateInput.value, UI.els.timeInput.value);
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = statDate;
    updateAllDisplays();
});

// 3. 운행 종료
UI.els.btnEndTrip?.addEventListener('click', () => {
    Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
    Utils.showToast('운행 종료되었습니다.');
    UI.resetForm();
    const nowStatDate = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = nowStatDate;
    updateAllDisplays();
});

// 4. 일반 저장
UI.els.btnSaveGeneral?.addEventListener('click', () => {
    const formData = UI.getFormDataWithoutTime();
    if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
    if (formData.type === '지출' || formData.type === '수입') { if (formData.expenseItem) Data.updateExpenseItemData(formData.expenseItem); }
    Data.addRecord({ id: Date.now(), date: UI.els.dateInput.value, time: UI.els.timeInput.value, ...formData });
    Utils.showToast('저장되었습니다.');
    UI.populateExpenseDatalist();
    const statDate = Utils.getStatisticalDate(UI.els.dateInput.value, UI.els.timeInput.value);
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = statDate;
    UI.resetForm();
    updateAllDisplays();
    if(formData.type === '주유소') Stats.displaySubsidyRecords();
});

// 5. 수정 완료
UI.els.btnUpdateRecord?.addEventListener('click', () => {
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
        if (formData.type === '지출' || formData.type === '수입') { if (formData.expenseItem) Data.updateExpenseItemData(formData.expenseItem); }
        Data.MEM_RECORDS[index] = { ...original, ...formData, date: original.date, time: original.time };
        Data.saveData();
        UI.populateExpenseDatalist();
        Utils.showToast('수정 완료.');
        const statDate = Utils.getStatisticalDate(original.date, original.time);
        if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = statDate;
        UI.resetForm();
        updateAllDisplays();
        if(formData.type === '주유소') Stats.displaySubsidyRecords();
    }
});

// 6. 현재 시간으로 종료 (수정 모드)
UI.els.btnEditEndTrip?.addEventListener('click', () => {
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
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = statDate;
    updateAllDisplays();
});

// [추가] 6-1. 현재 시간으로 시작 (수정 모드)
UI.els.btnEditStartTrip?.addEventListener('click', () => {
    const nowTime = Utils.getCurrentTimeString();
    const nowDate = Utils.getTodayString();
    const id = parseInt(UI.els.editIdInput.value);
    const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
    if (index > -1) {
        Data.MEM_RECORDS[index].date = nowDate;
        Data.MEM_RECORDS[index].time = nowTime;
        Data.saveData();
        Utils.showToast('시작 시간이 현재로 업데이트됨.');
        UI.resetForm();
        const statDate = Utils.getStatisticalDate(nowDate, nowTime);
        if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = statDate;
        updateAllDisplays();
    }
});

// 7. 삭제
UI.els.btnDeleteRecord?.addEventListener('click', () => {
    if(confirm('삭제하시겠습니까?')) {
        const id = parseInt(UI.els.editIdInput.value);
        const target = Data.MEM_RECORDS.find(r => r.id === id);
        let stayDate = document.getElementById('today-date-picker')?.value;
        if(target && !stayDate) stayDate = Utils.getStatisticalDate(target.date, target.time);
        Data.removeRecord(id);
        UI.resetForm();
        if(stayDate && document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = stayDate;
        updateAllDisplays();
    }
});

UI.els.btnCancelEdit?.addEventListener('click', UI.resetForm);

UI.els.addressDisplay?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); 
    if(e.target.classList.contains('address-clickable')) {
        Utils.copyTextToClipboard(e.target.dataset.address, '주소 복사됨');
    }
    return false;
});

[UI.els.fromCenterInput, UI.els.toCenterInput].forEach(input => {
    input?.addEventListener('input', () => {
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

UI.els.fuelUnitPriceInput?.addEventListener('input', () => { const p=parseFloat(UI.els.fuelUnitPriceInput.value)||0, l=parseFloat(UI.els.fuelLitersInput.value)||0; if(p&&l) UI.els.costInput.value=(p*l/10000).toFixed(2); });
UI.els.fuelLitersInput?.addEventListener('input', () => { const p=parseFloat(UI.els.fuelUnitPriceInput.value)||0, l=parseFloat(UI.els.fuelLitersInput.value)||0; if(p&&l) UI.els.costInput.value=(p*l/10000).toFixed(2); });
UI.els.typeSelect?.addEventListener('change', UI.toggleUI);

document.getElementById('refresh-btn')?.addEventListener('click', () => { UI.resetForm(); location.reload(); });
document.getElementById('today-date-picker')?.addEventListener('change', () => Stats.displayTodayRecords(document.getElementById('today-date-picker').value));
document.getElementById('prev-day-btn')?.addEventListener('click', () => moveDate(-1));
document.getElementById('next-day-btn')?.addEventListener('click', () => moveDate(1));

document.querySelector('#today-records-table tbody')?.addEventListener('click', (e) => {
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
            const view = document.getElementById(btn.dataset.view + "-view");
            if(view) view.classList.add("active"); 
            updateAllDisplays(); 
        } 
    }) 
});

const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const goToSettingsBtn = document.getElementById('go-to-settings-btn');
const backToMainBtn = document.getElementById('back-to-main-btn');

goToSettingsBtn?.addEventListener("click", () => { 
    mainPage.classList.add("hidden"); 
    settingsPage.classList.remove("hidden"); 
    goToSettingsBtn.classList.add("hidden"); 
    backToMainBtn.classList.remove("hidden"); 
    Stats.displayCumulativeData(); 
    Stats.displayCurrentMonthData(); 
});
backToMainBtn?.addEventListener("click", () => { 
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
    header?.addEventListener("click", () => { 
        const body = header.nextElementSibling; 
        header.classList.toggle("active"); 
        body.classList.toggle("hidden"); 
        if (header.id === 'toggle-subsidy-management' && !body.classList.contains('hidden')) Stats.displaySubsidyRecords(false); 
        if (header.id === 'toggle-center-management' && !body.classList.contains('hidden')) UI.displayCenterList();
    }); 
});

document.getElementById('center-search-input')?.addEventListener('input', () => UI.displayCenterList(document.getElementById('center-search-input').value));
document.getElementById('add-center-btn')?.addEventListener('click', () => { 
    const n = document.getElementById('new-center-name').value.trim(); 
    if(n) { 
        UI.addCenter(n, document.getElementById('new-center-address').value.trim(), document.getElementById('new-center-memo').value.trim()); 
        document.getElementById('new-center-name').value=''; 
        document.getElementById('new-center-address').value=''; 
        document.getElementById('new-center-memo').value=''; 
        UI.displayCenterList(document.getElementById('center-search-input').value); 
    } 
});

document.getElementById('batch-apply-btn')?.addEventListener("click", () => { 
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

document.getElementById('subsidy-save-btn')?.addEventListener('click', () => { localStorage.setItem('fuel_subsidy_limit', document.getElementById('subsidy-limit').value); Utils.showToast('저장됨'); });
document.getElementById('mileage-correction-save-btn')?.addEventListener('click', () => { localStorage.setItem('mileage_correction', document.getElementById('mileage-correction').value); Utils.showToast('저장됨'); Stats.displayCumulativeData(); });

document.getElementById('export-json-btn')?.addEventListener('click', () => { 
    const data = { records: Data.MEM_RECORDS, centers: Data.MEM_CENTERS, locations: Data.MEM_LOCATIONS, fares: Data.MEM_FARES, distances: Data.MEM_DISTANCES, costs: Data.MEM_COSTS, subsidy: localStorage.getItem('fuel_subsidy_limit'), correction: localStorage.getItem('mileage_correction'), expenseItems: Data.MEM_EXPENSE_ITEMS }; 
    const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); 
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download=`backup_${Utils.getTodayString()}.json`; 
    document.body.appendChild(a); a.click(); document.body.removeChild(a); 
});
document.getElementById('import-json-btn')?.addEventListener('click', () => document.getElementById('import-file-input').click());
document.getElementById('import-file-input')?.addEventListener('change', (e) => { 
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
document.getElementById('clear-btn')?.addEventListener('click', () => { if(confirm('전체삭제?')) { localStorage.clear(); location.reload(); }});

const getPrintEls = () => ({ y: document.getElementById('print-year-select').value, m: document.getElementById('print-month-select').value });
document.getElementById('print-first-half-btn')?.addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'first', false) });
document.getElementById('print-second-half-btn')?.addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'second', false) });
document.getElementById('print-full-month-btn')?.addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'full', false) });
document.getElementById('print-first-half-detail-btn')?.addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'first', true) });
document.getElementById('print-second-half-detail-btn')?.addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'second', true) });
document.getElementById('print-full-month-detail-btn')?.addEventListener('click', () => { const p = getPrintEls(); Stats.generatePrintView(p.y, p.m, 'full', true) });

document.getElementById('mileage-summary-controls')?.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.target.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        Stats.renderMileageSummary(e.target.dataset.period);
    });
});

document.addEventListener("DOMContentLoaded", initialSetup);