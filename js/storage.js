const PREFIX = 'personal-quiz:v1:';
export function loadProgress(subjectId) {
  try {
    const value = JSON.parse(localStorage.getItem(PREFIX + subjectId) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
// Legacy/future sessions can be counted without relying on placeholder data.
export function summarizeProgress(bank, progress) {
  const valid = bank.questions.map(q => progress[q.id]).filter(v => v && typeof v === 'object');
  const practiced = valid.filter(r => Number(r.attempts) > 0).length;
  const attempts = valid.reduce((n,r) => n + (Number(r.attempts) || 0), 0);
  const correct = valid.reduce((n,r) => n + (Number(r.correct) || 0), 0);
  const wrong = valid.filter(r => Number(r.wrong) > 0 && !r.mastered).length;
  const favorites = valid.filter(r => r.favorite).length;
  const sections = bank.chapters.map(ch => ({ ...ch, practiced: bank.questions.filter(q => q.chapterId === ch.id && Number(progress[q.id]?.attempts) > 0).length }));
  return { total:bank.questions.length, practiced, remaining:bank.questions.length-practiced, attempts, correct, accuracy:attempts ? correct/attempts*100 : 0, wrong, favorites, sections };
}
const SESSION_PREFIX='personal-quiz:session:v1:';
const HISTORY_PREFIX='personal-quiz:history:v1:';
export function saveProgress(subjectId, progress){localStorage.setItem(PREFIX+subjectId,JSON.stringify(progress));}
export function loadSession(subjectId){try{return JSON.parse(localStorage.getItem(SESSION_PREFIX+subjectId)||'null');}catch{return null;}}
export function saveSession(subjectId,session){if(session)localStorage.setItem(SESSION_PREFIX+subjectId,JSON.stringify(session));else localStorage.removeItem(SESSION_PREFIX+subjectId);}
export function loadHistory(subjectId){try{const x=JSON.parse(localStorage.getItem(HISTORY_PREFIX+subjectId)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
export function addHistory(subjectId,entry){const history=loadHistory(subjectId);history.unshift(entry);localStorage.setItem(HISTORY_PREFIX+subjectId,JSON.stringify(history));}
export function deleteHistory(subjectId,finishedAt){
 const history=loadHistory(subjectId);
 const next=history.filter(entry=>entry.finishedAt!==finishedAt);
 localStorage.setItem(HISTORY_PREFIX+subjectId,JSON.stringify(next));
 return history.length-next.length;
}
export function deleteQuestionRecord(subjectId,id){
 const progress=loadProgress(subjectId);
 if(!Object.hasOwn(progress,id))return false;
 delete progress[id];saveProgress(subjectId,progress);
 return true;
}
