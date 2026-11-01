import { normalizeBank } from './questionBank.js';
import { loadProgress, loadSession, loadHistory } from './storage.js';

export const SUBJECT_ID = 'java-midterm'; // 舊版儲存鍵相容，並非內建題庫
const BANK_KEY = `personal-quiz:bank:v1:${SUBJECT_ID}`;
const keys = id => ({progress:`personal-quiz:v1:${id}`,session:`personal-quiz:session:v1:${id}`,history:`personal-quiz:history:v1:${id}`});
export function readImportedBank(storage=localStorage){
  const text=storage.getItem(BANK_KEY);
  if(!text)return null;
  try { const raw=JSON.parse(text);return {bank:normalizeBank(raw,SUBJECT_ID),raw}; }
  catch(error){throw new Error(`已匯入的題庫無法載入：${error.message}。請先備份資料，再檢查或清除這個網站的題庫設定。`);}
}
export function validateImportedBank(text){
  let raw;
  try{raw=JSON.parse(text);}catch{throw new Error('匯入失敗：檔案不是有效 JSON。');}
  const bank=normalizeBank(raw,SUBJECT_ID);
  return {raw,bank};
}
export function saveImportedBank(raw,storage=localStorage){
  normalizeBank(raw,SUBJECT_ID);
  storage.setItem(BANK_KEY,JSON.stringify(raw));
}
export function removeImportedBank(storage=localStorage){storage.removeItem(BANK_KEY);}
export function createBackup(subjectId=SUBJECT_ID,storage=localStorage){
  const k=keys(subjectId);
  const parse=(key,fallback)=>{const text=storage.getItem(key);return text===null?fallback:JSON.parse(text);};
  return {format:'studyflow-backup',version:1,subjectId,exportedAt:new Date().toISOString(),progress:parse(k.progress,{}),session:parse(k.session,null),history:parse(k.history,[]),importedBank:parse(BANK_KEY,null)};
}
export function validateBackup(data,subjectId=SUBJECT_ID){
  if (JSON.stringify(data).length > 5 * 1024 * 1024) throw new Error('備份內容過大。');
  if(!data||typeof data!=='object'||Array.isArray(data)||data.format!=='studyflow-backup'||data.version!==1||data.subjectId!==subjectId)throw new Error('備份格式、版本或科目不符合目前網站。');
  if(!data.progress||typeof data.progress!=='object'||Array.isArray(data.progress)||!Array.isArray(data.history)||!(data.session===null||data.session===undefined||(typeof data.session==='object'&&!Array.isArray(data.session))))throw new Error('備份的作答紀錄、練習狀態或成績歷史格式錯誤。');
  if (Object.keys(data.progress).length > 20000 || data.history.length > 10000) throw new Error('備份紀錄數超過上限。');
  for(const h of data.history){
    if (!h || typeof h !== 'object' || Array.isArray(h) || !Number.isSafeInteger(h.answered) || h.answered < 0 || !Number.isSafeInteger(h.correct) || h.correct < 0 || h.correct > h.answered || typeof h.finishedAt !== 'string' || !Number.isFinite(Date.parse(h.finishedAt))) throw new Error('歷史成績資料無效。');
    if (h.ids !== undefined && (!Array.isArray(h.ids) || h.ids.length > 20000 || h.ids.some(id=>typeof id!=='string'||id.length>300))) throw new Error('歷史題號無效。');
    if (h.answers !== undefined && (!h.answers || typeof h.answers!=='object' || Array.isArray(h.answers) || Object.keys(h.answers).length>20000)) throw new Error('歷史答案資料無效。');
  }
  for(const [id,r] of Object.entries(data.progress)){
    if(id.length > 300 || !id.startsWith(`${subjectId}:`)||!r||typeof r!=='object'||Array.isArray(r))throw new Error('備份包含無效題目 ID 或紀錄。');
    if (r.note !== undefined && (typeof r.note!=='string' || r.note.length>5000)) throw new Error('備註內容過長。');
    for(const field of ['attempts','correct','wrong','streak'])if(r[field]!==undefined&&(!Number.isSafeInteger(r[field])||r[field]<0))throw new Error(`備份中 ${id} 的 ${field} 不合法。`);
    if((r.correct||0)+(r.wrong||0)>(r.attempts||0))throw new Error(`備份中 ${id} 的答題次數不一致。`);
  }
  if(data.session != null && (data.session.ids?.length > 20000 || Object.keys(data.session.answers||{}).length > 20000)) throw new Error('未完成練習資料過大。');
  if(data.session!=null&&(!Array.isArray(data.session.ids)||!data.session.answers||typeof data.session.answers!=='object'||Array.isArray(data.session.answers)))throw new Error('練習中的題目資料格式錯誤。');
  if(data.importedBank!==null&&data.importedBank!==undefined)normalizeBank(data.importedBank,subjectId);
  return data;
}
export function restoreBackup(data,subjectId=SUBJECT_ID,storage=localStorage){
  validateBackup(data,subjectId);
  const k=keys(subjectId);
  const entries=[[k.progress,JSON.stringify(data.progress)],[k.history,JSON.stringify(data.history)],[k.session,data.session==null?null:JSON.stringify(data.session)],[BANK_KEY,data.importedBank==null?null:JSON.stringify(data.importedBank)]];
  // Keep a snapshot so quota or storage errors do not leave a half-restored backup.
  const old=entries.map(([key])=>[key,storage.getItem(key)]);
  try{for(const [key,value] of entries){if(value===null)storage.removeItem(key);else storage.setItem(key,value);}}
  catch(error){for(const [key,value] of old){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{}}throw error;}
}
export function resetLearning(subjectId=SUBJECT_ID,storage=localStorage){const k=keys(subjectId);for(const key of Object.values(k))storage.removeItem(key);}
export function storedInfo(bank,storage=localStorage){
  const progress=loadProgress(bank.subjectId),session=loadSession(bank.subjectId),history=loadHistory(bank.subjectId);
  const active=new Set(bank.questions.map(q=>q.id));
  return {activeRecords:Object.keys(progress).filter(id=>active.has(id)).length,orphanRecords:Object.keys(progress).filter(id=>!active.has(id)).length,hasSession:!!session,history:history.length};
}
