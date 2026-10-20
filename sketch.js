// ==========================================
// 全局變數定義
// ==========================================

// Google Sheet 發布為 CSV 的網址
let csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXgnzqnksP5mQZJSO-BRoAfu41XvA4wSDWX641dJCRKei4HG2eD4cXdSF2Vi6R1CZSkO8e5RX7k1RC/pub?gid=0&single=true&output=csv';

// 字型名稱（由 HTML 載入 Google Fonts）
let fontZH = 'LXGW WenKai Mono TC'; 
let fontEN = 'Dhurjati'; 

// 資料與遊戲狀態
let rawTable;         // 儲存從 CSV 載入的原始表格資料
let allQuestions = []; // 轉換後的全部題庫 (約20題)
let quizList = [];     // 隨機抽出的5題
let loadedSounds = []; // 預先載入的聲音物件
let currentQuestionIndex = 0; // 目前答題的索引 (0~4)
let userAnswers = [];  // 紀錄學生的答案 index (-1 表示未答)
let gameState = 'START'; // 遊戲狀態：'LOADING', 'START', 'QUIZ', 'RESULT'

// 佈局與按鈕互動變數
let playSoundBtn;   // 聲音播放按鈕區域
let optionBtns = []; // 4個選項按鈕區域
let nextBtn;       // 下一題 / 提交按鈕區域
let restartBtn;    // 重設 / 再玩一次按鈕區域

// 單元分析統計變數
let unitStats = {}; // { '農場動物': { total: 0, correct: 0 }, ... }


// ==========================================
// p5.js 預載階段 (preload)
// ==========================================
function preload() {
  // 預載 CSV 題庫資料 (含標題列)
  rawTable = loadTable(csvUrl, 'csv', 'header', 
    () => { console.log('CSV 題庫載入成功'); },
    () => { console.warn('CSV 載入失敗，將使用預設備用題庫'); }
  );
}


// ==========================================
// p5.js 初始化設定 (setup)
// ==========================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  parseTableData();
}


// ==========================================
// 資料解析與初始化函數
// ==========================================
function parseTableData() {
  allQuestions = [];

  if (rawTable && rawTable.getRowCount() > 0) {
    for (let r = 0; r < rawTable.getRowCount(); r++) {
      let row = rawTable.getRow(r);
      allQuestions.push({
        id: row.getString('id'),
        unit: row.getString('unit'),
        soundUrl: row.getString('soundUrl'),
        options: [
          row.getString('option1'),
          row.getString('option2'),
          row.getString('option3'),
          row.getString('option4')
        ],
        correctIndex: int(row.getString('correctIndex'))
      });
    }
  } else {
    // 預備備用題庫
    for (let i = 1; i <= 20; i++) {
      let units = ['農場動物', '野生動物', '鳥類', '海洋生物'];
      let selectedUnit = units[i % units.length];
      allQuestions.push({
        id: i,
        unit: selectedUnit,
        soundUrl: 'https://actions.google.com/sounds/v1/animals/dog_bark.ogg',
        options: [`動物 ${i}-A`, `Dog ${i}`, `Cat ${i}`, `Bird ${i}`],
        correctIndex: 1
      });
    }
  }

  initGame();
}

// 初始化/重置一局新遊戲
function initGame() {
  let shuffled = shuffle(allQuestions);
  quizList = shuffled.slice(0, min(5, shuffled.length));

  loadedSounds = [];
  gameState = 'LOADING';
  let loadedCount = 0;
  let hasEnteredStart = false;

  const checkFinish = () => {
    if (!hasEnteredStart && loadedCount >= quizList.length) {
      hasEnteredStart = true;
      gameState = 'START';
    }
  };

  // 3秒載入超時防護
  setTimeout(() => {
    if (!hasEnteredStart) {
      hasEnteredStart = true;
      gameState = 'START';
    }
  }, 3000);

  for (let i = 0; i < quizList.length; i++) {
    let url = quizList[i].soundUrl ? quizList[i].soundUrl.trim() : '';

    if (url !== '') {
      let sound = loadSound(url, 
        () => { loadedCount++; checkFinish(); },
        () => { loadedCount++; checkFinish(); }
      );
      loadedSounds.push(sound);
    } else {
      loadedCount++;
      loadedSounds.push(null);
      checkFinish();
    }
  }

  currentQuestionIndex = 0;
  userAnswers = new Array(quizList.length).fill(-1);
  unitStats = {};
}


