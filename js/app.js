// ==========================================
// 1. Storage & State Module (データと状態管理)
// ==========================================
const AppState = {
    testList: [],
    testIdx: 0,
    currentMode: '',
    timerInterval: null,
    isTesting: false,

    dailyCount: parseInt(localStorage.getItem('daily_count')) || 0,
    targetGoal: parseInt(localStorage.getItem('target_goal')) || 100,
    stats: JSON.parse(localStorage.getItem('word_stats')) || {}, 
    achievedDates: JSON.parse(localStorage.getItem('achieved_dates')) || [],
    currentStreak: parseInt(localStorage.getItem('streak')) || 0,

    saveGoal: function(val) {
        this.targetGoal = parseInt(val);
        localStorage.setItem('target_goal', this.targetGoal);
        UIController.updateProgressUI();
        alert("目標を更新しました！");
    },

    recordAnswer: function(word, isCorrect) {
        this.dailyCount++;
        localStorage.setItem('daily_count', this.dailyCount);
        
        if (!this.stats[word]) this.stats[word] = { c: 0, t: 0 };
        this.stats[word].t++;
        if (isCorrect) this.stats[word].c++;
        localStorage.setItem('word_stats', JSON.stringify(this.stats));

        if (this.dailyCount >= this.targetGoal) {
            this.markDateAchieved();
        }
    },

    markDateAchieved: function() {
        const todayStr = new Date().toLocaleDateString('sv-SE');
        if (!this.achievedDates.includes(todayStr)) {
            this.achievedDates.push(todayStr);
            localStorage.setItem('achieved_dates', JSON.stringify(this.achievedDates));
            this.processStreak(todayStr);
        }
    },

    processStreak: function(todayStr) {
        let lastSuccessDate = localStorage.getItem('last_success_date');
        if (lastSuccessDate !== todayStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('sv-SE');
            
            this.currentStreak = (lastSuccessDate === yesterdayStr) ? this.currentStreak + 1 : 1;
            
            localStorage.setItem('last_success_date', todayStr);
            localStorage.setItem('streak', this.currentStreak);
            alert(`本日のノルマ達成！🔥 継続: ${this.currentStreak}日`);
        }
    }
};
// ==========================================
// 2. Study Controller Module (暗記モード)
// ==========================================
const StudyController = {
    studyIdx: 0,
    filteredStudyWords: [],

    resetStudy: function() {
        const g = document.getElementById('study-genre').value;
        // rawData が存在するか安全にチェック
        if (typeof rawData === 'undefined' || rawData.length === 0) return;
        
        this.filteredStudyWords = rawData.filter(w => w.cat === g);
        this.studyIdx = 0;
        this.updateStudy();
    },

    updateStudy: function() {
        if (this.filteredStudyWords.length === 0) {
            document.getElementById('study-en').innerText = "単語がありません";
            document.getElementById('study-jp').innerText = "";
            return;
        }
        const w = this.filteredStudyWords[this.studyIdx];
        
        document.getElementById('study-en').innerText = w.en;
        document.getElementById('study-jp').innerText = w.jp;
        document.getElementById('study-jp').classList.add('hidden');
        document.getElementById('study-count').innerText = `${this.studyIdx + 1} / ${this.filteredStudyWords.length}`;
        document.getElementById('study-tag').innerText = w.cat + "点レベル";
    },

    toggleFlip: function() {
        document.getElementById('study-jp').classList.toggle('hidden');
    },

    nextCard: function() {
        if (this.filteredStudyWords.length === 0) return;
        this.studyIdx = (this.studyIdx + 1) % this.filteredStudyWords.length;
        this.updateStudy();
    },

    prevCard: function() {
        if (this.filteredStudyWords.length === 0) return;
        this.studyIdx = (this.studyIdx - 1 + this.filteredStudyWords.length) % this.filteredStudyWords.length;
        this.updateStudy();
    }
};
// ==========================================
// 3. UI Controller Module (画面描画)
// ==========================================
const UIController = {
    showView: function(viewId) {
        if (AppState.isTesting) {
            if (!confirm("テストを中断して移動しますか？")) return;
            QuizController.abortTest();
        }
        
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        
        document.getElementById(viewId).classList.add('active');
        const navBtn = document.getElementById('nav-' + viewId);
        if (navBtn) navBtn.classList.add('active');

        if (viewId === 'list') this.renderList();
        if (viewId === 'progress') {
            this.updateProgressUI();
            this.renderCalendar();
        }
        // 暗記タブを開いた時に初期化する
        if (viewId === 'study') StudyController.resetStudy();
    },

    renderList: function() {
        const b = document.getElementById('list-body');
        const g = document.getElementById('list-genre').value;
        b.innerHTML = '';
        
        const filtered = (g === "全ジャンル") ? rawData : rawData.filter(w => w.cat === g);
        
        filtered.forEach(w => {
            const s = AppState.stats[w.en] || { c: 0, t: 0 };
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
    },

    renderCalendar: function() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        const now = new Date();
        document.getElementById('calendar-month').innerText = `${now.getFullYear()}年 ${now.getMonth() + 1}月`;
        
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayDiv = document.createElement('div');
            dayDiv.innerText = i;
            dayDiv.style.padding = "8px 0";
            dayDiv.style.borderRadius = "50%";
            
        if (AppState.achievedDates.includes(dateStr)) {
                dayDiv.innerText = "🔥";
                dayDiv.style.fontSize = "18px"; // アイコンなので少し大きく
                
                dayDiv.style.background = "#fff4e5"; 
            }
            grid.appendChild(dayDiv);
        }
    },

    updateProgressUI: function() {
        const bar = document.getElementById('daily-progress-bar');
        const status = document.getElementById('progress-status');
        const streakDisplay = document.getElementById('streak-count');
        
        const percent = Math.min((AppState.dailyCount / AppState.targetGoal) * 100, 100);
        if(bar) bar.style.width = percent + "%";
        if(status) status.innerText = `本日の進捗: ${AppState.dailyCount} / ${AppState.targetGoal}`;
        if(streakDisplay) streakDisplay.innerText = `🔥 ${AppState.currentStreak}日`;
        
        const goalInput = document.getElementById('goal-input');
        if(goalInput) goalInput.value = AppState.targetGoal;
    }
};

