# 刷題寶｜私人 JSON／ZIP 題庫匯入版

此資料夾內容可以公開上傳 GitHub Pages；**沒有內建題庫、答案、圖片或個人學習資料**。

## 上傳到 GitHub
將 `index.html`、`css/`、`js/`、`README.md`、`.nojekyll` 等保留原目錄結構，更新到 `shuati-bao` 儲存庫根目錄（`main` 分支）。請**勿上傳任何私人題庫 ZIP／JSON 或來源 PDF**。

## 私人使用者匯入
1. 開啟 GitHub Pages 網站 `https://wuella1025.github.io/shuati-bao/`。
2. 首次進入選擇本機 `Java五章題庫與原頁參照.zip`（含 250 題 JSON 和 125 張原頁圖片），按「驗證並匯入題庫」。亦可匯入純 JSON，但沒有圖片可供查看。
3. 第 1~5 章獨立顯示。原始 Java 程式碼保留文字中的換行並用等寬檢視視覺參照。
4. 題目確認作答後，「查看原始頁面（含答案）」可讀取本機保存的圖片。**原頁含同頁其他題的答案，僅適合確認作答後核對，不應作為作答前的圖片題幹。**
5. 圖片儲存在 IndexedDB，文字題庫及答題紀錄儲存在 localStorage。不同裝置不會同步。瀏覽器清除網站資料可能刪除兩者。

## 重要限制
- ZIP 的圖片是來源 PDF **完整頁面**，不是逐題裁切的「只包含題幹」圖片；程式碼擷取有版面遺漏風險時可核對原頁，尚未逐題人工校正。
- 一鍵清空 localStorage 只會清除 localStorage；**不會同步清除 IndexedDB 圖片**。如果要完全刪除私人題庫資料，請在瀏覽器設定清除這個網站的所有站點資料（含 IndexedDB）。
- 題庫不會由網頁程式主動上傳，但本機瀏覽器儲存不具備加密保證。不要在共用裝置上儲存私人資料。
- JSON／ZIP 都只能在有權使用原教材的範圍內私人匯入使用。

## 基本格式
最外層支援 `chapter_1` 至 `chapter_5` 題目陣列，且可包含 `subject`、`schema_version`、`note` 等資訊。每題仍保留 `id`, `question`, `options`, `answer`, `explanation`, `reference_page_images`。


## 題型與題圖完整顯示
支援單選、多選、是非、填充與問答題（問答題人工自評，不會假裝自動評分）。
對應的私人 ZIP 題庫新增 `question_only_images`，包含 250 題各自從 PDF 擷取的題目及選項區塊，不包含答案解析。
這些題目截圖會於作答前從本機 IndexedDB 顯示；`reference_page_images` 原頁含答案，只能作答確認後開啟。
禁止將私人題庫或圖片上傳到公開 GitHub。
