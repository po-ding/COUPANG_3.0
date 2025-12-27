// --- START OF FILE js/ui.js ---

import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, updateLocationData, saveData, MEM_RECORDS, MEM_EXPENSE_ITEMS } from './data.js';

export const els = {
    recordForm: document.getElementById('record-form'),
    dateInput: document.getElementById('date'),
    timeInput: document.getElementById('time'),
    typeSelect: document.getElementById('type'),
    fromCenterInput: document.getElementById('from-center'),
    toCenterInput: document.getElementById('to-center'),
    centerDatalist: document.getElementById('center-list'),
    manualDistanceInput: document.getElementById('manual-distance'),
    addressDisplay: document.getElementById('address-display'),
    transportDetails: document.getElementById('transport-details'),
    fuelDetails: document.getElementById('fuel-details'),
    expenseDetails: document.getElementById('expense-details'),
    supplyDetails: document.getElementById('supply-details'),
    costInfoFieldset: document.getElementById('cost-info-fieldset'),
    costWrapper: document.getElementById('cost-wrapper'),
    incomeWrapper: document.getElementById('income-wrapper'),
    fuelUnitPriceInput: document.getElementById('fuel-unit-price'),
    fuelLitersInput: document.getElementById('fuel-liters'),
    fuelBrandSelect: document.getElementById('fuel-brand'),
    expenseItemInput: document.getElementById('expense-item'),
    expenseDatalist: document.getElementById('expense-list'),
    supplyItemInput: document.getElementById('supply-item'),
    supplyMileageInput: document.getElementById('supply-mileage'),
    costInput: document.getElementById('cost'),
    incomeInput: document.getElementById('income'),
    tripActions: document.getElementById('trip-actions'),
    generalActions: document.getElementById('general-actions'),
    editActions: document.getElementById('edit-actions'),
    
    btnTripCancel: document.getElementById('btn-trip-cancel'),
    btnStartTrip: document.getElementById('btn-start-trip'),
    btnEndTrip: document.getElementById('btn-end-trip'),
    btnSaveGeneral: document.getElementById('btn-save-general'),
    btnEditEndTrip: document.getElementById('btn-edit-end-trip'),
    btnUpdateRecord: document.getElementById('btn-update-record'),
    btnDeleteRecord: document.getElementById('btn-delete-record'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),
    
    editModeIndicator: document.getElementById('edit-mode-indicator'),
    editIdInput: document.getElementById('edit-id'),
    centerManagementBody: document.getElementById('center-management-body'),
    centerListContainer: document.getElementById('center-list-container'),
};

export function toggleUI() {
    const type = els.typeSelect.value;
    const isEditMode = !els.editModeIndicator.classList.contains('hidden');

    [els.transportDetails, els.fuelDetails, els.supplyDetails, els.expenseDetails, els.costInfoFieldset, els.tripActions, els.generalActions, els.editActions].forEach(el => el.classList.add('hidden'));
    
    if (type === '화물운송' || type === '대기') {
        els.transportDetails.classList.remove('hidden');
        els.costInfoFieldset.classList.remove('hidden');
        els.costWrapper.classList.add('hidden');
        els.incomeWrapper.classList.remove('hidden');
        if (!isEditMode) {
            els.tripActions.classList.remove('hidden');
            if(type === '화물운송') els.btnTripCancel.classList.remove('hidden');
        }
    } else if (type === '수입') {
        els.expenseDetails.classList.remove('hidden'); 
        document.getElementById('expense-legend').textContent = "수입 내역";
        els.costInfoFieldset.classList.remove('hidden');
        els.incomeWrapper.classList.remove('hidden');
        els.costWrapper.classList.add('hidden');
        if (!isEditMode) els.generalActions.classList.remove('hidden');
    } else {
        els.costInfoFieldset.classList.remove('hidden');
        els.incomeWrapper.classList.add('hidden');
        els.costWrapper.classList.remove('hidden');
        
        if (type === '주유소') {
            els.fuelDetails.classList.remove('hidden');
            if (!isEditMode) els.generalActions.classList.remove('hidden');
        } else if (type === '소모품') {
            els.supplyDetails.classList.remove('hidden');
            if (!isEditMode) els.generalActions.classList.remove('hidden');
        } else if (type === '지출') {
            els.expenseDetails.classList.remove('hidden');
            document.getElementById('expense-legend').textContent = "지출 내역";
            if (!isEditMode) els.generalActions.classList.remove('hidden');
        }
    }

    if (isEditMode) {
        els.editActions.classList.remove('hidden');
        if (type === '주유소' || type === '소모품' || type === '지출' || type === '수입') {
            els.btnEditEndTrip.classList.add('hidden');
        } else {
            els.btnEditEndTrip.classList.remove('hidden');
        }
    }
}

