# 刷題寶｜個人刷題練習平台

適合 GitHub Pages 的靜態網站，採用 HTML、CSS、JavaScript 模組化架構。**公開版不包含題庫、答案、解析或使用者的學習紀錄。** 請只匯入自己有權使用的 JSON 題庫，且勿將題庫或學習備份提交至 GitHub。

## 專案結構

```text
shuati-bao/
├── index.html
├── css/style.css
├── js/
│   ├── app.js
│   ├── questionBank.js
│   ├── dataManagement.js
│   ├── practice.js
│   ├── storage.js
│   ├── statistics.js
│   └── clearStorage.js
├── .gitignore
├── .nojekyll
└── README.md
```

## 功能

- 首次開啟要求在瀏覽器匯入 JSON 題庫，不會從公開網站自動載入題庫。
- 支援章節練習、全部題目、隨機練習、未練習題目、錯題與收藏練習。
- 按「確認答案」才會顯示解析；直接結算時會自動確認已選但未確認的答案，未作答不計分。
- 結算後能查看答錯題目及解析；提供錯題本、訂正追蹤、收藏備註、學習統計。
- 可備份、還原、刪除單題紀錄及清除整個 localStorage。
- 題庫與學習紀錄儲存在瀏覽器的 localStorage；**不是加密儲存**，清除瀏覽器資料或改用不同裝置不會自動同步。

## 題庫格式

使用章節鍵名對應題目陣列的 JSON 物件；每題至少有 `id`、`question`、`options`、`answer`，可有 `explanation`。詳細支援以 `js/questionBank.js` 驗證規則為準。檔案限 5 MB。請勿在此公開儲存庫加入未經授權的題庫。

## 在本機預覽

於專案資料夾使用 VS Code Live Server，或執行 `python -m http.server 8000` 後開啟 `http://localhost:8000/`。請勿直接以 `file://` 開啟 `index.html`。

## GitHub Pages 部署（wuella1025/shuati-bao）

1. 將**本資料夾內的檔案與 css/、js/ 資料夾**放到儲存庫根目錄，不要多包一層 `shuati-bao/`。
2. 確保 GitHub 上的 `css/style.css`、`js/app.js` 路徑完全正確。
3. 前往 Settings → Pages → Build and deployment，選擇 Deploy from a branch、`main`、`/(root)`，儲存。
4. 網址預期為 `https://wuella1025.github.io/shuati-bao/`；進入後從本機匯入題庫。
5. 建議先確認所有檔案沒有私人題庫或學習備份，再提交。請注意已提交進 Git 歷史的檔案不會因刪除最新版本而消失。

## 安全注意

- `.gitignore` 會忽略 `*.json`、`data/`、`*backup*` 等項目，但**直接使用 GitHub 網頁上傳時不會自動替你過濾**；提交前仍需人工檢查。
- Content Security Policy、字串跳脫及匯入驗證可降低風險，但不代表經過全面滲透測試。
- `localStorage.clear()` 會清空同一 GitHub Pages 來源下的所有 localStorage，可能影響同帳號的其他 Pages 網站。
- 備份可能包含題庫的全部內容，請勿將備份上傳到公開 GitHub。
