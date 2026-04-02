let testList = [];
let testIdx = 0;
let currentMode = '';
let timerInterval;
let isTesting = false; // テスト中フラグ

// --- 1. ビュー切り替え（テスト中はロック） ---
function showView(viewId) {
    if (isTesting) {
        if (!confirm("テストを中断して移動しますか？")) return;
        abortTest(); // 中断処理
    }
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(viewId).classList.add('active');
    const navBtn = document.getElementById('nav-' + viewId);
    if (navBtn) navBtn.classList.add('active');

    if (viewId === 'list') renderList();
}

// --- 2. 単語テスト：開始と中断 ---
function initTest() {
    const genre = document.getElementById('test-genre').value;
    currentMode = document.getElementById('test-mode').value;
    
    testList = rawData.filter(d => d.cat === genre).sort(() => 0.5 - Math.random()).slice(0, 10);
    if (testList.length === 0) { alert("単語がありません"); return; }
    
    testIdx = 0;
    isTesting = true; // テスト開始
    document.getElementById('test-start-screen').classList.add('hidden');
    document.getElementById('quiz-area').classList.remove('hidden');
    renderQuiz();
}

function abortTest() {
    clearInterval(timerInterval);
    isTesting = false;
    document.getElementById('quiz-area').classList.add('hidden');
    document.getElementById('test-start-screen').classList.remove('hidden');
}

// --- 3. クイズ描画（モード別制御） ---
function renderQuiz() {
    if (testIdx >= testList.length) {
        isTesting = false;
        document.getElementById('quiz-area').classList.add('hidden');
        document.getElementById('test-result').classList.remove('hidden');
        document.getElementById('result-score').innerText = `RESULT: ${testIdx}問終了`;
        return;
    }

    const q = testList[testIdx];
    const quizEn = document.getElementById('quiz-en');
    const quizPjp = document.getElementById('quiz-phrase-jp');
    const progress = document.getElementById('test-progress-bar');
    
    progress.style.width = ((testIdx / 10) * 100) + "%";
    quizPjp.classList.add('hidden'); // 解答前は隠す

    // モード別の表示と音声
    if (currentMode === 'listening') {
        quizEn.innerText = "???";
        speak(q.en);
    } else if (currentMode === 'phrase') {
        quizEn.innerText = q.hint;
        // フレーズクイズの時は音声をオフ（何もしない）
    } else {
        quizEn.innerText = q.en;
        speak(q.en);
    }
    
    startTimer(20);

    const container = document.getElementById('options');
    container.innerHTML = '';
    container.classList.remove('answered');

    const isEnglishOpt = (currentMode === 'phrase');
    let opts = generateOptions(isEnglishOpt ? q.en : q.jp, isEnglishOpt);

    opts.forEach(o => {
        const btn = document.createElement('div');
        btn.className = 'option';
        btn.innerText = o;
        btn.onclick = () => {
            if (container.classList.contains('answered')) return;
            container.classList.add('answered');
            clearInterval(timerInterval);

            // 正解後の表示
            const highlight = `<span style="color:#d93025; font-weight:bold;">${q.en}</span>`;
            quizEn.innerHTML = q.phrase.replace(q.en, highlight);
            
            // フレーズ/日本語訳を表示
            quizPjp.innerText = q.phraseJp + " (" + q.jp + ")";
            quizPjp.classList.remove('hidden');

            const isCorrect = (o === (isEnglishOpt ? q.en : q.jp));
            if (isCorrect) {
                btn.classList.add('correct');
                speak(q.phrase);
            } else {
                btn.classList.add('wrong');
                Array.from(container.children).forEach(b => {
                    if(b.innerText === (isEnglishOpt ? q.en : q.jp)) b.classList.add('correct');
                });
            }
            setTimeout(() => { testIdx++; renderQuiz(); }, 2500);
        };
        container.appendChild(btn);
    });
}

