import { formatToManwon, getStatisticalDate, getTodayString } from './utils.js';
import { MEM_RECORDS, MEM_LOCATIONS } from './data.js';
import { editRecord } from './ui.js';

let displayedSubsidyCount = 0;

function safeInt(value) {
    if (!value) return 0;
    const num = parseInt(String(value).replace(/,/g, ''), 10);
    return isNaN(num) ? 0 : num;
}

function safeFloat(value) {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

export function calculateTotalDuration(records) {
    const sorted = [...records].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    let totalMinutes = 0;
    if (sorted.length < 2) return '0h 0m';
    for (let i = 1; i < sorted.length; i++) {
        const curr = new Date(`${sorted[i].date}T${sorted[i].time}`);
        const prev = new Date(`${sorted[i-1].date}T${sorted[i-1].time}`);
        if (sorted[i-1].type !== '운행종료') {
            totalMinutes += (curr - prev) / 60000;
        }
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
}

export function createSummaryHTML(title, records) {
    const validRecords = records.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let totalIncome = 0, totalExpense = 0, totalDistance = 0, totalTripCount = 0;
    let totalFuelCost = 0, totalFuelLiters = 0;
    
    validRecords.forEach(r => {
        totalIncome += safeInt(r.income);
        totalExpense += safeInt(r.cost);
        if (r.type === '주유소') { 
            totalFuelCost += safeInt(r.cost); 
            totalFuelLiters += safeFloat(r.liters); 
        }
        if (['화물운송'].includes(r.type)) { 
            totalDistance += safeFloat(r.distance); 
            totalTripCount++; 
        }
    });

    const netIncome = totalIncome - totalExpense;
    
    const metrics = [
        { label: '수입', value: formatToManwon(totalIncome), unit: ' 만원', className: 'income' },
        { label: '지출', value: formatToManwon(totalExpense), unit: ' 만원', className: 'cost' },
        { label: '정산', value: formatToManwon(netIncome), unit: ' 만원', className: 'net' },
        { label: '운행거리', value: totalDistance.toFixed(1), unit: ' km' },
        { label: '운행건수', value: totalTripCount, unit: ' 건' },
        { label: '주유금액', value: formatToManwon(totalFuelCost), unit: ' 만원', className: 'cost' },
        { label: '주유리터', value: totalFuelLiters.toFixed(2), unit: ' L' },
    ];
    let itemsHtml = metrics.map(m => `<div class="summary-item"><span class="summary-label">${m.label}</span><span class="summary-value ${m.className || ''} hidden">${m.value}${m.unit}</span></div>`).join('');
    return `<strong>${title}</strong><div class="summary-toggle-grid" onclick="window.toggleAllSummaryValues(this)">${itemsHtml}</div>`;
}

export function displayTodayRecords(date) {
    const todayTbody = document.querySelector('#today-records-table tbody');
    const todaySummaryDiv = document.getElementById('today-summary');
    
    if(!todayTbody) return;

    const dayRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time) === date)
                                  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    
    todayTbody.innerHTML = '';
    const displayList = dayRecords.filter(r => r.type !== '운행종료');

    displayList.forEach(r => {
        const tr = document.createElement('tr');
        tr.onclick = () => editRecord(r.id);

        let timeDisplay = r.time;
        if(r.date !== date) { timeDisplay = `<span style="font-size:0.8em; color:#888;">(익일)</span> ${r.time}`; }

        let money = '';
        const inc = safeInt(r.income);
        const cst = safeInt(r.cost);

        if(inc > 0) money += `<span class="income">+${formatToManwon(inc)}</span> `;
        if(cst > 0) money += `<span class="cost">-${formatToManwon(cst)}</span>`;
        if(money === '') money = '0'; 

        const isTransport = (r.type === '화물운송' || r.type === '대기' || r.type === '운행취소');

        if (isTransport) {
            let endTime = '진행중';
            let duration = '-';
            const idx = MEM_RECORDS.findIndex(item => item.id === r.id);
            if (idx > -1 && idx < MEM_RECORDS.length - 1) {
                const next = MEM_RECORDS[idx + 1];
                if (next.date !== r.date) {
                    const monthDay = next.date.substring(5);
                    endTime = `<span style="font-size:0.8em; color:#888;">(${monthDay})</span><br>${next.time}`;
                } else {
                    endTime = next.time;
                }
                const startObj = new Date(`${r.date}T${r.time}`);
                const endObj = new Date(`${next.date}T${next.time}`);
                const diff = endObj - startObj;
                if (diff >= 0) {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                }
            }

            const fromVal = (r.from||'').replace(/"/g, '&quot;');
            const toVal = (r.to||'').replace(/"/g, '&quot;');
            const fromLoc = MEM_LOCATIONS[r.from] || {};
            const toLoc = MEM_LOCATIONS[r.to] || {};
            
            let fromCell = `<span class="location-clickable" data-center="${fromVal}">${r.from || ''}</span>`;
            if (fromLoc.memo) fromCell += `<span class="table-memo">${fromLoc.memo}</span>`;
            
            let toCell = `<span class="location-clickable" data-center="${toVal}">${r.to || ''}</span>`;
            if (toLoc.memo) toCell += `<span class="table-memo">${toLoc.memo}</span>`;
            
            let noteCell = '';
            if(r.distance) noteCell = `<span class="note">${safeFloat(r.distance)} km</span>`;
            if(r.type === '대기') noteCell = `<span class="note">대기중</span>`;
            if(r.type === '운행취소') noteCell = `<span class="note cancelled">취소됨</span>`;

            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td data-label="종료">${endTime}</td><td data-label="소요">${duration}</td><td data-label="상차">${fromCell}</td><td data-label="하차">${toCell}</td><td data-label="비고">${noteCell}</td><td data-label="금액">${money}</td>`;
        } else {
            const detail = r.expenseItem || r.supplyItem || r.brand || '';
            const content = `<span style="font-weight:bold; color:#555;">[${r.type}]</span>&nbsp;&nbsp;${detail}`;
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td colspan="5" data-label="" style="color:#333;">${content}</td><td data-label="금액">${money}</td>`;
        }
        todayTbody.appendChild(tr);
    });
    if(todaySummaryDiv) todaySummaryDiv.innerHTML = createSummaryHTML('오늘의 기록 (04시 기준)', dayRecords);
}

export function displayCurrentMonthData() {
    const now = new Date();
    let checkDate = new Date();
    if(checkDate.getHours() < 4) checkDate.setDate(checkDate.getDate() - 1);
    
    const currentPeriod = checkDate.toISOString().slice(0, 7); 
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(currentPeriod) && r.type !== '운행취소' && r.type !== '운행종료'); 
    
    const titleEl = document.getElementById('current-month-title');
    if(titleEl) titleEl.textContent = `${parseInt(currentPeriod.split('-')[1])}월 실시간 요약 (04시 기준)`; 
    
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0; 
    monthRecords.forEach(r => { 
        inc += safeInt(r.income); exp += safeInt(r.cost); 
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); } 
        if(r.type === '주유소') liters += safeFloat(r.liters); 
    }); 
    
    const days = new Set(monthRecords.map(r => getStatisticalDate(r.date, r.time))).size; 
    const net = inc - exp; 
    const avg = liters > 0 && dist > 0 ? (dist/liters).toFixed(2) : 0; 
    const costKm = dist > 0 ? Math.round(exp/dist) : 0; 
    
    // 안전하게 값 넣기
    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    set('current-month-operating-days', `${days} 일`); 
    set('current-month-trip-count', `${count} 건`); 
    set('current-month-total-mileage', `${dist.toFixed(1)} km`); 
    set('current-month-income', `${formatToManwon(inc)} 만원`); 
    set('current-month-expense', `${formatToManwon(exp)} 만원`); 
    set('current-month-net-income', `${formatToManwon(net)} 만원`); 
    set('current-month-avg-economy', `${avg} km/L`); 
    set('current-month-cost-per-km', `${costKm.toLocaleString()} 원`); 
    
    const limit = parseFloat(localStorage.getItem("fuel_subsidy_limit")) || 0; 
    const remain = limit - liters; 
    const pct = limit > 0 ? Math.min(100, 100 * liters / limit).toFixed(1) : 0; 
    const subSum = document.getElementById('subsidy-summary');
    if(subSum) subSum.innerHTML = `<div class="progress-label">월 한도: ${limit.toLocaleString()} L | 사용: ${liters.toFixed(1)} L | 잔여: ${remain.toFixed(1)} L</div><div class="progress-bar-container"><div class="progress-bar progress-bar-used" style="width: ${pct}%;"></div></div>`; 
}

