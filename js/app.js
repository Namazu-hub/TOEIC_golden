// --- 1. グローバル変数の宣言 ---
let testList = [];
let testIdx = 0;
let currentMode = '';
let timerInterval; // タイマー用の変数

// --- 2. 初期化処理（ページを開いた時に動く） ---
window.onload = () => {
    updateStreak(); // 継続日数の更新
    showView('study'); // 最初は暗記画面を出す
};

// --- 3. タブ切り替え（ビュー・ルーター） ---
function showView(viewId) {
    // すべての画面を隠す
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // すべてのタブの活性化を解除
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    
    // 指定された画面とタブだけを表示
    document.getElementById(viewId).classList.add('active');
    const navBtn = document.getElementById('nav-' + viewId);
    if (navBtn) navBtn.classList.add('active');

    // 一覧画面ならリストを描画
    if (viewId === 'list') renderList();
}

// --- 4. 【ユーザー提供】単語テストのメインロジック ---
function initTest() {
    const genre = document.getElementById('test-genre').value;
    currentMode = document.getElementById('test-mode').value;
    
    // 選択したレベルから10問ランダム抽出
    testList = rawData.filter(d => d.cat === genre).sort(() => 0.5 - Math.random()).slice(0, 10);
    testIdx = 0;

    document.getElementById('test-start-screen').classList.add('hidden');
    document.getElementById('quiz-area').classList.remove('hidden');
    renderQuiz();
}

function renderQuiz() {
    if (testIdx >= testList.length) {
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

    if (currentMode === 'listening') {
        quizEn.innerText = "???";
        quizPjp.innerText = "音声を聞いて意味を選んでください";
    } else if (currentMode === 'phrase') {
        quizEn.innerText = q.hint;
        quizPjp.innerText = q.phraseJp;
    } else {
        quizEn.innerText = q.en;
        quizPjp.innerText = "";
    }
    
    speak(q.en);
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

            const highlight = `<span style="color:#d93025; font-weight:bold;">${q.en}</span>`;
            quizEn.innerHTML = q.phrase.replace(q.en, highlight);
            quizPjp.innerText = q.jp;

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

function generateOptions(correctValue, isEnglish) {
    let opts = [correctValue];
    let pool = rawData.map(d => isEnglish ? d.en : d.jp);
    while(opts.length < 4) {
        let r = pool[Math.floor(Math.random() * pool.length)];
        if(!opts.includes(r)) opts.push(r);
    }
    return opts.sort(() => 0.5 - Math.random());
}

// --- 5. サポート関数（タイマー・音声・継続日数） ---
function startTimer(seconds) {
    let timeLeft = seconds;
    const bar = document.getElementById('timer-bar');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        bar.style.width = (timeLeft / seconds * 100) + "%";
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            testIdx++;
            renderQuiz();
        }
    }, 100);
}

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