// ==========================================
// 4. Quiz Controller Module (テストロジック)
// ==========================================
const QuizController = {
    initTest: function() {
        const genre = document.getElementById('test-genre').value;
        AppState.currentMode = document.getElementById('test-mode').value;
        
        AppState.testList = rawData.filter(d => d.cat === genre).sort(() => 0.5 - Math.random()).slice(0, 10);
        if (AppState.testList.length === 0) { alert("単語がありません"); return; }
        
        AppState.testIdx = 0;
        AppState.isTesting = true;
        document.getElementById('test-start-screen').classList.add('hidden');
        document.getElementById('quiz-area').classList.remove('hidden');
        this.renderQuiz();
    },

    abortTest: function() {
        clearInterval(AppState.timerInterval);
        AppState.isTesting = false;
        document.getElementById('quiz-area').classList.add('hidden');
        document.getElementById('test-start-screen').classList.remove('hidden');
    },

    renderQuiz: function() {
        if (AppState.testIdx >= AppState.testList.length) {
            AppState.isTesting = false;
            document.getElementById('quiz-area').classList.add('hidden');
            document.getElementById('test-result').classList.remove('hidden');
            document.getElementById('result-score').innerText = `RESULT: ${AppState.testIdx}問終了`;
            return;
        }

        const q = AppState.testList[AppState.testIdx];
        const quizEn = document.getElementById('quiz-en');
        const quizPjp = document.getElementById('quiz-phrase-jp');
        const progress = document.getElementById('test-progress-bar');
        
        progress.style.width = ((AppState.testIdx / AppState.testList.length) * 100) + "%";
        quizPjp.classList.add('hidden');

        if (AppState.currentMode === 'listening') {
            quizEn.innerText = "???";
            speak(q.en);
        } else if (AppState.currentMode === 'phrase') {
            quizEn.innerText = q.hint;
        } else {
            quizEn.innerText = q.en;
            speak(q.en);
        }
        
        // ★ 20秒タイマー起動
        this.startTimer(20);

        const container = document.getElementById('options');
        container.innerHTML = '';
        container.classList.remove('answered');

        const isEnglishOpt = (AppState.currentMode === 'phrase');
        const correctOpt = isEnglishOpt ? q.en : q.jp;
        
        // エラー防止用の堅牢な4択生成
        let opts = this.generateOptions(correctOpt, isEnglishOpt);

        opts.forEach(o => {
            const btn = document.createElement('div');
            btn.className = 'option';
            btn.innerText = o;
            btn.onclick = () => {
                if (container.classList.contains('answered')) return;
                container.classList.add('answered');
                clearInterval(AppState.timerInterval); // クリックでタイマー停止

                const isCorrect = (o === correctOpt);
                AppState.recordAnswer(q.en, isCorrect);
                UIController.updateProgressUI();

                const highlight = `<span style="color:#d93025; font-weight:bold;">${q.en}</span>`;
                quizEn.innerHTML = q.phrase.replace(q.en, highlight);
                quizPjp.innerText = q.phraseJp + " (" + q.jp + ")";
                quizPjp.classList.remove('hidden');

                if (isCorrect) {
                    btn.classList.add('correct');
                    
                } else {
                    btn.classList.add('wrong');
                    Array.from(container.children).forEach(b => {
                        if(b.innerText === correctOpt) b.classList.add('correct');
                    });
                }
                
                setTimeout(() => { AppState.testIdx++; QuizController.renderQuiz(); }, 2500);
            };
            container.appendChild(btn);
        });
    },

    generateOptions: function(correctValue, isEnglish) {
        let opts = [correctValue];
        // 万が一データがない場合はエラーを防ぐ
        if (!rawData || rawData.length === 0) return opts;

        let pool = rawData.map(d => isEnglish ? d.en : d.jp).filter(Boolean); // 空データを除外
        
        let attempts = 0; // 無限ループ防止
        while(opts.length < 4 && attempts < 50) {
            let r = pool[Math.floor(Math.random() * pool.length)];
            if(!opts.includes(r)) opts.push(r);
            attempts++;
        }
        return opts.sort(() => 0.5 - Math.random());
    },

    // ★ 20秒減っていくタイマーバー
    startTimer: function(seconds) {
        let timeLeft = seconds;
        const bar = document.getElementById('timer-bar');
        clearInterval(AppState.timerInterval);
        
        AppState.timerInterval = setInterval(() => {
            timeLeft -= 0.1;
            // バーの長さを減らす（100% → 0%）
            if(bar) bar.style.width = (timeLeft / seconds * 100) + "%";
            
            // 20秒経過時の処理
            if (timeLeft <= 0) {
                clearInterval(AppState.timerInterval);
                const container = document.getElementById('options');
                if (!container.classList.contains('answered')) {
                    container.classList.add('answered');
                    // 時間切れは不正解扱いとして次に進む
                    AppState.testIdx++;
                    QuizController.renderQuiz();
                }
            }
        }, 100); // 0.1秒ごとに更新して滑らかに
    }
};

