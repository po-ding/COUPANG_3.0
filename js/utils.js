// --- START OF FILE js/utils.js ---

export const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getCurrentTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

export const formatToManwon = (val) => isNaN(val) ? '0' : Math.round(val / 10000).toLocaleString('ko-KR');

export function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if(toast){
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
    }
}

export function copyTextToClipboard(text, msg) {
    if (!navigator.clipboard) {
        // 보안 컨텍스트 아닐 때 fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast(msg || '복사되었습니다.'); } 
        catch (e) { console.error(e); }
        document.body.removeChild(ta);
        return;
    }
    navigator.clipboard.writeText(text).then(() => showToast(msg || '복사되었습니다.'))
    .catch(err => console.log('복사 실패:', err));
}

// 04시 기준 날짜 계산
export function getStatisticalDate(dateStr, timeStr) {
    if (!dateStr || !timeStr) return dateStr;

    // 1. 시간을 숫자로 변환 (예: "03:30" -> 3)
    const hour = parseInt(timeStr.split(':')[0], 10);
    
    // 2. 04시 이상이면 원래 날짜 그대로 반환
    if (hour >= 4) {
        return dateStr;
    }

    // 3. 04시 미만이면 날짜에서 하루 빼기
    const parts = dateStr.split('-'); 
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 월(0~11)
    const d = parseInt(parts[2], 10);

    // 낮 12시 기준으로 설정하여 시차/썸머타임 등 변수 제거
    const dateObj = new Date(y, m, d, 12, 0, 0);
    dateObj.setDate(dateObj.getDate() - 1); // 하루 뺌

    // YYYY-MM-DD 형식으로 다시 변환
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');

    return `${newY}-${newM}-${newD}`;
}