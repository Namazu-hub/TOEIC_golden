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
    
    // カテゴリが一致するもの、または「全ジャンル」をフィルタ
    const filtered = (g === "全ジャンル") ? rawData : rawData.filter(w => w.cat === g);
    
    filtered.forEach(w => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:10px; border-bottom:1px solid #eee;"><b>${w.en}</b></td>
                        <td style="border-bottom:1px solid #eee;">${w.jp}</td>`;
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
