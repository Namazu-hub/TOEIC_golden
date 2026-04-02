let currentView = 'study';
let testMode = 'translation'; // 'translation' or 'listening'
let testIdx = 0;
let timerInterval;

// --- タブ切り替え ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(viewId).classList.add('active');
    document.getElementById('nav-' + viewId).classList.add('active');
    currentView = viewId;
    
    if(viewId === 'list') renderList();
}

// --- 単語テストロジック ---
function startTest(mode) {
    testMode = mode;
    const genre = document.getElementById('test-genre').value;
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
        return;
    }

    const q = testList[testIdx];
    const quizEn = document.getElementById('quiz-en');
    
    // リスニングモードなら最初は文字を隠す
    if (testMode === 'listening') {
        quizEn.innerText = "???";
        speak(q.en);
    } else {
        quizEn.innerText = q.hint;
        speak(q.en);
    }

    startTimer(20);

    const container = document.getElementById('options');
    container.innerHTML = '';
    let opts = generateOptions(q.jp); // 4択作成ロジックは既存のものを流用

    opts.forEach(o => {
        const btn = document.createElement('div');
        btn.className = 'option';
        btn.innerText = o;
        btn.onclick = () => {
            if (container.classList.contains('answered')) return;
            container.classList.add('answered');
            clearInterval(timerInterval);

            // 正解表示（赤文字フレーズ）
            const highlight = `<span class="red-word">${q.en}</span>`;
            quizEn.innerHTML = q.phrase.replace(q.en, highlight);
            
            if (o === q.jp) {
                btn.classList.add('correct');
                speak(q.phrase);
            } else {
                btn.classList.add('wrong');
            }

            setTimeout(() => {
                container.classList.remove('answered');
                testIdx++;
                renderQuiz();
            }, 2500);
        };
        container.appendChild(btn);
    });
}

function startTimer(sec) {
    let timeLeft = sec;
    const bar = document.getElementById('timer-bar');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        bar.style.width = (timeLeft / sec * 100) + "%";
        if (timeLeft <= 0) { clearInterval(timerInterval); testIdx++; renderQuiz(); }
    }, 100);
}

// 読み上げ
function speak(text) {
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    window.speechSynthesis.speak(uttr);
}

// ※ generateOptions, resetStudy, updateStreak 等の補助関数は以前のものを組み込んでください。