// --- 4. 一覧描画バグの修正 ---
function renderList() {
    const b = document.getElementById('list-body');
    const g = document.getElementById('list-genre').value;
    b.innerHTML = '';
    
    const filtered = (g === "全ジャンル") ? rawData : rawData.filter(w => w.cat === g);
    
    filtered.forEach(w => {
        // statsから正解数を取得（未回答なら0）
        const s = stats[w.en] || { c: 0, t: 0 };
        // 10回正解で100%とする計算
        const mastery = Math.min(s.c * 10, 100);
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #eee";
        tr.innerHTML = `
            <td style="padding:15px 10px;">
                <b>${w.en}</b><br>
                <small style="color:#999">${w.cat}点レベル</small>
            </td>
            <td>${w.jp}</td>
            <td style="width:100px;">
                <div style="font-size:10px; margin-bottom:3px;">${mastery}%</div>
                <div style="width:100%; height:4px; background:#eee; border-radius:2px;">
                    <div style="width:${mastery}%; height:100%; background:#4A90E2; border-radius:2px;"></div>
                </div>
            </td>`;
        b.appendChild(tr);
    });
}

// 共通：選択肢生成
function generateOptions(correctValue, isEnglish) {
    let opts = [correctValue];
    // rawData全体からハズレを持ってくる
    let pool = rawData.map(d => isEnglish ? d.en : d.jp);
    while(opts.length < 4) {
        let r = pool[Math.floor(Math.random() * pool.length)];
        if(!opts.includes(r)) opts.push(r);
    }
    return opts.sort(() => 0.5 - Math.random());
}

// （以下、startTimer, speak, updateStreak, 暗記用ロジック等は前回と同じ）

function speak(text) {
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    uttr.rate = 0.9;
    window.speechSynthesis.speak(uttr);
}

function updateStreak() {
    const today = new Date().toLocaleDateString();
    let lastDate = localStorage.getItem('last_study_date');
    let streak = parseInt(localStorage.getItem('study_streak')) || 0;
    if (lastDate !== today) {
        streak = (lastDate === new Date(Date.now() - 86400000).toLocaleDateString()) ? streak + 1 : 1;
        localStorage.setItem('last_study_date', today);
        localStorage.setItem('study_streak', streak);
    }
    const display = document.getElementById('streak-display');
    if (display) display.innerText = `🔥 継続: ${streak}日`;
}

// --- 6. 暗記モード用（以前のロジック） ---
let studyIdx = 0;
let filteredStudyWords = [];
function resetStudy() {
    const g = document.getElementById('study-genre').value;
    filteredStudyWords = rawData.filter(w => w.cat === g);
    studyIdx = 0;
    updateStudy();
}
function updateStudy() {
    if(filteredStudyWords.length === 0) return;
    const w = filteredStudyWords[studyIdx];
    document.getElementById('study-en').innerText = w.en;
    document.getElementById('study-jp').innerText = w.jp;
    document.getElementById('study-jp').classList.add('hidden');
    document.getElementById('study-count').innerText = `${studyIdx+1} / ${filteredStudyWords.length}`;
}
function toggleFlip() { document.getElementById('study-jp').classList.toggle('hidden'); }
function nextCard() { studyIdx = (studyIdx + 1) % filteredStudyWords.length; updateStudy(); }
function prevCard() { studyIdx = (studyIdx - 1 + filteredStudyWords.length) % filteredStudyWords.length; updateStudy(); }

// 読み上げハンドラ
function handleSpeak(e, mode) {
    e.stopPropagation();
    let text = (mode === 'study') ? filteredStudyWords[studyIdx].en : testList[testIdx].en;
    speak(text);
}

// クイズに回答するたびにカウントを増やす
function incrementDailyCount() {
    let count = parseInt(localStorage.getItem('today_count')) || 0;
    count++;
    localStorage.setItem('today_count', count);

    // 100問達成した瞬間に判定
    if (count === 100) {
        processStreak(); // 継続日数の更新処理
        alert("本日のノルマ100問達成！🔥が灯りました！");
    }
    updateStreakDisplay(); // UI表示の更新
}

