// --- 核心となるクイズ描画ロジック ---
function renderQuiz() {
    if (testIdx >= testList.length) {
        showResult(); // 結果画面へ
        return;
    }

    const q = testList[testIdx];
    const quizDisplay = document.getElementById('quiz-en');
    const jpHint = document.getElementById('phrase-jp-hint');
    
    // 1. セットアップ：穴埋めヒントと日本語訳を表示
    quizDisplay.innerText = q.hint; // 例: Let's try a______
    jpHint.innerText = q.phraseJp; // 例: とにかくやってみよう
    speak(q.en); 

    // 2. タイマー起動（20秒）
    startTimer(20);

    // 3. 選択肢生成
    const container = document.getElementById('options');
    container.innerHTML = '';
    
    // 正解(q.jp)とランダムな誤答3つを混ぜる
    let opts = generateOptions(q.jp); 

    opts.forEach(o => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.innerText = o;
        btn.onclick = () => handleAnswer(o, q, btn, container);
        container.appendChild(btn);
    });
}

// --- 回答時の演出ロジック ---
function handleAnswer(selected, correctObj, btn, container) {
    if (container.classList.contains('answered')) return;
    container.classList.add('answered'); // 連続クリック防止
    clearInterval(timer); // タイマー停止

    const isCorrect = (selected === correctObj.jp);
    
    // 1. 正解フレーズの赤文字ハイライト生成
    // phrase: "Let's try anyway", en: "anyway" -> anywayを赤く
    const highlight = `<span class="highlight-red">${correctObj.en}</span>`;
    const fullPhrase = correctObj.phrase.replace(correctObj.en, highlight);
    
    document.getElementById('quiz-en').innerHTML = fullPhrase;
    
    // 2. 音声フィードバック
    if (isCorrect) {
        btn.classList.add('correct');
        speak(correctObj.phrase); // 正解ならフレーズ全体を読み上げ
    } else {
        btn.classList.add('wrong');
        // 不正解なら正しい選択肢を光らせる処理（省略可）
    }

    // 3. 次の問題へのインターバル（じっくり確認させるため2.5秒）
    setTimeout(() => {
        container.classList.remove('answered');
        testIdx++;
        renderQuiz();
    }, 2500);
}