export function updateAddressDisplay() {
    const fromValue = els.fromCenterInput.value;
    const toValue = els.toCenterInput.value;
    const fromLoc = MEM_LOCATIONS[fromValue] || {};
    const toLoc = MEM_LOCATIONS[toValue] || {};
    
    let html = '';
    if (fromLoc.address) html += `<div class="address-clickable" data-address="${fromLoc.address}">[상] ${fromLoc.address}</div>`;
    if (fromLoc.memo) html += `<div class="memo-display">[상] ${fromLoc.memo}</div>`;
    if (toLoc.address) html += `<div class="address-clickable" data-address="${toLoc.address}">[하] ${toLoc.address}</div>`;
    if (toLoc.memo) html += `<div class="memo-display">[하] ${toLoc.memo}</div>`;
    els.addressDisplay.innerHTML = html;
}

export function populateCenterDatalist() {
    els.centerDatalist.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}

export function populateExpenseDatalist() {
    els.expenseDatalist.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
}

export function addCenter(newCenter, address = '', memo = '') {
    const trimmed = newCenter?.trim();
    if (!trimmed) return;
    updateLocationData(trimmed, address, memo);
    populateCenterDatalist();
}

export function getFormDataWithoutTime() {
    const fromValue = els.fromCenterInput.value.trim();
    const toValue = els.toCenterInput.value.trim();
    if(fromValue) addCenter(fromValue);
    if(toValue) addCenter(toValue);

    return {
        type: els.typeSelect.value,
        from: fromValue,
        to: toValue,
        distance: parseFloat(els.manualDistanceInput.value) || 0,
        cost: Math.round((parseFloat(els.costInput.value) || 0) * 10000),
        income: Math.round((parseFloat(els.incomeInput.value) || 0) * 10000),
        liters: parseFloat(els.fuelLitersInput.value) || 0,
        unitPrice: parseInt(els.fuelUnitPriceInput.value) || 0,
        brand: els.fuelBrandSelect.value || '',
        supplyItem: els.supplyItemInput.value || '',
        mileage: parseInt(els.supplyMileageInput.value) || 0,
        expenseItem: els.expenseItemInput.value || ''
    };
}

export function resetForm() {
    els.recordForm.reset();
    els.editIdInput.value = '';
    els.editModeIndicator.classList.add('hidden');
    els.dateInput.value = getTodayString();
    els.timeInput.value = getCurrentTimeString();
    els.dateInput.disabled = false;
    els.timeInput.disabled = false;
    els.addressDisplay.innerHTML = '';
    toggleUI();
}

export function editRecord(id) {
    const r = MEM_RECORDS.find(x => x.id === id);
    if(!r) return;
    els.dateInput.value = r.date; 
    els.timeInput.value = r.time; 
    els.typeSelect.value = r.type;
    els.fromCenterInput.value = r.from || ''; 
    els.toCenterInput.value = r.to || '';
    els.manualDistanceInput.value = r.distance || ''; 
    els.incomeInput.value = r.income ? (r.income/10000) : ''; 
    els.costInput.value = r.cost ? (r.cost/10000) : '';
    els.fuelBrandSelect.value = r.brand || ''; 
    els.fuelLitersInput.value = r.liters || ''; 
    els.fuelUnitPriceInput.value = r.unitPrice || '';
    els.expenseItemInput.value = r.expenseItem || ''; 
    els.supplyItemInput.value = r.supplyItem || ''; 
    els.supplyMileageInput.value = r.mileage || '';
    els.editIdInput.value = id; 
    els.editModeIndicator.classList.remove('hidden');
    els.dateInput.disabled = true; 
    els.timeInput.disabled = true;
    toggleUI(); 
    window.scrollTo(0,0);
}

