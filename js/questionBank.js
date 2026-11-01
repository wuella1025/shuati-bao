/** Parse the original chapter_* JSON without mutating the source. */
export function normalizeBank(raw, subjectId = 'java-midterm') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('題庫最外層必須是以章節名稱為鍵的物件。');
  const chapters = [], questions = [], ids = new Set(), errors = [];
  if (Object.keys(raw).length > 100) throw new Error("章節數不可超過 100。");
  for (const [chapterKey, entries] of Object.entries(raw)) {
    if (chapterKey.length > 120) throw new Error("章節名稱過長。");
    if (Array.isArray(entries) && entries.length > 5000) throw new Error("單章最多 5000 題。");
    if (!Array.isArray(entries)) { errors.push(`${chapterKey}：章節內容必須是題目陣列`); continue; }
    chapters.push({ id: chapterKey, title: /^chapter_(\d+)$/.test(chapterKey) ? `第 ${chapterKey.match(/\d+$/)[0]} 章` : chapterKey, count: entries.length });
    entries.forEach((q, index) => {
      const loc = `${chapterKey} 第 ${index + 1} 題`;
      if (!q || typeof q !== 'object' || Array.isArray(q)) { errors.push(`${loc}：題目不是物件`); return; }
      if (!['string','number'].includes(typeof q.id) || String(q.id).trim() === '') { errors.push(`${loc}：缺少有效 id`); return; }
      if (typeof q.question !== 'string' || !q.question.trim()) { errors.push(`${loc}：缺少題目內容`); return; }
      if (String(q.id).length > 120 || q.question.length > 12000) { errors.push(`${loc}：題號或題目內容過長`); return; }
      const id = `${subjectId}:${chapterKey}:${q.id}`;
      if (ids.has(id)) { errors.push(`${loc}：章節內重複 id ${q.id}`); return; }
      ids.add(id);
      const options = q.options && typeof q.options === 'object' && !Array.isArray(q.options) ? Object.entries(q.options) : [];
      if (options.length > 30 || options.some(([key,value])=>key.length > 80 || typeof value !== 'string' || value.length > 5000)) { errors.push(`${loc}：選項數量或內容超出限制`); return; }
      if (typeof q.explanation === 'string' && q.explanation.length > 20000) { errors.push(`${loc}：解析過長`); return; }
      let type = 'unsupported';
      if (options.length && typeof q.answer === 'string' && Object.prototype.hasOwnProperty.call(q.options, q.answer)) type = 'single';
      else if (options.length && Array.isArray(q.answer) && q.answer.length && q.answer.every(v => Object.prototype.hasOwnProperty.call(q.options, v))) type = 'multiple';
      else if (!options.length && ['string','number','boolean'].includes(typeof q.answer)) type = 'text';
      if (!type || type === 'unsupported') errors.push(`${loc}：無法辨識答案或題型`);
      questions.push({ id, originalId: q.id, chapterId: chapterKey, chapterTitle: chapters[chapters.length-1].title, text: q.question, options, answer: q.answer, explanation: typeof q.explanation === 'string' ? q.explanation : '', type });
    });
  }
  if (questions.length > 20000) errors.push("題庫不可超過 20000 題");
  if (!chapters.length || !questions.length) errors.push('題庫沒有有效題目');
  if (errors.length) throw new Error(`題庫驗證未通過（${errors.length} 個問題）：\n${errors.slice(0, 8).join('\n')}${errors.length > 8 ? '\n…' : ''}`);
  return { subjectId, subjectName: '個人題庫', chapters, questions, questionMap: new Map(questions.map(q => [q.id, q])) };
}