export function displayCumulativeData() {
    const records = MEM_RECORDS.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0;
    records.forEach(r => {
        inc += safeInt(r.income); exp += safeInt(r.cost);
        if(r.type === '주유소') liters += safeFloat(r.liters);
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); }
    });
    
    const correction = parseFloat(localStorage.getItem("mileage_correction")) || 0;
    const totalDist = dist + correction;
    const net = inc - exp;
    const avg = liters > 0 && totalDist > 0 ? (totalDist/liters).toFixed(2) : 0;
    const costKm = totalDist > 0 ? Math.round(exp/totalDist) : 0;
    const days = new Set(records.map(r => getStatisticalDate(r.date, r.time))).size;
    
    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    set('cumulative-operating-days', `${days} 일`);
    set('cumulative-trip-count', `${count} 건`);
    set('cumulative-total-mileage', `${Math.round(totalDist).toLocaleString()} km`);
    set('cumulative-income', `${formatToManwon(inc)} 만원`);
    set('cumulative-expense', `${formatToManwon(exp)} 만원`);
    set('cumulative-net-income', `${formatToManwon(net)} 만원`);
    set('cumulative-avg-economy', `${avg} km/L`);
    set('cumulative-cost-per-km', `${costKm.toLocaleString()} 원`);
    
    renderMileageSummary();
}

