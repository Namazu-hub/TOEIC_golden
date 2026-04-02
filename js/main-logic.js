let testIdx = 0;
let testWords = [];
let timerInterval;

// --- 単語テストロジック ---
function startTest() {
    const g = document.getElementById('test-genre').value;
    testWords = rawData.filter(w => w.cat === g).sort(() => Math.random() - 0.5).slice(0, 10);
    testIdx = 0;
    document.getElementById('test-start-screen').classList.add('hidden');
    document.getElementById('quiz-area').classList.remove('hidden');
    renderQuiz();
}

function renderQuiz() {
    if(testIdx >= testWords.length) {
        showTestResult();
        return;
    }

    const q = testWords[testIdx];
    const quizEn = document.getElementById('quiz-en');
    const quizPjp = document.getElementById('quiz-phrase-jp');
    
    // 最初は穴埋めヒントを表示
    quizEn.innerText = q.hint;
    quizPjp.innerText = q.phraseJp;
    speak(q.en);

    // 20秒タイマー開始
    startTimer(20);

    const container = document.getElementById('options');
    container.innerHTML = '';
    let opts = generateOptions(q.jp); // 4択作成

    opts.forEach(o => {
        const d = document.createElement('div');
        d.className = 'option';
        d.innerText = o;
        d.onclick = () => {
            if(container.classList.contains('answered')) return;
            container.classList.add('answered');
            clearInterval(timerInterval); // タイマー停止

            // ★正解フレーズの赤文字表示ロジック
            const highlight = `<span style="color:#d93025; font-weight:bold;">${q.en}</span>`;
            const fullPhrase = q.phrase.replace(q.en, highlight);
            quizEn.innerHTML = fullPhrase;

            if(o === q.jp) {
                d.classList.add('correct');
                speak(q.phrase); // 正解ならフレーズを読み上げ
            } else {
                d.classList.add('wrong');
                // 正解のボタンを強調する処理をここに追加
            }

            setTimeout(() => {
                container.classList.remove('answered');
                testIdx++;
                renderQuiz();
            }, 2500); // 確認のため2.5秒待つ
        };
        container.appendChild(d);
    });
}

function startTimer(seconds) {
    let timeLeft = seconds;
    const bar = document.getElementById('timer-bar');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        bar.style.width = (timeLeft / seconds * 100) + "%";
        if(timeLeft <= 0) {
            clearInterval(timerInterval);
            testIdx++; 
            renderQuiz();
        }
    }, 100);
}