// ==========================================
// 5. Global Helpers (HTMLからの呼び出し用)
// ==========================================
function speak(text) {
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    uttr.rate = 0.9;
    window.speechSynthesis.speak(uttr);
}

// HTMLから直接呼ばれる窓口
function showView(viewId) { UIController.showView(viewId); }
function initTest() { QuizController.initTest(); }
function abortTest() { QuizController.abortTest(); }
function renderList() { UIController.renderList(); }
function saveGoal() { AppState.saveGoal(document.getElementById('goal-input').value); }

// 暗記モードの操作窓口
function resetStudy() { StudyController.resetStudy(); }
function toggleFlip() { StudyController.toggleFlip(); }
function nextCard() { StudyController.nextCard(); }
function prevCard() { StudyController.prevCard(); }

function handleSpeak(e, mode) {
    e.stopPropagation();
    if(mode === 'test' && AppState.testList[AppState.testIdx]) {
        speak(AppState.testList[AppState.testIdx].en);
    } else if (mode === 'study' && StudyController.filteredStudyWords[StudyController.studyIdx]) {
        speak(StudyController.filteredStudyWords[StudyController.studyIdx].en);
    }
}

// ==========================================
// 6. 初期化
// ==========================================
window.onload = () => {
    // データの準備ができているか確認（エラー防止）
    if (typeof rawData === 'undefined') {
        console.error("単語データが読み込まれていません。index.htmlの読み込み順序を確認してください。");
    }

    const todayStr = new Date().toLocaleDateString('sv-SE');
    if (localStorage.getItem('last_played_date') !== todayStr) {
        AppState.dailyCount = 0;
        localStorage.setItem('daily_count', 0);
        localStorage.setItem('last_played_date', todayStr);
    }
    
    StudyController.resetStudy(); // 暗記データを裏で準備しておく
    UIController.showView('progress'); // 最初は進捗タブ
};