export function displayCenterList(filter='') {
    els.centerListContainer.innerHTML = "";
    const list = MEM_CENTERS.filter(c => c.includes(filter));
    if(list.length===0) { 
        els.centerListContainer.innerHTML='<p class="note">결과 없음</p>'; 
        return; 
    } 
    list.forEach(c => {
        const l = MEM_LOCATIONS[c]||{};
        const div = document.createElement('div');
        div.className='center-item';
        div.innerHTML=`<div class="info"><span class="center-name">${c}</span><div class="action-buttons"><button class="edit-btn">수정</button><button class="delete-btn">삭제</button></div></div>${l.address?`<span class="note">주소: ${l.address}</span>`:''}`;
        
        div.querySelector('.edit-btn').onclick = () => handleCenterEdit(div,c);
        div.querySelector('.delete-btn').onclick = () => {
            if(!confirm('삭제?')) return;
            const idx = MEM_CENTERS.indexOf(c);
            if(idx>-1) MEM_CENTERS.splice(idx,1);
            delete MEM_LOCATIONS[c];
            saveData();
            displayCenterList(document.getElementById('center-search-input').value);
        };
        els.centerListContainer.appendChild(div);
    });
}

function handleCenterEdit(div, c) {
    const l = MEM_LOCATIONS[c]||{};
    div.innerHTML = `<div class="edit-form"><input class="edit-input" value="${c}"><input class="edit-address-input" value="${l.address||''}"><input class="edit-memo-input" value="${l.memo||''}"><div class="action-buttons"><button class="setting-save-btn">저장</button><button class="cancel-edit-btn">취소</button></div></div>`;
    
    div.querySelector('.setting-save-btn').onclick = () => {
        const nn = div.querySelector('.edit-input').value.trim();
        const na = div.querySelector('.edit-address-input').value.trim();
        const nm = div.querySelector('.edit-memo-input').value.trim();
        if(!nn) return;
        if(nn!==c) {
            const idx = MEM_CENTERS.indexOf(c);
            if(idx>-1) MEM_CENTERS.splice(idx,1);
            if(!MEM_CENTERS.includes(nn)) MEM_CENTERS.push(nn);
            delete MEM_LOCATIONS[c];
            MEM_RECORDS.forEach(r => { if(r.from===c) r.from=nn; if(r.to===c) r.to=nn; });
            MEM_CENTERS.sort();
            saveData();
        }
        updateLocationData(nn, na, nm);
        displayCenterList(document.getElementById('center-search-input').value);
    };
    div.querySelector('.cancel-edit-btn').onclick = () => displayCenterList(document.getElementById('center-search-input').value);
}

// [OCR] 이미지 처리
export async function processReceiptImage(file) {
    const statusDiv = document.getElementById('ocr-status');
    const resultContainer = document.getElementById('ocr-result-container');
    
    if (!file) return;

    document.getElementById('ocr-date').value = '';
    document.getElementById('ocr-time').value = '';
    document.getElementById('ocr-cost').value = '';
    document.getElementById('ocr-liters').value = '';
    document.getElementById('ocr-price').value = '';
    document.getElementById('ocr-subsidy').value = '';   
    document.getElementById('ocr-remaining').value = ''; 
    document.getElementById('ocr-net-cost').value = ''; 

    resultContainer.classList.add('hidden');
    statusDiv.innerHTML = "⏳ 이미지 전처리 및 분석 중... (약 5초 소요)";
    statusDiv.style.color = "#007bff";

    try {
        const processedImage = await preprocessImage(file);

        const { data: { text } } = await Tesseract.recognize(
            processedImage,
            'kor+eng', 
            { 
                logger: m => {
                    if(m.status === 'recognizing text') {
                        statusDiv.textContent = `⏳ 글자 인식 중... ${(m.progress * 100).toFixed(0)}%`;
                    }
                } 
            }
        );

        statusDiv.innerHTML = "✅ 분석 완료! 내용을 확인해주세요.";
        statusDiv.style.color = "green";
        resultContainer.classList.remove('hidden');

        parseReceiptText(text);

    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = "❌ 분석 실패. 이미지를 다시 선택해주세요.";
        statusDiv.style.color = "red";
    }
}

