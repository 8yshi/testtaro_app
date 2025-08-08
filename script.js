let vocabularyData = [];
let currentTest = [];

// CSVファイル読み込み
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            parseCSV(event.target.result);
            document.querySelector('.file-input-button').textContent = `選択済み: ${file.name}`;
            updateRangeStatus();
        } catch (error) {
            showError('CSVファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
});

// CSV解析
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    vocabularyData = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV行を解析（カンマ区切り、クォートにも対応）
        const columns = parseCSVLine(line);
        
        if (columns.length >= 3) {
            const num = parseInt(columns[0]);
            const english = columns[1].trim();
            const japanese = columns[2].trim();
            
            if (!isNaN(num) && english && japanese) {
                vocabularyData.push({
                    number: num,
                    english: english,
                    japanese: japanese
                });
            }
        }
    }

    if (vocabularyData.length === 0) {
        throw new Error('有効な単語データが見つかりませんでした');
    }

    vocabularyData.sort((a, b) => a.number - b.number);
    showSuccess(`${vocabularyData.length}個の単語を読み込みました`);
    
    // 範囲の初期値を設定
    const maxNum = Math.max(...vocabularyData.map(item => item.number));
    document.getElementById('endNum').value = maxNum;
    
    document.getElementById('generateTest').disabled = false;
}

// CSV行解析（クォート対応）
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// 範囲状態更新
function updateRangeStatus() {
    const startNum = parseInt(document.getElementById('startNum').value);
    const endNum = parseInt(document.getElementById('endNum').value);
    
    if (vocabularyData.length > 0) {
        const availableWords = vocabularyData.filter(item => 
            item.number >= startNum && item.number <= endNum
        );
        
        const statusDiv = document.getElementById('rangeStatus');
        statusDiv.textContent = `指定範囲内の単語数: ${availableWords.length}個`;
        
        const questionCount = parseInt(document.getElementById('questionCount').value);
        if (availableWords.length < questionCount) {
            statusDiv.textContent += ` (問題数を${availableWords.length}以下にしてください)`;
            statusDiv.style.color = '#e53e3e';
        } else {
            statusDiv.style.color = '#38a169';
        }
    }
}

// テスト生成
document.getElementById('generateTest').addEventListener('click', function() {
    try {
        generateTest();
        showTestPreview();
        document.getElementById('downloadPDF').disabled = false;
        showSuccess('テスト問題を生成しました！');
    } catch (error) {
        showError('テスト生成に失敗しました: ' + error.message);
    }
});

function generateTest() {
    const startNum = parseInt(document.getElementById('startNum').value);
    const endNum = parseInt(document.getElementById('endNum').value);
    const questionCount = parseInt(document.getElementById('questionCount').value);
    const testType = document.getElementById('testType').value;

    // 範囲内の単語を取得
    const availableWords = vocabularyData.filter(item => 
        item.number >= startNum && item.number <= endNum
    );

    if (availableWords.length < questionCount) {
        throw new Error(`範囲内の単語数(${availableWords.length}個)が問題数(${questionCount}個)より少ないです`);
    }

    // ランダムに選択
    const shuffled = availableWords.sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, questionCount);

    currentTest = selectedWords.map((word, index) => {
        let questionType;
        if (testType === 'mixed') {
            questionType = Math.random() < 0.5 ? 'english-to-japanese' : 'japanese-to-english';
        } else {
            questionType = testType;
        }

        return {
            number: index + 1,
            word: word,
            type: questionType
        };
    });
}

function showTestPreview() {
    const previewDiv = document.getElementById('testPreview');
    const contentDiv = document.getElementById('previewContent');
    
    let html = '<div class="test-preview">';
    html += `<h4>📋 テスト問題 (${currentTest.length}問)</h4>`;
    
    currentTest.forEach(item => {
        const question = item.type === 'english-to-japanese' 
            ? item.word.english 
            : item.word.japanese;
        
        const questionLabel = item.type === 'english-to-japanese' 
            ? '日本語で答えてください' 
            : '英語で答えてください';
            
        html += `
            <div class="question">
                <strong>問${item.number}:</strong> ${question}
                <br><small>${questionLabel}</small>
                <br><br>答え: ___________________
            </div>
        `;
    });
    
    html += '</div>';
    contentDiv.innerHTML = html;
    previewDiv.style.display = 'block';
}

// PDF生成
document.getElementById('downloadPDF').addEventListener('click', function() {
    try {
        generatePDF();
        showSuccess('PDFをダウンロードしました！');
    } catch (error) {
        showError('PDF生成に失敗しました: ' + error.message);
    }
});

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 日本語フォント設定（簡易版）
    doc.setFont('helvetica');
    
    // タイトル
    doc.setFontSize(20);
    doc.text('英単語テスト', 105, 20, { align: 'center' });
    
    // 日付
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    doc.setFontSize(12);
    doc.text(`実施日: ${dateStr}`, 20, 35);
    doc.text(`問題数: ${currentTest.length}問`, 20, 45);
    
    // 名前欄
    doc.text('名前: ___________________', 120, 35);
    doc.text('点数: _____ / ' + currentTest.length, 120, 45);

    let y = 65;
    
    currentTest.forEach(item => {
        if (y > 250) {
            doc.addPage();
            y = 30;
        }
        
        const question = item.type === 'english-to-japanese' 
            ? item.word.english 
            : item.word.japanese;
        
        const questionLabel = item.type === 'english-to-japanese' 
            ? '(日本語で答えてください)' 
            : '(英語で答えてください)';
        
        doc.setFontSize(14);
        doc.text(`${item.number}. ${question}`, 20, y);
        
        doc.setFontSize(10);
        doc.text(questionLabel, 25, y + 8);
        
        // 答え欄
        doc.setFontSize(12);
        doc.text('答え: ___________________', 25, y + 20);
        
        y += 35;
    });

    // 解答欄を新しいページに追加
    doc.addPage();
    doc.setFontSize(18);
    doc.text('解答', 105, 20, { align: 'center' });
    
    y = 40;
    currentTest.forEach(item => {
        if (y > 260) {
            doc.addPage();
            y = 30;
        }
        
        const answer = item.type === 'english-to-japanese' 
            ? item.word.japanese 
            : item.word.english;
        
        doc.setFontSize(12);
        doc.text(`${item.number}. ${answer}`, 20, y);
        y += 15;
    });

    const filename = `英単語テスト_${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}.pdf`;
    doc.save(filename);
}

// 入力値変更時に範囲状態更新
['startNum', 'endNum', 'questionCount'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateRangeStatus);
});

// ユーティリティ関数
function showError(message) {
    const statusDiv = document.getElementById('generateStatus') || document.getElementById('fileStatus');
    statusDiv.innerHTML = `<div class="error">${message}</div>`;
}

function showSuccess(message) {
    const statusDiv = document.getElementById('generateStatus') || document.getElementById('fileStatus');
    statusDiv.innerHTML = `<div class="success">${message}</div>`;
}
