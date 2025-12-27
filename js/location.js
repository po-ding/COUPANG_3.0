import { els } from './ui.js';
import { 
    MEM_LOCATIONS, MEM_CENTERS, MEM_FARES, MEM_DISTANCES, 
    saveData, updateLocationData, MEM_RECORDS 
} from './data.js';

/** 권역 이름 판별 (수정 가능) */
function getRegionName(centerName) {
    if (!centerName) return "기타";
    const regions = ["인천", "용인", "안성", "이천", "안산", "시흥", "천안", "고양", "곤지암", "부천", "여주", "남양주"];
    for (const r of regions) {
        if (centerName.includes(r)) return r;
    }
    if (centerName.startsWith("X") || centerName.includes("HUB")) return "허브/센터";
    return "기타";
}

/** 퀵 버튼 렌더링 시스템 */
export function renderLocationButtons() {
    const container = document.getElementById('location-btn-container');
    if (!container) return;
    container.innerHTML = "";

    // 1. 전체 운송 기록에서 빈도 계산
    const freqMap = {};
    MEM_RECORDS.forEach(r => {
        if (r.from) freqMap[r.from] = (freqMap[r.from] || 0) + 1;
        if (r.to) freqMap[r.to] = (freqMap[r.to] || 0) + 1;
    });

    // 2. 방문 빈도순으로 정렬
    const sortedCenters = [...MEM_CENTERS].sort((a, b) => (freqMap[b] || 0) - (freqMap[a] || 0));

    // 3. 그룹화 (TOP 5 분리)
    const groups = { "자주 방문 (TOP 5)": sortedCenters.slice(0, 5) };
    sortedCenters.slice(5).forEach(center => {
        const region = getRegionName(center);
        if (!groups[region]) groups[region] = [];
        groups[region].push(center);
    });

    // 4. 권역별 버튼 생성
    Object.keys(groups).forEach(region => {
        if (groups[region].length === 0) return;

        const section = document.createElement('div');
        section.className = 'region-section';
        section.innerHTML = `<div class="region-title">${region}</div>`;

        const grid = document.createElement('div');
        grid.className = 'location-btn-grid';

        groups[region].forEach(center => {
            const locInfo = MEM_LOCATIONS[center] || {};
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'loc-quick-btn';
            
            let hint = "";
            if (locInfo.memo?.includes("(상")) hint = "🆙";
            else if (locInfo.memo?.includes("(하")) hint = "⬇️";
            
            btn.innerHTML = `${center}<small>${hint}</small>`;
            
            btn.onclick = () => {
                // 스마트 입력 시스템: 포커스 상태나 상차지 입력 여부에 따라 자동 할당
                const fIn = els.fromCenterInput;
                const tIn = els.toCenterInput;

                if (document.activeElement === tIn || (fIn.value && document.activeElement !== fIn)) {
                    tIn.value = center;
                } else {
                    fIn.value = center;
                }
                handleTransportInput();
            };
            grid.appendChild(btn);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
}

export function populateCenterDatalist() {
    els.centerDatalist.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
    renderLocationButtons();
}

export function handleTransportInput() {
    const from = els.fromCenterInput.value.trim();
    const to = els.toCenterInput.value.trim();
    
    if (from && to) {
        const key = `${from}-${to}`;
        if (MEM_FARES[key]) els.incomeInput.value = (MEM_FARES[key] / 10000).toFixed(2);
        if (MEM_DISTANCES[key]) els.manualDistanceInput.value = MEM_DISTANCES[key];
    }
    
    const fL = MEM_LOCATIONS[from] || {};
    const tL = MEM_LOCATIONS[to] || {};
    let html = '';
    if (fL.address) html += `<div class="address-clickable" data-address="${fL.address}">[상] ${fL.address}</div>`;
    if (tL.address) html += `<div class="address-clickable" data-address="${tL.address}">[하] ${tL.address}</div>`;
    els.addressDisplay.innerHTML = html;
}

export function displayCenterList() {
    const container = document.getElementById('center-list-container');
    container.innerHTML = MEM_CENTERS.map(c => `
        <div class="center-item" style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee;">
            <span>${c}</span>
            <button class="delete-btn" style="padding:4px 10px; font-size:0.8em; background:#dc3545; color:white; border:none; border-radius:4px;" onclick="window.deleteCenter('${c}')">삭제</button>
        </div>
    `).join('');
}