// ==========================================
// p5.js 主要繪製迴圈 (draw)
// ==========================================
function draw() {
  background(245, 247, 250);

  switch (gameState) {
    case 'LOADING':
      drawLoadingScreen();
      break;
    case 'START':
      drawStartScreen();
      break;
    case 'QUIZ':
      drawQuizScreen();
      break;
    case 'RESULT':
      drawResultScreen();
      break;
  }
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


// ==========================================
// 各介面繪製實作
// ==========================================

// 1. 載入中畫面
function drawLoadingScreen() {
  textAlign(CENTER, CENTER);
  textFont(fontZH);
  textSize(min(width, height) * 0.05);
  fill(80);
  text("音效與題庫載入中，請稍候...", width / 2, height / 2);
}

// 2. 遊戲開始畫面
function drawStartScreen() {
  rectMode(CORNER);
  textAlign(CENTER, CENTER);

  fill(44, 62, 80);
  textFont(fontZH);
  textSize(min(width, height) * 0.07);
  text("動物聲音大考驗", width / 2, height * 0.35);

  textFont(fontEN);
  textSize(min(width, height) * 0.04);
  fill(120);
  text("Animal Sound Quiz Challenge", width / 2, height * 0.43);

  let btnW = min(width * 0.4, 260);
  let btnH = 60;
  let btnX = width / 2 - btnW / 2;
  let btnY = height * 0.6;

  let isHover = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
  
  fill(isHover ? color(46, 204, 113) : color(39, 174, 96));
  noStroke();
  rect(btnX, btnY, btnW, btnH, 12);

  fill(255);
  textFont(fontZH);
  textSize(24);
  text("開始測驗", width / 2, btnY + btnH / 2);

  restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
}

// 3. 測驗進行畫面 (支援即時對錯顯示)
function drawQuizScreen() {
  let q = quizList[currentQuestionIndex];
  let answered = userAnswers[currentQuestionIndex] !== -1; // 判斷本題是否已作答

  // --- 上方標題與進度 ---
  rectMode(CORNER);
  fill(52, 73, 94);
  rect(0, 0, width, height * 0.12);

  textFont(fontZH);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(min(width, height) * 0.035);
  text(`題目 ${currentQuestionIndex + 1} / ${quizList.length}`, width * 0.05, height * 0.06);

  textAlign(RIGHT, CENTER);
  fill(241, 196, 15);
  text(`[單元: ${q.unit}]`, width * 0.95, height * 0.06);

  // --- 中間喇叭播音區域 ---
  let speakerSize = min(width, height) * 0.18;
  let speakerX = width / 2;
  let speakerY = height * 0.28;

  let isSpeakerHover = dist(mouseX, mouseY, speakerX, speakerY) < speakerSize / 2;
  fill(isSpeakerHover ? color(52, 152, 219) : color(41, 128, 185));
  noStroke();
  circle(speakerX, speakerY, speakerSize);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(speakerSize * 0.4);
  text("🔊", speakerX, speakerY);

  textFont(fontZH);
  textSize(16);
  fill(100);
  text("點擊喇叭重複播放聲音", speakerX, speakerY + speakerSize / 2 + 25);

  playSoundBtn = { x: speakerX - speakerSize/2, y: speakerY - speakerSize/2, w: speakerSize, h: speakerSize };

  // --- 四個選項按鈕區域 ---
  optionBtns = [];
  let gridW = min(width * 0.85, 700);
  let btnW = (gridW - 20) / 2;
  let btnH = 65;
  let startX = width / 2 - gridW / 2;
  let startY = height * 0.48;

  for (let i = 0; i < 4; i++) {
    let col = i % 2;
    let row = floor(i / 2);
    let x = startX + col * (btnW + 20);
    let y = startY + row * (btnH + 15);

    let isSelected = (userAnswers[currentQuestionIndex] === i);
    let isCorrect = (i === q.correctIndex);
    let isHover = !answered && (mouseX > x && mouseX < x + btnW && mouseY > y && mouseY < y + btnH);

    // --- 設定即時對錯顏色邏輯 ---
    if (answered) {
      if (isCorrect) {
        fill(46, 204, 113); // 正確選項：亮綠色
        stroke(39, 174, 96);
      } else if (isSelected && !isCorrect) {
        fill(231, 76, 60);  // 選錯選項：紅色
        stroke(192, 57, 43);
      } else {
        fill(240, 240, 240); // 未選擇的非答案選項：淺灰
        stroke(220);
      }
    } else {
      // 未作答狀態
      if (isHover) fill(220, 230, 242);
      else fill(255);
      stroke(200);
    }

    strokeWeight(2);
    rect(x, y, btnW, btnH, 10);

    // 繪製選項文字
    let optText = q.options[i] || '';
    if (/[a-zA-Z]/.test(optText)) {
      textFont(fontEN);
      textSize(26);
    } else {
      textFont(fontZH);
      textSize(20);
    }

    noStroke();
    // 依據背景調整文字顏色
    if (answered && (isCorrect || (isSelected && !isCorrect))) {
      fill(255);
    } else if (answered) {
      fill(150);
    } else {
      fill(40);
    }

    textAlign(CENTER, CENTER);
    
    // 如果已作答，在選項旁加上 ✓ 或 ✗ 標記
    let labelText = optText;
    if (answered) {
      if (isCorrect) labelText += "  ✓";
      else if (isSelected && !isCorrect) labelText += "  ✗";
    }
    
    text(labelText, x + btnW / 2, y + btnH / 2);

    optionBtns.push({ x: x, y: y, w: btnW, h: btnH, index: i });
  }

  // --- 底部導覽按鈕 ---
  let navY = height * 0.83;
  let navW = 140;
  let navH = 50;

  let nextX = width / 2 + 10;
  let prevX = width / 2 - navW - 10;

  // 上一題按鈕
  if (currentQuestionIndex > 0) {
    fill(189, 195, 199);
    rect(prevX, navY, navW, navH, 8);
    fill(40);
    textFont(fontZH);
    textSize(18);
    text("上一題", prevX + navW / 2, navY + navH / 2);
  }

  // 下一題 / 看結果按鈕
  let isLast = (currentQuestionIndex === quizList.length - 1);
  fill(answered ? (isLast ? color(231, 76, 60) : color(52, 152, 219)) : color(189, 195, 199));
  rect(nextX, navY, navW, navH, 8);
  
  fill(answered ? 255 : 100);
  textFont(fontZH);
  textSize(18);
  text(isLast ? "看結果" : "下一題", nextX + navW / 2, navY + navH / 2);

  nextBtn = { prevX, nextX, y: navY, w: navW, h: navH, isLast };
}

// 4. 成績結算與分析畫面
function drawResultScreen() {
  rectMode(CORNER);
  calculateResults();

  let totalScore = 0;
  let correctCount = 0;
  for (let i = 0; i < quizList.length; i++) {
    if (userAnswers[i] === quizList[i].correctIndex) correctCount++;
  }
  totalScore = Math.round((correctCount / quizList.length) * 100);

  fill(44, 62, 80);
  textFont(fontZH);
  textAlign(CENTER, TOP);
  textSize(min(width, height) * 0.05);
  text("測驗結果", width / 2, height * 0.06);

  // 分數卡片
  fill(255);
  stroke(220);
  strokeWeight(1);
  rect(width / 2 - 150, height * 0.15, 300, 100, 15);

  noStroke();
  fill(231, 76, 60);
  textFont(fontEN);
  textSize(55);
  text(`${totalScore}`, width / 2, height * 0.16);

  fill(120);
  textFont(fontZH);
  textSize(16);
  text(`答對 ${correctCount} / ${quizList.length} 題`, width / 2, height * 0.23);

  // 各單元弱點分析區塊
  let analysisY = height * 0.32;
  fill(52, 73, 94);
  textSize(22);
  text("【 各單元學習強弱分析 】", width / 2, analysisY);

  let startY = analysisY + 45;
  let units = Object.keys(unitStats);
  let boxW = min(width * 0.8, 600);
  let boxX = width / 2 - boxW / 2;

  for (let i = 0; i < units.length; i++) {
    let u = units[i];
    let stat = unitStats[u];
    let rate = stat.total > 0 ? (stat.correct / stat.total) : 0;
    let y = startY + i * 55;

    fill(255);
    stroke(230);
    rect(boxX, y, boxW, 45, 8);

    noStroke();
    fill(rate >= 0.7 ? color(46, 204, 113, 100) : color(231, 76, 60, 100));
    rect(boxX, y, boxW * rate, 45, 8);

    fill(40);
    textFont(fontZH);
    textSize(16);
    textAlign(LEFT, CENTER);
    text(`單元: ${u}`, boxX + 15, y + 22.5);

    textAlign(RIGHT, CENTER);
    let suggestion = rate < 0.6 ? " ⚠️ 需加強" : "  良好";
    text(`答對率: ${Math.round(rate * 100)}% (${stat.correct}/${stat.total})${suggestion}`, boxX + boxW - 15, y + 22.5);
  }

  // 再試一次按鈕
  let btnW = 200;
  let btnH = 55;
  let btnX = width / 2 - btnW / 2;
  let btnY = height * 0.85;

  let isHover = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
  fill(isHover ? color(52, 152, 219) : color(41, 128, 185));
  rect(btnX, btnY, btnW, btnH, 10);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("再測驗一次", width / 2, btnY + btnH / 2);

  restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
}


// ==========================================
// 結果統計數據分析計算
// ==========================================
function calculateResults() {
  unitStats = {};

  for (let i = 0; i < quizList.length; i++) {
    let q = quizList[i];
    let u = q.unit || '綜合';

    if (!unitStats[u]) {
      unitStats[u] = { total: 0, correct: 0 };
    }

    unitStats[u].total += 1;
    if (userAnswers[i] === q.correctIndex) {
      unitStats[u].correct += 1;
    }
  }
}


// ==========================================
// 播音控制函數
// ==========================================
function playCurrentSound() {
  for (let s of loadedSounds) {
    if (s && s.isPlaying()) s.stop();
  }

  let currentSound = loadedSounds[currentQuestionIndex];
  if (currentSound && currentSound.isLoaded()) {
    currentSound.play();
  }
}


// ==========================================
// 滑鼠點擊互動事件 Handling
// ==========================================
function mousePressed() {
  if (getAudioContext().state !== 'running') {
    userStartAudio();
  }

  if (gameState === 'START') {
    if (mouseX > restartBtn.x && mouseX < restartBtn.x + restartBtn.w &&
        mouseY > restartBtn.y && mouseY < restartBtn.y + restartBtn.h) {
      gameState = 'QUIZ';
      playCurrentSound();
    }
  } 
  else if (gameState === 'QUIZ') {
    let answered = userAnswers[currentQuestionIndex] !== -1;

    // 1. 點擊喇叭播放
    if (dist(mouseX, mouseY, width / 2, height * 0.28) < playSoundBtn.w / 2) {
      playCurrentSound();
    }

    // 2. 選擇選項 (僅未答時有效)
    if (!answered) {
      for (let btn of optionBtns) {
        if (mouseX > btn.x && mouseX < btn.x + btn.w &&
            mouseY > btn.y && mouseY < btn.y + btn.h) {
          userAnswers[currentQuestionIndex] = btn.index; // 當下紀錄並即時顯示對錯
        }
      }
    }

    // 3. 上一題
    if (currentQuestionIndex > 0) {
      if (mouseX > nextBtn.prevX && mouseX < nextBtn.prevX + nextBtn.w &&
          mouseY > nextBtn.y && mouseY < nextBtn.y + nextBtn.h) {
        currentQuestionIndex--;
        playCurrentSound();
      }
    }

    // 4. 下一題 / 看結果 (必須作答後才可以點擊下一步)
    if (mouseX > nextBtn.nextX && mouseX < nextBtn.nextX + nextBtn.w &&
        mouseY > nextBtn.y && mouseY < nextBtn.y + nextBtn.h) {
      
      if (userAnswers[currentQuestionIndex] === -1) {
        alert("請先選擇一個答案！");
        return;
      }

      if (nextBtn.isLast) {
        for (let s of loadedSounds) { if (s && s.isPlaying()) s.stop(); }
        gameState = 'RESULT';
      } else {
        currentQuestionIndex++;
        playCurrentSound();
      }
    }
  } 
  else if (gameState === 'RESULT') {
    if (mouseX > restartBtn.x && mouseX < restartBtn.x + restartBtn.w &&
        mouseY > restartBtn.y && mouseY < restartBtn.y + restartBtn.h) {
      initGame();
    }
  }
}