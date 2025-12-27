import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';

// ==========================================
// 1. 이벤트 리스너 등록 (입력창 초기화 로직 포함)
// ==========================================
function setupEventListeners() {
    // [핵심 수정] 상차/하차 입력 시 기존 기록 없으면 값 초기화
    const handleLocationInput = () => {
        const from = UI.els.fromCenterInput.value.trim();
        const to = UI.els.toCenterInput.value.trim();
        const type = UI.els.typeSelect.value;

        if((type === '화물운송' || type === '대기') && from && to) {
            const key = `${from}-${to}`;
            
            // 수입(운임)
            if(Data.MEM_FARES[key]) UI.els.incomeInput.value = (Data.MEM_FARES[key]/10000).toFixed(2);
            else UI.els.incomeInput.value = ''; // 기록 없으면 초기화

            // 운행거리
            if(Data.MEM_DISTANCES[key]) UI.els.manualDistanceInput.value = Data.MEM_DISTANCES[key];
            else UI.els.manualDistanceInput.value = ''; // 기록 없으면 초기화

            // 지출(운송비)
            if(Data.MEM_COSTS[key]) UI.els.costInput.value = (Data.MEM_COSTS[key]/10000).toFixed(2);
            else UI.els.costInput.value = ''; // 기록 없으면 초기화
        }
        UI.updateAddressDisplay();
    };

    UI.els.fromCenterInput?.addEventListener('input', handleLocationInput);
    UI.els.toCenterInput?.addEventListener('input', handleLocationInput);

    // 버튼 이벤트들
    UI.els.btnRegisterTrip?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
        Data.addRecord({ id: Date.now(), date: UI.els.dateInput.value, time: UI.els.timeInput.value, ...formData });
        Utils.showToast('등록되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });

    UI.els.btnStartTrip?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData });
        Utils.showToast('저장되었습니다.');
        UI.resetForm();
        UI.els.dateInput.value = Utils.getTodayString(); // 날짜 리셋 방지
        updateAllDisplays();
    });

    UI.els.btnEndTrip?.addEventListener('click', () => {
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
        Utils.showToast('운행 종료되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });

    UI.els.btnTripCancel?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData, type: '운행취소' });
        Utils.showToast('저장되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });

    // 수정 모드: 현재 시간으로 시작
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
            updateAllDisplays();
        }
    });

    // ... (기타 기존 이벤트들 유지) ...
    
    // 글로벌 함수 등록 (HTML onclick 용)
    window.viewDateDetails = (date) => { 
        document.getElementById('today-date-picker').value = date; 
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove("active")); 
        document.querySelector('.tab-btn[data-view="today"]').classList.add("active"); 
        document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active')); 
        document.getElementById("today-view").classList.add("active"); 
        Stats.displayTodayRecords(date); 
    };
    
    window.toggleAllSummaryValues = (gridElement) => { 
        const items = gridElement.querySelectorAll('.summary-item'); 
        const isShowing = gridElement.classList.toggle('active'); 
        items.forEach(item => { 
            const valueEl = item.querySelector('.summary-value'); 
            if(isShowing) { item.classList.add('active'); valueEl.classList.remove('hidden'); } 
            else { item.classList.remove('active'); valueEl.classList.add('hidden'); } 
        }); 
    };
}

// 초기화
function initialSetup() {
    Data.loadAllData();
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist();
    
    // 날짜 선택기 설정
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    const statToday = Utils.getStatisticalDate(todayStr, nowTime);
    const picker = document.getElementById('today-date-picker');
    if(picker) picker.value = statToday;

    // 연도/월 채우기 등 기존 로직...
    const y = new Date().getFullYear();
    const yrs = []; for(let i=0; i<5; i++) yrs.push(`<option value="${y-i}">${y-i}년</option>`);
    ['daily-year-select', 'weekly-year-select', 'monthly-year-select', 'print-year-select'].forEach(id => {
        const el = document.getElementById(id); if(el) el.innerHTML = yrs.join('');
    });
    const ms = []; for(let i=1; i<=12; i++) ms.push(`<option value="${i.toString().padStart(2,'0')}">${i}월</option>`);
    ['daily-month-select', 'weekly-month-select', 'print-month-select'].forEach(id => {
        const el = document.getElementById(id); if(el) { el.innerHTML = ms.join(''); el.value = (new Date().getMonth()+1).toString().padStart(2,'0'); }
    });

    UI.resetForm();
    updateAllDisplays();
    setupEventListeners();
    renderFrequentLocationButtons();
}

function updateAllDisplays() {
    const picker = document.getElementById('today-date-picker');
    if(!picker) return;
    const targetDate = picker.value;
    
    Stats.displayTodayRecords(targetDate);
    Stats.displayDailyRecords();
    Stats.displayWeeklyRecords();
    Stats.displayMonthlyRecords();
    renderFrequentLocationButtons();
}

// 2주간 자주 방문한 장소 버튼
function renderFrequentLocationButtons() {
    const fromContainer = document.getElementById('top-from-centers');
    const toContainer = document.getElementById('top-to-centers');
    if (!fromContainer || !toContainer) return;

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const fromCounts = {}, toCounts = {};

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
            btn.onclick = () => {
                const input = document.getElementById(targetInputId);
                if(input) {
                    input.value = name;
                    input.dispatchEvent(new Event('input')); // 위에서 정의한 초기화 로직 트리거
                }
            };
            container.appendChild(btn);
        });
    };

    buildButtons(topFrom, fromContainer, 'from-center');
    buildButtons(topTo, toContainer, 'to-center');
}

document.addEventListener("DOMContentLoaded", initialSetup);