export function renderMileageSummary(period = 'monthly') {
    const validRecords = MEM_RECORDS.filter(r => ['화물운송'].includes(r.type));
    let summaryData = {};
    if (period === 'monthly') {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const k = d.toISOString().slice(0, 7);
            summaryData[k] = 0;
        }
        validRecords.forEach(r => { 
            const statDate = getStatisticalDate(r.date, r.time);
            const k = statDate.substring(0, 7); 
            if (summaryData.hasOwnProperty(k)) summaryData[k]++; 
        });
    } else {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - (i * 7));
            const k = d.toISOString().slice(0, 10);
            summaryData[k] = 0;
        }
        validRecords.forEach(r => {
            const statDate = getStatisticalDate(r.date, r.time);
            const d = new Date(statDate); 
            d.setDate(d.getDate() - d.getDay() + 1);
            const k = d.toISOString().slice(0, 10);
            if (summaryData.hasOwnProperty(k)) summaryData[k]++;
        });
    }
    let h = '';
    for (const k in summaryData) {
        h += `<div class="metric-card"><span class="metric-label">${k}</span><span class="metric-value">${summaryData[k]} 건</span></div>`;
    }
    const container = document.getElementById('mileage-summary-cards');
    if(container) container.innerHTML = h;
}

// ... displayDailyRecords, displayWeeklyRecords, displayMonthlyRecords, displaySubsidyRecords, generatePrintView ... 
// (내용이 길어 생략된 함수들은 기존 로직과 동일합니다. import 경로만 잘 맞춰주세요)
// 아래 함수들은 파일 분리 시 필요한 나머지 부분입니다.