// [OCR] 이미지 전처리
function preprocessImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const maxDim = 1500;
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                } else if (height > width && height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                const threshold = 210; 

                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
                    const value = gray < threshold ? 0 : 255;
                    data[i] = data[i+1] = data[i+2] = value;
                }
                
                ctx.putImageData(imageData, 0, 0);
                canvas.toBlob((blob) => {
                    resolve(URL.createObjectURL(blob));
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// [OCR] 텍스트 파싱
function parseReceiptText(text) {
    let cleanText = text.replace(/\s+/g, ' ');

    const dateMatch = text.match(/(\d{4})[-.,/년\s]+(\d{1,2})[-.,/월\s]+(\d{1,2})/);
    if (dateMatch) {
        let y = dateMatch[1];
        const m = dateMatch[2].padStart(2, '0');
        const d = dateMatch[3].padStart(2, '0');
        document.getElementById('ocr-date').value = `${y}-${m}-${d}`;
    } else {
        document.getElementById('ocr-date').value = getTodayString();
    }

    const timeMatch = text.match(/(\d{1,2})\s*:\s*(\d{2})/);
    if (timeMatch) {
        const hh = timeMatch[1].padStart(2, '0');
        const mm = timeMatch[2];
        document.getElementById('ocr-time').value = `${hh}:${mm}`;
    } else {
        document.getElementById('ocr-time').value = "12:00";
    }

    const lines = text.split('\n');
    
    for (let line of lines) {
        const lineClean = line.replace(/\s/g, ''); 

        const extractNum = (str) => {
            const matches = str.match(/[\d,.]+/g);
            if (!matches) return null;
            let lastVal = matches[matches.length - 1];
            if(lastVal.endsWith('.')) lastVal = lastVal.slice(0, -1);
            return parseFloat(lastVal.replace(/,/g, ''));
        };

        if (lineClean.includes('주유금액') || lineClean.includes('승인금액')) {
            const val = extractNum(line);
            if (val && val > 1000) document.getElementById('ocr-cost').value = val;
        }

        if (lineClean.includes('주유리터') || lineClean.includes('주유량')) {
            const val = extractNum(line);
            if (val) document.getElementById('ocr-liters').value = val;
        }

        if (lineClean.includes('주유단가')) {
            const val = extractNum(line);
            if (val && val > 500 && val < 3000) document.getElementById('ocr-price').value = val;
        }

        if (lineClean.includes('보조금액') || lineClean.includes('보조금')) {
            const val = extractNum(line);
            if (val) document.getElementById('ocr-subsidy').value = val;
        }

        if (lineClean.includes('잔여한도')) {
            const val = extractNum(line);
            if (val) document.getElementById('ocr-remaining').value = val;
        }
    }

    const lit = parseFloat(document.getElementById('ocr-liters').value) || 0;
    const price = parseInt(document.getElementById('ocr-price').value) || 0;
    let cost = parseInt(document.getElementById('ocr-cost').value) || 0;

    if (cost === 0 && lit > 0 && price > 0) {
        cost = Math.round(lit * price);
        document.getElementById('ocr-cost').value = cost;
    }

    const subsidy = parseInt(document.getElementById('ocr-subsidy').value) || 0;
    if (cost > 0) {
        document.getElementById('ocr-net-cost').value = cost - subsidy;
    }
}