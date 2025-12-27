import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';

// ==========================================
// 1. 이벤트 리스너 등록 (안전하게 직접 연결)
// ==========================================
function setupEventListeners() {
    console.log("이벤트 리스너 등록 시작..."); // 디버깅용

    // [공통] 요소 가져오기 헬퍼
    const getEl = (id) => document.getElementById(id);

    // 1-1. 상/하차지 입력 시 자동완성 및 값 초기화
    const handleLocationInput = () => {
        const fromIn = getEl('from-center');
        const toIn = getEl('to-center');
        const typeIn = getEl('type');
        
        if(!fromIn || !toIn) return;

        const from = fromIn.value.trim();
        const to = toIn.value.trim();
        const type = typeIn.value;

        if((type === '화물운송' || type === '대기') && from && to) {
            const key = `${from}-${to}`;
            
            // 수입(운임)
            const incomeEl = getEl('income');
            if(incomeEl) {
                if(Data.MEM_FARES[key]) incomeEl.value = (Data.MEM_FARES[key]/10000).toFixed(2);
                else incomeEl.value = ''; 
            }

            // 운행거리
            const distEl = getEl('manual-distance');
            if(distEl) {
                if(Data.MEM_DISTANCES[key]) distEl.value = Data.MEM_DISTANCES[key];
                else distEl.value = '';
            }

            // 지출(운송비)
            const costEl = getEl('cost');
            if(costEl) {
                if(Data.MEM_COSTS[key]) costEl.value = (Data.MEM_COSTS[key]/10000).toFixed(2);
                else costEl.value = '';
            }
        }
        UI.updateAddressDisplay();
    };

    getEl('from-center')?.addEventListener('input', handleLocationInput);
    getEl('to-center')?.addEventListener('input', handleLocationInput);

    // 1-2. 메인 버튼 이벤트
    getEl('btn-register-trip')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
        // 입력된 시간 사용
        Data.addRecord({ 
            id: Date.now(), 
            date: getEl('date').value, 
            time: getEl('time').value, 
            ...formData 
        });
        Utils.showToast('등록되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('btn-start-trip')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
        // GPS 시간 사용
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData });
        Utils.showToast('운행 시작됨');
        UI.resetForm();
        // 날짜가 바뀌었을 수 있으므로 피커 갱신
        const statDate = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
        if(getEl('today-date-picker')) getEl('today-date-picker').value = statDate;
        updateAllDisplays();
    });

    getEl('btn-end-trip')?.addEventListener('click', () => {
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
        Utils.showToast('운행 종료됨');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('btn-trip-cancel')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData, type: '운행취소' });
        Utils.showToast('취소 처리됨');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('btn-save-general')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.type === '지출' || formData.type === '수입') { 
            if (formData.expenseItem) Data.updateExpenseItemData(formData.expenseItem); 
        }
        Data.addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        Utils.showToast('저장되었습니다.');
        UI.populateExpenseDatalist();
        UI.resetForm();
        updateAllDisplays();
        if(formData.type === '주유소') Stats.displaySubsidyRecords();
    });

    // 1-3. 수정 모드 버튼 이벤트
    getEl('btn-update-record')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            const original = Data.MEM_RECORDS[index];
            const formData = UI.getFormDataWithoutTime();
            
            // 자동완성 데이터 학습
            if (formData.type === '화물운송' && formData.from && formData.to) {
                const key = `${formData.from}-${formData.to}`;
                if(formData.distance > 0) Data.MEM_DISTANCES[key] = formData.distance;
                if(formData.income > 0) Data.MEM_FARES[key] = formData.income;
            }
            if (formData.type === '지출' || formData.type === '수입') { 
                if (formData.expenseItem) Data.updateExpenseItemData(formData.expenseItem); 
            }

            // 기존 날짜/시간 유지하면서 업데이트
            Data.MEM_RECORDS[index] = { ...original, ...formData, date: original.date, time: original.time };
            Data.saveData();
            
            Utils.showToast('수정 완료');
            UI.resetForm();
            
            // 해당 날짜로 이동해서 보여줌
            const statDate = Utils.getStatisticalDate(original.date, original.time);
            if(getEl('today-date-picker')) getEl('today-date-picker').value = statDate;
            
            updateAllDisplays();
        }
    });

    getEl('btn-delete-record')?.addEventListener('click', () => {
        if(confirm('정말 삭제하시겠습니까?')) {
            const id = parseInt(getEl('edit-id').value);
            const target = Data.MEM_RECORDS.find(r => r.id === id);
            let stayDate = getEl('today-date-picker').value;
            if(target) stayDate = Utils.getStatisticalDate(target.date, target.time);
            
            Data.removeRecord(id);
            UI.resetForm();
            
            if(getEl('today-date-picker')) getEl('today-date-picker').value = stayDate;
            updateAllDisplays();
        }
    });

    getEl('btn-cancel-edit')?.addEventListener('click', UI.resetForm);

    // [수정 모드] 현재 시간으로 운행 시작
    getEl('btn-edit-start-trip')?.addEventListener('click', () => {
        const nowTime = Utils.getCurrentTimeString();
        const nowDate = Utils.getTodayString();
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);

        if (index > -1) {
            Data.MEM_RECORDS[index].date = nowDate;
            Data.MEM_RECORDS[index].time = nowTime;
            Data.saveData();
            Utils.showToast('시작 시간이 현재로 변경됨');
            UI.resetForm();
            
            const statDate = Utils.getStatisticalDate(nowDate, nowTime);
            if(getEl('today-date-picker')) getEl('today-date-picker').value = statDate;
            updateAllDisplays();
        }
    });

    // [수정 모드] 현재 시간으로 운행 종료
    getEl('btn-edit-end-trip')?.addEventListener('click', () => {
        const nowTime = Utils.getCurrentTimeString();
        const nowDate = Utils.getTodayString();
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);

        if (index > -1 && Data.MEM_RECORDS[index].type === '운행종료') {
            // 이미 운행종료인 기록을 수정 중이면 시간만 업데이트
            Data.MEM_RECORDS[index].date = nowDate;
            Data.MEM_RECORDS[index].time = nowTime;
            Utils.showToast('종료 시간이 현재로 변경됨');
        } else {
            // 다른 기록 수정 중에 눌렀다면 새로 종료 기록 추가
            Data.addRecord({ id: Date.now(), date: nowDate, time: nowTime, type: '운행종료', distance: 0, cost: 0, income: 0 });
            Utils.showToast('운행 종료됨');
        }
        Data.saveData();
        UI.resetForm();
        
        const statDate = Utils.getStatisticalDate(nowDate, nowTime);
        if(getEl('today-date-picker')) getEl('today-date-picker').value = statDate;
        updateAllDisplays();
    });

    // 1-4. 기타 UI 이벤트
    getEl('refresh-btn')?.addEventListener('click', () => { UI.resetForm(); location.reload(); });
    getEl('today-date-picker')?.addEventListener('change', () => updateAllDisplays());
    
    getEl('prev-day-btn')?.addEventListener('click', () => {
        moveDate(-1);
    });
    getEl('next-day-btn')?.addEventListener('click', () => {
        moveDate(1);
    });

    // 설정 페이지 이동 (버튼 안눌림 해결)
    getEl('go-to-settings-btn')?.addEventListener('click', () => { 
        getEl('main-page').classList.add("hidden"); 
        getEl('settings-page').classList.remove("hidden"); 
        getEl('go-to-settings-btn').classList.add("hidden"); 
        getEl('back-to-main-btn').classList.remove("hidden"); 
        
        // 설정 페이지 열 때 데이터 갱신
        Stats.displayCumulativeData(); 
        Stats.displayCurrentMonthData(); 
        Stats.displaySubsidyRecords();
    });

    getEl('back-to-main-btn')?.addEventListener('click', () => { 
        getEl('main-page').classList.remove("hidden"); 
        getEl('settings-page').classList.add("hidden"); 
        getEl('go-to-settings-btn').classList.remove("hidden"); 
        getEl('back-to-main-btn').classList.add("hidden"); 
        updateAllDisplays(); 
    });

    // 아코디언 메뉴
    document.querySelectorAll('.collapsible-header').forEach(header => { 
        header.addEventListener("click", () => { 
            const body = header.nextElementSibling; 
            header.classList.toggle("active"); 
            body.classList.toggle("hidden"); 
            if (header.id === 'toggle-subsidy-management' && !body.classList.contains('hidden')) Stats.displaySubsidyRecords(false); 
            if (header.id === 'toggle-center-management' && !body.classList.contains('hidden')) UI.displayCenterList();
        }); 
    });

    // 뷰 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => { 
        btn.addEventListener("click", event => { 
            if(btn.parentElement.classList.contains('view-tabs')) { 
                event.preventDefault(); 
                document.querySelectorAll('.tab-btn').forEach(b => { if(b.parentElement.classList.contains('view-tabs')) b.classList.remove("active"); }); 
                btn.classList.add("active"); 
                document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active')); 
                const view = getEl(btn.dataset.view + "-view");
                if(view) view.classList.add("active"); 
                updateAllDisplays(); 
            } 
        });
    });

    // 기타 헬퍼
    getEl('fuel-unit-price')?.addEventListener('input', () => { 
        const p=parseFloat(getEl('fuel-unit-price').value)||0; 
        const l=parseFloat(getEl('fuel-liters').value)||0; 
        if(p&&l) getEl('cost').value=(p*l/10000).toFixed(2); 
    });
    
    getEl('type')?.addEventListener('change', UI.toggleUI);
    
    // 글로벌 함수 (HTML onclick="editRecord(..)" 대응)
    window.viewDateDetails = (date) => { 
        getEl('today-date-picker').value = date; 
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove("active")); 
        document.querySelector('.tab-btn[data-view="today"]').classList.add("active"); 
        document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active')); 
        getEl("today-view").classList.add("active"); 
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

