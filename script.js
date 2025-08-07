
// DOM 요소들
const dateInput = document.getElementById('mealDate');
const searchBtn = document.getElementById('searchBtn');
const mealInfo = document.getElementById('mealInfo');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// 오늘 날짜를 기본값으로 설정
const today = new Date();
const todayString = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
dateInput.value = todayString;

// 이벤트 리스너
searchBtn.addEventListener('click', searchMealInfo);
dateInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMealInfo();
    }
});

// 급식정보 조회 함수
async function searchMealInfo() {
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        alert('날짜를 선택해주세요.');
        return;
    }
    
    // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
    const formattedDate = selectedDate.replace(/-/g, '');
    
    // UI 상태 변경
    showLoading();
    hideError();
    
    try {
        const mealData = await fetchMealData(formattedDate);
        displayMealInfo(mealData, selectedDate);
    } catch (error) {
        console.error('Error fetching meal data:', error);
        showError();
    } finally {
        hideLoading();
    }
}

// API에서 급식 데이터 가져오기
async function fetchMealData(date) {
    const ATPT_OFCDC_SC_CODE = 'J10'; // 경기도교육청
    const SD_SCHUL_CODE = '7530079'; // 산본고등학교
    
    const apiUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${date}`;
    
    // CORS 문제를 해결하기 위해 프록시 서버 사용
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    return parseXMLResponse(xmlText);
}

// XML 응답 파싱
function parseXMLResponse(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // 에러 체크
    const errorElement = xmlDoc.querySelector('RESULT > CODE');
    if (errorElement && errorElement.textContent !== 'INFO-000') {
        throw new Error('No meal data found');
    }
    
    const rows = xmlDoc.querySelectorAll('row');
    const mealData = [];
    
    rows.forEach(row => {
        const mealType = row.querySelector('MMEAL_SC_NM')?.textContent || '';
        const dishName = row.querySelector('DDISH_NM')?.textContent || '';
        const calories = row.querySelector('CAL_INFO')?.textContent || '';
        const nutritionInfo = row.querySelector('NTR_INFO')?.textContent || '';
        
        if (dishName) {
            mealData.push({
                mealType: mealType,
                dishes: dishName.split('<br/>').filter(dish => dish.trim() !== ''),
                calories: calories,
                nutrition: nutritionInfo
            });
        }
    });
    
    return mealData;
}

// 급식정보 화면에 표시
function displayMealInfo(mealData, date) {
    if (!mealData || mealData.length === 0) {
        showNoDataMessage(date);
        return;
    }
    
    const formatDate = new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    
    let html = `
        <div class="meal-card">
            <div class="date-info">${formatDate}</div>
    `;
    
    mealData.forEach(meal => {
        html += `
            <div class="meal-section">
                <h3>${meal.mealType}</h3>
                <ul class="meal-list">
        `;
        
        meal.dishes.forEach(dish => {
            // 알레르기 정보 제거 (숫자와 점 제거)
            const cleanDish = dish.replace(/\d+\./g, '').trim();
            if (cleanDish) {
                html += `<li>${cleanDish}</li>`;
            }
        });
        
        html += `</ul>`;
        
        if (meal.calories) {
            html += `<p style="margin-top: 10px; color: #666; font-size: 0.9rem;">칼로리: ${meal.calories}</p>`;
        }
        
        html += `</div>`;
    });
    
    html += `</div>`;
    mealInfo.innerHTML = html;
}

// 데이터가 없을 때 메시지 표시
function showNoDataMessage(date) {
    const formatDate = new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    
    mealInfo.innerHTML = `
        <div class="meal-card">
            <div class="date-info">${formatDate}</div>
            <h2>급식정보 없음</h2>
            <p class="instruction">선택하신 날짜에는 급식정보가 없습니다.<br>주말이나 공휴일, 방학 기간일 수 있습니다.</p>
        </div>
    `;
}

// 로딩 상태 표시/숨김
function showLoading() {
    loading.classList.remove('hidden');
    mealInfo.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
    mealInfo.classList.remove('hidden');
}

// 에러 메시지 표시/숨김
function showError() {
    errorMessage.classList.remove('hidden');
    mealInfo.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// 페이지 로드 시 오늘 급식정보 자동 조회
window.addEventListener('load', function() {
    searchMealInfo();
});
