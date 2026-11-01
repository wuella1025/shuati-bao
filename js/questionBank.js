/** Parse the original chapter_* JSON without mutating the source. */
export function normalizeBank(raw, subjectId = 'java-midterm') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('題庫最外層必須是以章節名稱為鍵的物件。');
  const chapters = [], questions = [], ids = new Set(), errors = [];
  for (const [chapterKey, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries)) { errors.push(`${chapterKey}：章節內容必須是題目陣列`); continue; }
    chapters.push({ id: chapterKey, title: /^chapter_(\d+)$/.test(chapterKey) ? `第 ${chapterKey.match(/\d+$/)[0]} 章` : chapterKey, count: entries.length });
    entries.forEach((q, index) => {
      const loc = `${chapterKey} 第 ${index + 1} 題`;
      if (!q || typeof q !== 'object' || Array.isArray(q)) { errors.push(`${loc}：題目不是物件`); return; }
      if (!['string','number'].includes(typeof q.id) || String(q.id).trim() === '') { errors.push(`${loc}：缺少有效 id`); return; }
      if (typeof q.question !== 'string' || !q.question.trim()) { errors.push(`${loc}：缺少題目內容`); return; }
      const id = `${subjectId}:${chapterKey}:${q.id}`;
      if (ids.has(id)) { errors.push(`${loc}：章節內重複 id ${q.id}`); return; }
      ids.add(id);
      const options = q.options && typeof q.options === 'object' && !Array.isArray(q.options) ? Object.entries(q.options) : [];
      let type = 'unsupported';
      if (options.length && typeof q.answer === 'string' && Object.prototype.hasOwnProperty.call(q.options, q.answer)) type = 'single';
      else if (options.length && Array.isArray(q.answer) && q.answer.length && q.answer.every(v => Object.prototype.hasOwnProperty.call(q.options, v))) type = 'multiple';
      else if (!options.length && ['string','number','boolean'].includes(typeof q.answer)) type = 'text';
      if (!type || type === 'unsupported') errors.push(`${loc}：無法辨識答案或題型`);
      questions.push({ id, originalId: q.id, chapterId: chapterKey, chapterTitle: chapters[chapters.length-1].title, text: q.question, options, answer: q.answer, explanation: typeof q.explanation === 'string' ? q.explanation : '', type });
    });
  }
  if (!chapters.length || !questions.length) errors.push('題庫沒有有效題目');
  if (errors.length) throw new Error(`題庫驗證未通過（${errors.length} 個問題）：\n${errors.slice(0, 8).join('\n')}${errors.length > 8 ? '\n…' : ''}`);
  return { subjectId, subjectName: 'Java 期中考', chapters, questions, questionMap: new Map(questions.map(q => [q.id, q])) };
}
export async function loadBank(url, fetcher = fetch) {
  let response;
  try { response = await fetcher(url); } catch { throw new Error('題庫讀取失敗。請透過本機伺服器開啟網站，勿直接雙擊 HTML。'); }
  if (!response.ok) throw new Error(`題庫讀取失敗（HTTP ${response.status}）。請確認 data/Java期中考.json 存在。`);
  let raw;
  try { raw = await response.json(); } catch { throw new Error('題庫不是有效 JSON，請檢查檔案格式。'); }
  return normalizeBank(raw);
}