// 2. 초기화 및 실행
function initialSetup() {
    Data.loadAllData(); // 데이터 먼저 로드
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist();
    
    // 날짜 초기화
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    const statToday = Utils.getStatisticalDate(todayStr, nowTime);
    const picker = document.getElementById('today-date-picker');
    if(picker) picker.value = statToday;

    // UI 초기화
    UI.resetForm();
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 데이터 표시
    updateAllDisplays();
    
    // OCR 등 나머지 초기화
    initOtherFeatures();
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
                    input.dispatchEvent(new Event('input'));
                }
            };
            container.appendChild(btn);
        });
    };

    buildButtons(topFrom, fromContainer, 'from-center');
    buildButtons(topTo, toContainer, 'to-center');
}

function initOtherFeatures() {
    // 년월 선택기
    const y = new Date().getFullYear();
    const yrs = []; for(let i=0; i<5; i++) yrs.push(`<option value="${y-i}">${y-i}년</option>`);
    ['daily-year-select', 'weekly-year-select', 'monthly-year-select', 'print-year-select'].forEach(id => {
        const el = document.getElementById(id); if(el) el.innerHTML = yrs.join('');
    });
    const ms = []; for(let i=1; i<=12; i++) ms.push(`<option value="${i.toString().padStart(2,'0')}">${i}월</option>`);
    ['daily-month-select', 'weekly-month-select', 'print-month-select'].forEach(id => {
        const el = document.getElementById(id); if(el) { el.innerHTML = ms.join(''); el.value = (new Date().getMonth()+1).toString().padStart(2,'0'); }
    });
    
    // 백업/복원
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
}

document.addEventListener("DOMContentLoaded", initialSetup);