export function displayDailyRecords() {
    const yearSelect = document.getElementById('daily-year-select');
    const monthSelect = document.getElementById('daily-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value;
    const month = monthSelect.value;
    const selectedPeriod = `${year}-${month}`;
    const dailyTbody = document.querySelector('#daily-summary-table tbody');
    const dailySummaryDiv = document.getElementById('daily-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(dailyTbody) dailyTbody.innerHTML = '';
    if(dailySummaryDiv) {
        dailySummaryDiv.classList.remove('hidden');
        dailySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 총계 (04시 기준)`, monthRecords);
    }
    const recordsByDate = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        if(!recordsByDate[statDate]) recordsByDate[statDate] = { records: [], income: 0, expense: 0, distance: 0, tripCount: 0 };
        recordsByDate[statDate].records.push(r);
    });
    Object.keys(recordsByDate).sort().reverse().forEach(date => {
        const dayData = recordsByDate[date];
        const transport = dayData.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type));
        let inc = 0, exp = 0, dist = 0, count = 0;
        dayData.records.forEach(r => {
            if(r.type !== '운행종료' && r.type !== '운행취소') { inc += safeInt(r.income); exp += safeInt(r.cost); }
            if(r.type === '화물운송') { dist += safeFloat(r.distance); count++; }
        });
        if (count === 0) return;
        const tr = document.createElement('tr');
        if(date === getTodayString()) tr.style.fontWeight = 'bold';
        tr.innerHTML = `<td data-label="일">${parseInt(date.substring(8,10))}일</td><td data-label="수입"><span class="income">${formatToManwon(inc)}</span></td><td data-label="지출"><span class="cost">${formatToManwon(exp)}</span></td><td data-label="정산"><strong>${formatToManwon(inc-exp)}</strong></td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(transport)}</td><td data-label="관리"><button class="edit-btn" onclick="window.viewDateDetails('${date}')">상세</button></td>`;
        if(dailyTbody) dailyTbody.appendChild(tr);
    });
}

export function displayWeeklyRecords() {
    const yearSelect = document.getElementById('weekly-year-select');
    const monthSelect = document.getElementById('weekly-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value;
    const month = monthSelect.value;
    const selectedPeriod = `${year}-${month}`;
    const weeklyTbody = document.querySelector('#weekly-summary-table tbody');
    const weeklySummaryDiv = document.getElementById('weekly-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(weeklyTbody) weeklyTbody.innerHTML = '';
    if(weeklySummaryDiv) weeklySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 주별`, monthRecords);
    const weeks = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        const d = new Date(statDate);
        const w = Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay())) / 7);
        if(!weeks[w]) weeks[w] = [];
        weeks[w].push(r);
    });
    Object.keys(weeks).forEach(w => {
        const data = weeks[w];
        const transport = data.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type));
        let inc = 0, exp = 0, dist = 0, count = 0;
        data.forEach(r => { 
            if(r.type!=='운행종료'&&r.type!=='운행취소'){inc+=safeInt(r.income);exp+=safeInt(r.cost);} 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const dates = data.map(r => new Date(getStatisticalDate(r.date, r.time)).getDate());
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="주차">${w}주차</td><td data-label="기간">${Math.min(...dates)}일~${Math.max(...dates)}일</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="정산">${formatToManwon(inc-exp)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(transport)}</td>`;
        if(weeklyTbody) weeklyTbody.appendChild(tr);
    });
}

export function displayMonthlyRecords() {
    const yearSelect = document.getElementById('monthly-year-select');
    if(!yearSelect) return;
    const year = yearSelect.value;
    const monthlyTbody = document.querySelector('#monthly-summary-table tbody');
    const monthlyYearlySummaryDiv = document.getElementById('monthly-yearly-summary');
    const yearRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(year));
    if(monthlyYearlySummaryDiv) monthlyYearlySummaryDiv.innerHTML = createSummaryHTML(`${year}년`, yearRecords);
    if(monthlyTbody) monthlyTbody.innerHTML = '';
    const months = {};
    yearRecords.forEach(r => { 
        const statDate = getStatisticalDate(r.date, r.time);
        const m = statDate.substring(0,7); 
        if(!months[m]) months[m]={records:[]}; 
        months[m].records.push(r); 
    });
    Object.keys(months).sort().reverse().forEach(m => {
        const data = months[m];
        const transport = data.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type));
        let inc=0,exp=0,dist=0,count=0;
         data.records.forEach(r => { 
            if(r.type!=='운행종료'&&r.type!=='운행취소'){inc+=safeInt(r.income);exp+=safeInt(r.cost);} 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="월">${parseInt(m.substring(5))}월</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="정산">${formatToManwon(inc-exp)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(transport)}</td>`;
        if(monthlyTbody) monthlyTbody.appendChild(tr);
    });
}