// 継続日数の判定ロジック
function processStreak() {
    const today = new Date().toLocaleDateString();
    let lastSuccessDate = localStorage.getItem('last_success_date');
    let streak = parseInt(localStorage.getItem('streak')) || 0;

    if (lastSuccessDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 最後に100問達成したのが昨日なら継続、それ以外なら1にリセット
        if (lastSuccessDate === yesterday.toLocaleDateString()) {
            streak++;
        } else {
            streak = 1;
        }
        
        localStorage.setItem('last_success_date', today);
        localStorage.setItem('streak', streak);
        
        // 達成した日付をカレンダー用に保存
        saveCompletedDate(today);
    }
}

let dailyCount = parseInt(localStorage.getItem('daily_count')) || 0;
let targetGoal = parseInt(localStorage.getItem('target_goal')) || 100;
let stats = JSON.parse(localStorage.getItem('word_stats')) || {}; // { "word": {c: correct_count, t: total_count} }
let achievedDates = JSON.parse(localStorage.getItem('achieved_dates')) || []; // ["2026-04-01", ...]

// 目標設定の保存
function saveGoal() {
    const val = document.getElementById('goal-input').value;
    targetGoal = parseInt(val);
    localStorage.setItem('target_goal', targetGoal);
    updateProgressUI();
    alert("目標を更新しました！");
}

// クイズ回答時にカウントアップ（renderQuiz内の正解判定時などに呼ぶ）
function incrementDailyCount(word, isCorrect) {
    dailyCount++;
    localStorage.setItem('daily_count', dailyCount);
    
    // 単語ごとの統計（会得率用）
    if (!stats[word]) stats[word] = { c: 0, t: 0 };
    stats[word].t++;
    if (isCorrect) stats[word].c++;
    localStorage.setItem('word_stats', JSON.stringify(stats));

    // ノルマ達成判定
    if (dailyCount >= targetGoal) {
        markDateAchieved();
    }
    updateProgressUI();
}

function markDateAchieved() {
    const today = new Date().toISOString().split('T')[0];
    if (!achievedDates.includes(today)) {
        achievedDates.push(today);
        localStorage.setItem('achieved_dates', JSON.stringify(achievedDates));
        updateStreak(); // 継続日数の再計算
        renderCalendar();
    }
}

// 一覧の描画（会得率バー付き）
function renderList() {
    const b = document.getElementById('list-body');
    const g = document.getElementById('list-genre').value;
    b.innerHTML = '';
    const filtered = (g === "全ジャンル") ? rawData : rawData.filter(w => w.cat === g);
    
    filtered.forEach(w => {
        const s = stats[w.en] || { c: 0, t: 0 };
        const mastery = Math.min(s.c * 10, 100); // 10回正解で100%
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #eee";
        tr.innerHTML = `
            <td style="padding:15px 10px;"><b>${w.en}</b></td>
            <td>${w.jp}</td>
            <td style="width:80px; text-align:right;">
                <span style="font-size:10px;">${mastery}%</span>
                <div style="width:100%; height:4px; background:#eee; border-radius:2px;">
                    <div style="width:${mastery}%; height:100%; background:#4A90E2;"></div>
                </div>
            </td>`;
        b.appendChild(tr);
    });
}

// カレンダー描画（簡易版）
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.innerText = i;
        dayDiv.style.padding = "8px 0";
        dayDiv.style.borderRadius = "50%";
        
        if (achievedDates.includes(dateStr)) {
            dayDiv.style.background = "#4A90E2";
            dayDiv.style.color = "white";
            dayDiv.style.fontWeight = "bold";
        }
        grid.appendChild(dayDiv);
    }
}

function updateProgressUI() {
    const bar = document.getElementById('daily-progress-bar');
    const status = document.getElementById('progress-status');
    const percent = Math.min((dailyCount / targetGoal) * 100, 100);
    bar.style.width = percent + "%";
    status.innerText = `本日の進捗: ${dailyCount} / ${targetGoal}`;
    document.getElementById('goal-input').value = targetGoal;
}
