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
    
    // 버튼들
    btnTripCancel: document.getElementById('btn-trip-cancel'),
    btnStartTrip: document.getElementById('btn-start-trip'),
    btnRegisterTrip: document.getElementById('btn-register-trip'),
    btnEndTrip: document.getElementById('btn-end-trip'),
    btnSaveGeneral: document.getElementById('btn-save-general'),
    
    btnEditStartTrip: document.getElementById('btn-edit-start-trip'),
    btnEditEndTrip: document.getElementById('btn-edit-end-trip'),
    btnUpdateRecord: document.getElementById('btn-update-record'),
    btnDeleteRecord: document.getElementById('btn-delete-record'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),
    
    editModeIndicator: document.getElementById('edit-mode-indicator'),
    editIdInput: document.getElementById('edit-id'),
    centerManagementBody: document.getElementById('center-management-body'),
    centerListContainer: document.getElementById('center-list-container'),
    
    // 섹션
    tripActions: document.getElementById('trip-actions'),
    generalActions: document.getElementById('general-actions'),
    editActions: document.getElementById('edit-actions'),
};

export function toggleUI() {
    const type = els.typeSelect.value;
    const isEditMode = !els.editModeIndicator.classList.contains('hidden');

    [els.transportDetails, els.fuelDetails, els.supplyDetails, els.expenseDetails, els.costInfoFieldset, els.tripActions, els.generalActions, els.editActions].forEach(el => el && el.classList.add('hidden'));
    
    if (type === '화물운송' || type === '대기') {
        if(els.transportDetails) els.transportDetails.classList.remove('hidden');
        if(els.costInfoFieldset) els.costInfoFieldset.classList.remove('hidden');
        if(els.costWrapper) els.costWrapper.classList.add('hidden');
        if(els.incomeWrapper) els.incomeWrapper.classList.remove('hidden');
        if (!isEditMode) {
            if(els.tripActions) els.tripActions.classList.remove('hidden');
            if(type === '화물운송' && els.btnTripCancel) els.btnTripCancel.classList.remove('hidden');
        }
    } else if (type === '수입') {
        if(els.expenseDetails) els.expenseDetails.classList.remove('hidden'); 
        if(els.costInfoFieldset) els.costInfoFieldset.classList.remove('hidden');
        if(els.incomeWrapper) els.incomeWrapper.classList.remove('hidden');
        if(els.costWrapper) els.costWrapper.classList.add('hidden');
        if (!isEditMode && els.generalActions) els.generalActions.classList.remove('hidden');
    } else {
        if(els.costInfoFieldset) els.costInfoFieldset.classList.remove('hidden');
        if(els.incomeWrapper) els.incomeWrapper.classList.add('hidden');
        if(els.costWrapper) els.costWrapper.classList.remove('hidden');
        
        if (type === '주유소') {
            if(els.fuelDetails) els.fuelDetails.classList.remove('hidden');
            if (!isEditMode && els.generalActions) els.generalActions.classList.remove('hidden');
        } else if (type === '소모품') {
            if(els.supplyDetails) els.supplyDetails.classList.remove('hidden');
            if (!isEditMode && els.generalActions) els.generalActions.classList.remove('hidden');
        } else if (type === '지출') {
            if(els.expenseDetails) els.expenseDetails.classList.remove('hidden');
            if (!isEditMode && els.generalActions) els.generalActions.classList.remove('hidden');
        }
    }

    if (isEditMode && els.editActions) {
        els.editActions.classList.remove('hidden');
        if (type === '주유소' || type === '소모품' || type === '지출' || type === '수입') {
            if(els.btnEditEndTrip) els.btnEditEndTrip.classList.add('hidden');
            if(els.btnEditStartTrip) els.btnEditStartTrip.classList.add('hidden');
        } else {
            if(els.btnEditEndTrip) els.btnEditEndTrip.classList.remove('hidden');
            if(els.btnEditStartTrip) els.btnEditStartTrip.classList.remove('hidden');
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
    if(els.addressDisplay) els.addressDisplay.innerHTML = html;
}

export function populateCenterDatalist() {
    if(els.centerDatalist) els.centerDatalist.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}

export function populateExpenseDatalist() {
    if(els.expenseDatalist) els.expenseDatalist.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
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