import { parseQuestionZip, saveMedia, getMedia, clearMedia } from './media.js';
import { clearAllLocalStorage } from './clearStorage.js';
import { readImportedBank, validateImportedBank, saveImportedBank, removeImportedBank, createBackup, restoreBackup, resetLearning, storedInfo } from './dataManagement.js';
import { loadProgress, saveProgress, loadSession, saveSession, loadHistory, addHistory, deleteHistory, deleteQuestionRecord, summarizeProgress } from './storage.js';
import { learningStatistics } from './statistics.js';
import { candidates, selectQuestions, grade, recordAnswer, finalizeDraftAnswers, sessionResult, mistakeStatus, toggleFavorite, setFavoriteNote, markCorrected } from './practice.js';

const state = { bank: null, page: 'dashboard', chapter: 'all', search: '', pageNumber: 1, revealed: new Set(), session: null, wrongChapter:'all', wrongStatus:'all', favoriteChapter:'all' };
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const backdrop = document.getElementById('backdrop');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n).toLocaleString('zh-TW');
const safePercent = n => Math.max(0,Math.min(100,Number.isFinite(Number(n))?Number(n):0));
const pct = (x,y) => y ? (100*x/y).toFixed(0) : '0';
const title = (eyebrow, heading, detail) => `<div class="eyebrow">${esc(eyebrow)}</div><h1 class="page-title">${esc(heading)}</h1><p class="muted intro">${esc(detail)}</p>`;
const pageTitles = { dashboard:'首頁儀表板', bank:'題庫瀏覽', practice:'題庫練習', wrong:'錯題本', favorites:'收藏題目', stats:'學習統計', settings:'題庫設定' };
function toggleMenu(open) { sidebar.classList.toggle('open',open); backdrop.hidden = !open; menuToggle.setAttribute('aria-expanded', String(open)); }
menuToggle.addEventListener('click',()=>toggleMenu(!sidebar.classList.contains('open')));
backdrop.addEventListener('click',()=>toggleMenu(false));
document.addEventListener('keydown',e=>{ if(e.key==='Escape') toggleMenu(false); });
function navigate(page) {
  if (!pageTitles[page]) return;
  state.page = page;
  document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  toggleMenu(false);
  render();
  window.scrollTo(0,0);
}
document.querySelector('.nav').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)navigate(b.dataset.page);});
function recordStats() {
  const progress=loadProgress(state.bank.subjectId);
  return summarizeProgress(state.bank,progress);
}
const displayTime = value => { const d=new Date(value); return Number.isNaN(d.getTime())?'日期不明':d.toLocaleString('zh-TW'); };
const displayPct = value => `${Number(value).toFixed(1)}%`;
function svgLine(sessions){
 if(!sessions.length)return '<div class="empty">尚無已結算的練習，完成一次練習後就會顯示趨勢。</div>';
 const w=700,h=240,left=44,right=18,top=17,bottom=36,iw=w-left-right,ih=h-top-bottom;
 const pts=sessions.map((s,i)=>({x:left+(sessions.length===1?iw/2:i*iw/(sessions.length-1)),y:top+ih-(s.accuracy/100)*ih,s}));
 const coords=pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
 const lines=[0,25,50,75,100].map(t=>{const y=top+ih-t/100*ih;return `<line x1="${left}" y1="${y}" x2="${w-right}" y2="${y}" stroke="#e6edf7"/><text x="${left-8}" y="${y+4}" text-anchor="end" font-size="11" fill="#6b7b92">${t}%</text>`;}).join('');
 return `<div class="chart-scroll"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="歷次練習成績折線圖，依完成時間由早到晚" class="trend-chart">${lines}<polyline points="${coords}" fill="none" stroke="#2876e8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#2876e8"><title>第 ${i+1} 次：${displayPct(p.s.accuracy)}，${esc(displayTime(p.s.finishedAt))}</title></circle>`).join('')}<text x="${left}" y="${h-8}" font-size="11" fill="#6b7b92">第 1 次</text><text x="${w-right}" y="${h-8}" text-anchor="end" font-size="11" fill="#6b7b92">第 ${sessions.length} 次</text></svg></div>`;
}
function sectionBars(sections){return `<div class="chapter-bars">${sections.map(s=>`<div class="bar-line"><span>${esc(s.title)}</span><div class="bar-track"><div class="bar-fill" style="width:${safePercent(s.accuracy)}%"></div></div><strong>${s.attempts?displayPct(s.accuracy):'未作答'}</strong><small>${s.correct}/${s.attempts} 次</small></div>`).join('')}</div>`;}
function statsPage(){
 const st=learningStatistics(state.bank,loadProgress(state.bank.subjectId),loadHistory(state.bank.subjectId));
 const metrics=[['已練習不同題目',`${fmt(st.practiced)} / ${fmt(st.total)}`],['累積作答次數',fmt(st.attempts)],['累積答對次數',fmt(st.correct)],['整體正確率',st.attempts?displayPct(st.accuracy):'尚無資料'],['平均練習成績',st.averageSession===null?'尚無資料':displayPct(st.averageSession)],['最高練習成績',st.bestSession===null?'尚無資料':displayPct(st.bestSession)],['歷次已結算練習',fmt(st.sessions.length)],['歷史錯題／已掌握',`${fmt(st.mistakeQuestions)} / ${fmt(st.mastered)}`]];
 content.innerHTML=title('LEARNING ANALYTICS','學習統計','所有數字都根據這個科目的真實作答與已結算練習紀錄計算。')+
 `<section class="metric-grid">${metrics.map(([n,v])=>`<div class="card"><div class="metric-title">${esc(n)}</div><div class="metric-value">${esc(v)}</div></div>`).join('')}</section>`+
 `<section class="analytics-grid"><article class="card"><h2>歷次練習正確率</h2><p class="muted">每個點代表一次已結算練習；正確率只以當次已確認題目計算。</p>${svgLine(st.sessions)}</article><article class="card"><h2>已練習題目比例</h2><div class="donut-layout"><div class="donut" style="--percent:${safePercent(st.total?100*st.practiced/st.total:0)}"><strong>${st.total?displayPct(100*st.practiced/st.total):'0%'}</strong></div><div><p>已練習：<b>${fmt(st.practiced)} 題</b></p><p>未練習：<b>${fmt(st.remaining)} 題</b></p><p class="muted">重複答同一題只計算為一題已練習。</p></div></div></article></section>`+
 `<div class="section-header"><h2>各章節正確率</h2></div><article class="card">${sectionBars(st.sections)}</article>`+
 `<div class="section-header"><h2>各章節練習進度</h2></div><div class="chapter-grid">${st.sections.map((ch,i)=>`<article class="card"><div class="chapter-row"><div class="chapter-icon">${i+1}</div><div class="chapter-detail"><h3>${esc(ch.title)}</h3><p>${fmt(ch.practiced)} / ${fmt(ch.total)} 題</p></div><strong>${displayPct(ch.progress)}</strong></div><div class="progress-track"><div class="progress-bar" style="width:${safePercent(ch.progress)}%"></div></div></article>`).join('')}</div>`+
 `<div class="section-header"><h2>錯題改善狀況</h2></div><section class="metric-grid"><div class="card"><div class="metric-title">曾答錯題目</div><div class="metric-value">${fmt(st.mistakeQuestions)}</div></div><div class="card"><div class="metric-title">已掌握（連對三次）</div><div class="metric-value">${fmt(st.mastered)}</div></div><div class="card"><div class="metric-title">已訂正但未掌握</div><div class="metric-value">${fmt(st.corrected)}</div></div><div class="card"><div class="metric-title">尚未掌握錯題</div><div class="metric-value">${fmt(st.pending)}</div></div></section>`+
 `<div class="section-header"><h2>練習成績紀錄</h2></div><div class="card history-wrap">${st.sessions.length?`<table class="history-table"><thead><tr><th>完成時間</th><th>模式</th><th>已確認</th><th>答對</th><th>正確率</th><th>操作</th></tr></thead><tbody>${[...st.sessions].reverse().map(s=>`<tr><td>${esc(displayTime(s.finishedAt))}</td><td>${esc(({all:'全部',chapter:'章節',random:'隨機',unpracticed:'未練習',wrong:'錯題',favorites:'收藏'})[s.mode]||s.mode||'未記錄')}</td><td>${fmt(s.answered)}</td><td>${fmt(s.correct)}</td><td>${displayPct(s.accuracy)}</td><td><button class="btn btn-secondary" data-history-review="${esc(s.finishedAt)}" ${s.ids&&s.answers?'':'disabled title="舊版紀錄沒有逐題資料"'}>檢視</button> <button class="btn btn-danger" data-history-delete="${esc(s.finishedAt)}">刪除</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">尚無練習紀錄。請先完成並結算一次練習。</div>'}</div>`;
 content.querySelectorAll('[data-history-delete]').forEach(btn=>btn.onclick=()=>{if(!confirm('確定刪除這一次練習的成績歷史？逐題累積作答紀錄不會隨之刪除；若要刪除單題紀錄，請到設定頁操作。'))return;deleteHistory(state.bank.subjectId,btn.dataset.historyDelete);statsPage();});
 content.querySelectorAll('[data-history-review]').forEach(btn=>btn.onclick=()=>{const h=loadHistory(state.bank.subjectId).find(x=>x.finishedAt===btn.dataset.historyReview);if(!h||!h.ids||!h.answers)return;state.historyReview=h;content.innerHTML=title('SESSION REVIEW','歷史練習詳解',displayTime(h.finishedAt))+`<div class="card"><button class="btn btn-secondary" id="backStats">← 返回統計</button></div><div class="section-header"><h2>本次答錯題目</h2></div><section class="question-list">${reviewDetails(h)}</section>`;document.getElementById('backStats').onclick=statsPage;});

}
function dashboard(){
 const s=recordStats();
 const detailed=learningStatistics(state.bank,loadProgress(state.bank.subjectId),loadHistory(state.bank.subjectId));
 const items=[['題庫總題數',fmt(s.total),'來自 JSON 題庫'],['已練習題目',fmt(s.practiced),`尚有 ${fmt(s.remaining)} 題未練習`],['累積作答次數',fmt(s.attempts),'不重複作答也會記錄'],['整體正確率',`${s.accuracy.toFixed(1)}%`,`${fmt(s.correct)} 次答對`],['未練習題目',fmt(s.remaining),'等待你的首次練習'],['待複習錯題',fmt(s.wrong),'尚未掌握的錯題'],['收藏題目',fmt(s.favorites),'你標記的題目'],['章節數量',fmt(s.sections.length),'依原始 JSON 章節統計']];
 content.innerHTML=title('OVERVIEW','學習儀表板','根據 個人題庫原始題庫與本機學習紀錄統計')+
 `<section class="hero"><div><div class="eyebrow">PERSONAL LEARNING</div><h2>準備好開始刷題了嗎？</h2><p>目前已載入 ${fmt(s.total)} 題、${s.sections.length} 個章節。可以開始刷題、確認答案並追蹤練習成果。</p></div><button class="btn btn-light" id="heroBrowse">開始練習 →</button></section>`+
 `<section class="metric-grid">${items.map(([name,value,note])=>`<div class="card"><div class="metric-title">${esc(name)}</div><div class="metric-value">${esc(value)}</div><div class="metric-note">${esc(note)}</div></div>`).join('')}</section>`+
 `<div class="section-header"><h2>各章節練習進度</h2><button class="text-link" id="allChapters">查看所有題目 →</button></div>`+
 `<section class="chapter-grid">${s.sections.map((ch,i)=>`<article class="card"><div class="chapter-row"><div class="chapter-icon">${i+1}</div><div class="chapter-detail"><h3>${esc(ch.title)}</h3><p>${fmt(ch.practiced)} / ${fmt(ch.count)} 題已練習</p></div><strong class="chapter-percent">${pct(ch.practiced,ch.count)}%</strong></div><div class="progress-track"><div class="progress-bar" style="width:${pct(ch.practiced,ch.count)}%"></div></div><button class="text-link" data-browse-chapter="${esc(ch.id)}" style="padding:12px 0 0">查看本章題目 →</button></article>`).join('')}</section>`+
 `<div class="section-header"><h2>最近練習紀錄</h2><button class="text-link" id="openStats">查看統計 →</button></div><div class="card"><div class="empty">${detailed.sessions.length ? [...detailed.sessions].reverse().slice(0,5).map(h=>`${esc(displayTime(h.finishedAt))}：${fmt(h.correct)}/${fmt(h.answered)} 題正確（${displayPct(h.accuracy)}）`).join('<hr>') : '尚無已結算的練習紀錄。'}</div></div>`+`<div class="card"><h2>最近一次練習成績</h2><p>${detailed.lastSession?`${fmt(detailed.lastSession.correct)} / ${fmt(detailed.lastSession.answered)} 題 · ${displayPct(detailed.lastSession.accuracy)}`:'尚未有已結算的練習。'}</p></div>`;
 document.getElementById('openStats').onclick=()=>navigate('stats'); document.getElementById('heroBrowse').onclick=()=>navigate('practice'); document.getElementById('allChapters').onclick=()=>navigate('bank');
 content.querySelectorAll('[data-browse-chapter]').forEach(b=>b.onclick=()=>{state.chapter=b.dataset.browseChapter;state.pageNumber=1;navigate('bank')});
}
function filteredQuestions(){return state.bank.questions.filter(q=>(state.chapter==='all'||q.chapterId===state.chapter)&&(!state.search||`${q.text} ${q.originalId} ${q.chapterTitle} ${q.options.map(p=>p.join(' ')).join(' ')}`.toLowerCase().includes(state.search.toLowerCase())));}
function bankPage(){
 const all=filteredQuestions(), perPage=10, pages=Math.max(1,Math.ceil(all.length/perPage));state.pageNumber=Math.max(1,Math.min(state.pageNumber,pages));
 const slice=all.slice((state.pageNumber-1)*perPage,state.pageNumber*perPage);
 content.innerHTML=title('QUESTION BANK','題庫瀏覽',`目前題庫共有 ${fmt(state.bank.questions.length)} 題；此頁僅供瀏覽，不會記錄答題。`)+
 `<div class="toolbar"><input id="searchInput" class="field search" type="search" placeholder="搜尋題目、選項或題號…" aria-label="搜尋題目" value="${esc(state.search)}"><select class="field" id="chapterFilter" aria-label="篩選章節"><option value="all">所有章節</option>${state.bank.chapters.map(ch=>`<option value="${esc(ch.id)}" ${state.chapter===ch.id?'selected':''}>${esc(ch.title)}（${ch.count} 題）</option>`).join('')}</select></div>`+
 `<div class="section-header"><h2>題目清單</h2><span class="muted" style="font-size:13px">符合條件 ${all.length} 題</span></div>`+
 `<section class="question-list">${slice.length?slice.map(q=>`<article class="card question-card"><div class="question-head"><span class="pill">${esc(q.chapterTitle)} · 第 ${esc(q.originalId)} 題</span><span class="muted" style="font-size:12px">${q.type==='single'?'單選題':q.type==='multiple'?'多選題':q.type==='text'?'填答題':q.type==='boolean'?'是非題':q.type==='essay'?'問答題':'尚未支援'}</span></div><div class="question-text">${renderQuestionBody(q)}</div>${questionMedia(q)}<div class="option-list">${q.options.map(([key,value])=>`<div class="option"><b>${esc(key)}</b>${esc(value)}</div>`).join('')}</div><div class="question-foot"><small>此頁為題庫預覽，非作答模式</small><button type="button" class="btn btn-secondary" data-reveal="${esc(q.id)}" aria-expanded="${state.revealed.has(q.id)}">${state.revealed.has(q.id)?'收起答案':'查看答案與解析'}</button></div>${state.revealed.has(q.id)?`<div class="answer-panel"><div><b>正確答案：</b>${esc(Array.isArray(q.answer)?q.answer.join('、'):q.answer)}</div><div><b>解析：</b>${esc(q.explanation||'原始題庫未提供解析')}</div></div>${referenceButton(q,true)}`:''}</article>`).join(''):`<div class="card empty">找不到符合搜尋條件的題目。</div>`}</section>`+
 `<div class="page-controls"><button class="btn btn-secondary" id="prevPage" ${state.pageNumber===1?'disabled':''}>上一頁</button><span>第 ${state.pageNumber} / ${pages} 頁</span><button class="btn btn-secondary" id="nextPage" ${state.pageNumber===pages?'disabled':''}>下一頁</button></div>`;
 const input=document.getElementById('searchInput');
 input.oninput=()=>{const v=input.value, caret=input.selectionStart;state.search=v;state.pageNumber=1;bankPage();const next=document.getElementById('searchInput');next.focus();next.setSelectionRange(caret,caret);};
 document.getElementById('chapterFilter').onchange=e=>{state.chapter=e.target.value;state.pageNumber=1;bankPage();};
 document.getElementById('prevPage').onclick=()=>{state.pageNumber--;bankPage();};
 document.getElementById('nextPage').onclick=()=>{state.pageNumber++;bankPage();};
 content.querySelectorAll('[data-reveal]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.reveal;if(state.revealed.has(id))state.revealed.delete(id);else state.revealed.add(id);bankPage();});
}
function renderQuestionBody(q){
 const blocks=q?.contentBlocks?.length?q.contentBlocks:[{type:'text',value:q.text}];
 return blocks.map(block=>{
  if(block.type==='text')return `<div class="mixed-text preline">${esc(block.value)}</div>`;
  if(block.type==='code')return `<div class="mixed-code"><div class="mixed-code-label">${esc(block.language||'程式碼')}</div><pre><code>${esc(block.value)}</code></pre></div>`;
  if(block.type==='image')return `<div class="question-media"><div class="media-caption">${esc(block.alt||'題目附圖')}</div><div data-private-block-image="${esc(block.src)}">圖片讀取中…</div></div>`;
  return '';
 }).join('');
}
function questionMedia(q){
 if(!q?.questionImages?.length)return '';
 return `<div class="question-media"><div class="media-caption">原始題目畫面（僅題目與選項，不含答案）</div><div data-private-question="${esc(q.id)}">圖片讀取中…</div></div>`;
}
// Render question-only crops from locally imported ZIP. Never use full answer-bearing pages before confirmation.
async function hydrateQuestionMedia(){
 const bank=state.bank;if(!bank)return;
 for(const node of content.querySelectorAll('[data-private-block-image]:not([data-ready])')){
  node.dataset.ready='1';const path=node.dataset.privateBlockImage;
  try{const blob=await getMedia(path);node.replaceChildren();if(!blob){node.textContent='題目圖片缺失，請重新匯入包含圖片的私人 ZIP。';continue;}
   const url=URL.createObjectURL(blob);const img=document.createElement('img');img.src=url;img.className='question-source-image';img.alt='題目附圖';img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);node.append(img);
  }catch(e){node.textContent='題目圖片載入失敗。'}
 }
 for(const node of content.querySelectorAll('[data-private-question]:not([data-ready])')){
  node.dataset.ready='1';const q=bank.questionMap.get(node.dataset.privateQuestion);if(!q)continue;
  node.textContent='';
  for(const path of q.questionImages||[]){
   try{const blob=await getMedia(path);if(!blob){const t=document.createElement('p');t.textContent='題目附圖缺失，請重新匯入含題目圖片的私人 ZIP。';node.append(t);continue;}
    const img=document.createElement('img');const url=URL.createObjectURL(blob);img.src=url;img.className='question-source-image';img.alt='原教材題目與選項原貌（無答案）';img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);node.append(img);
   }catch(e){const t=document.createElement('p');t.textContent='題目圖片載入失敗：'+e.message;node.append(t);}
  }
 }
}
const imageObserver=new MutationObserver(()=>{void hydrateQuestionMedia()});
imageObserver.observe(content,{childList:true,subtree:true});
function referenceButton(q,visible=false){
 if(!q?.referenceImages?.length||!visible)return '';
 return `<div class="source-reference"><p class="small-note">來源原頁可能包含本題與同頁其他題的答案，只適合確認作答後核對。</p><button type="button" class="btn btn-secondary" data-source-page="${esc(q.id)}">查看原始頁面（含答案）</button><div class="reference-output" data-source-output="${esc(q.id)}"></div></div>`;
}
function wireReferenceImages(root=content){
 root.querySelectorAll('[data-source-page]').forEach(btn=>btn.onclick=async()=>{
  const q=state.bank.questionMap.get(btn.dataset.sourcePage),box=root.querySelector('[data-source-output="'+CSS.escape(btn.dataset.sourcePage)+'"]');
  if(!q||!box)return;
  box.replaceChildren();
  for(const path of q.referenceImages||[]){const blob=await getMedia(path);if(!blob){const p=document.createElement('p');p.textContent='找不到圖片：'+path+'。請重新匯入包含圖片的 ZIP。';box.append(p);continue;}
   const url=URL.createObjectURL(blob);const img=document.createElement('img');img.src=url;img.alt='原始教材參照頁（包含答案）';img.className='reference-page';img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);box.append(img);
  }
 });
}
async function importQuizFile(input){
 const file=input.files?.[0];if(!file)throw new Error('請先選擇 JSON 或 ZIP 題庫。');
 if(/\.zip$/i.test(file.name)){
  const {raw,pages}=await parseQuestionZip(file);const bank=validateImportedBank(JSON.stringify(raw)).bank;
  await saveMedia(pages);saveImportedBank(raw);return bank;
 }
 const text=await readJsonFile(input);const {raw,bank}=validateImportedBank(text);await clearMedia();saveImportedBank(raw);return bank;
}
function downloadJson(name,data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function readJsonFile(input){
 const file=input.files?.[0];if(!file)return null;
 if(file.size>5*1024*1024)throw new Error('檔案超過 5 MB，請確認是否為題庫或備份 JSON。');
 return await file.text();
}
async function switchBank(){
 const imported=readImportedBank();
 state.bank=imported?.bank || null;
 state.session=loadSession(state.bank.subjectId);
 if(state.session&&(!Array.isArray(state.session.ids)||!state.session.answers||state.session.ids.some(id=>!state.bank.questionMap.has(id)))){
  state.session=null;saveSession(state.bank.subjectId,null);
 }
 state.chapter='all';state.wrongChapter='all';state.favoriteChapter='all';state.search='';state.pageNumber=1;state.revealed=new Set();
 if(state.bank) render(); else showFirstImport();
}
function settingsPage(){
 const b=state.bank,info=storedInfo(b),imported=!!localStorage.getItem('personal-quiz:bank:v1:'+b.subjectId);
 content.innerHTML=title('DATA MANAGEMENT','題庫設定與學習資料','匯入題庫前先驗證格式；練習紀錄與題庫分開保存。')+
 `<div class="card"><h2>目前題庫資訊</h2><table class="info-table"><tbody><tr><td>科目</td><td>${esc(b.subjectName)}</td></tr><tr><td>題庫來源</td><td>使用者本機匯入</td></tr><tr><td>章節</td><td>${b.chapters.length} 章</td></tr><tr><td>題數</td><td>${b.questions.length} 題</td></tr><tr><td>格式驗證</td><td>通過</td></tr><tr><td>目前題庫有效紀錄</td><td>${info.activeRecords} 筆</td></tr><tr><td>目前題庫外的保留紀錄</td><td>${info.orphanRecords} 筆</td></tr></tbody></table></div>`+
 `<div class="section-header"><h2>題庫管理</h2></div><section class="card settings-actions"><p class="muted">支援 chapter_* JSON 與包含原頁圖片的五章 ZIP（私人匯入）。匯入新題庫會保留相同 ID 的紀錄，也不會刪除舊題目歷史。建議匯入前先備份。</p><label for="bankUpload" class="input-label">選擇 JSON 或含圖片的 ZIP 題庫<input class="field" type="file" id="bankUpload" accept=".json,.zip,application/json,application/zip"></label><div class="tool-actions"><button class="btn" id="bankImport">驗證並匯入題庫</button><button class="btn btn-secondary" id="removeBank" type="button">移除本機題庫</button></div><p class="small-note">更換題庫會結束目前未完成的練習，但已確認作答仍保留。題目唯一識別碼為「科目：章節：題號」。</p></section>`+
 `<div class="section-header"><h2>資料備份與還原</h2></div><section class="card settings-actions"><p class="muted">備份包含本機作答紀錄、錯題與收藏、備註、練習成績、未完成練習及匯入的題庫。還原會覆蓋此科目的現有學習資料。</p><div class="tool-actions"><button class="btn" id="exportBackup">下載 JSON 備份</button></div><label for="backupUpload" class="input-label">選擇備份檔案<input class="field" type="file" id="backupUpload" accept=".json,application/json"></label><button class="btn btn-secondary" id="restoreBackup">驗證並還原備份</button></section>`+
 `<div class="section-header"><h2>重設學習紀錄</h2></div><section class="card settings-actions"><p class="muted">只清除練習紀錄、錯題、收藏、備註、練習歷史與暫存進度，不刪除目前使用的題庫。建議先下載備份。</p><button class="btn btn-danger" id="resetProgress">重設所有學習紀錄</button></section>`+
 `<div class="section-header"><h2>一鍵清空 localStorage</h2></div><section class="card settings-actions"><p class="muted"><strong>清空此網站來源的所有 localStorage 資料</strong>，包含學習紀錄、收藏、備註、練習歷史、未完成進度及匯入的題庫。清空後需要重新匯入題庫。若同一網站來源還有其他頁面使用 localStorage，也會一起清除。此操作無法復原，請先下載備份。</p><button class="btn btn-danger" id="clearLocalStorage" type="button">一鍵清空 localStorage</button></section>`+
 `<div class="section-header"><h2>手動刪除單題紀錄</h2></div><section class="card settings-actions"><p class="muted">可刪除指定題目的作答、錯題、收藏與備註。刪除後不會自動回算先前已結算的成績歷史；請另外從學習統計刪除不需要的場次。建議先備份。</p><label>搜尋題號或題目<input id="recordSearch" class="field" placeholder="例如 chapter_1:1 或 Java"></label><div id="recordMatches" class="question-list"></div></section>`+
 `<div class="section-header"><h2>章節清單</h2></div><div class="chapter-grid">${b.chapters.map(ch=>`<div class="card chapter-row"><div class="chapter-icon">${esc(ch.title.replace(/\D/g,''))}</div><div class="chapter-detail"><h3>${esc(ch.title)}</h3><p>${ch.count} 題</p></div></div>`).join('')}</div><p id="settingsMessage" class="small-note" role="status" aria-live="polite"></p>`;
 const message=(t,error=false)=>{const el=document.getElementById('settingsMessage');el.textContent=t;el.className=error?'error':'notice';};
 const recordSearch=document.getElementById('recordSearch'),recordMatches=document.getElementById('recordMatches');
 const renderMatches=()=>{const progress=loadProgress(b.subjectId);const query=recordSearch.value.trim().toLowerCase();const matched=b.questions.filter(q=>progress[q.id]&&((Number(progress[q.id].attempts)||0)>0||progress[q.id].favorite||progress[q.id].note||progress[q.id].wrong)&&(!query||q.id.toLowerCase().includes(query)||q.text.toLowerCase().includes(query))).slice(0,30);recordMatches.innerHTML=matched.length?matched.map(q=>`<div class="record-delete-row"><span><b>${esc(q.chapterTitle)} · 第 ${esc(q.originalId)} 題</b> — ${esc(q.text)}</span><button class="btn btn-danger" data-delete-record="${esc(q.id)}">刪除本題紀錄</button></div>`).join(''):'<div class="empty">沒有符合的學習紀錄。</div>';recordMatches.querySelectorAll('[data-delete-record]').forEach(btn=>btn.onclick=()=>{if(!confirm('確定刪除這一題的全部個人紀錄（包含錯題、收藏和備註）？'))return;deleteQuestionRecord(b.subjectId,btn.dataset.deleteRecord);renderMatches();});};
 recordSearch.oninput=renderMatches;renderMatches();
 document.getElementById('bankImport').onclick=async()=>{try{const fileInput=document.getElementById('bankUpload');if(!fileInput.files?.[0])throw new Error('請先選擇題庫檔案。');if(!confirm('確定更換題庫？目前未完成的練習將結束，已有紀錄仍保留。'))return;const bank=await importQuizFile(fileInput);saveSession(b.subjectId,null);await switchBank();message(`已匯入 ${bank.questions.length} 題，舊紀錄仍保留。`);}catch(e){message(e.message,true);}};
 document.getElementById('removeBank').onclick=()=>{if(!confirm('移除瀏覽器內的題庫？學習紀錄會保留，但未匯入題庫前無法查看。'))return;removeImportedBank();state.bank=null;state.session=null;showFirstImport();};
 document.getElementById('exportBackup').onclick=()=>{try{downloadJson(`刷題寶-${b.subjectId}-backup-${new Date().toISOString().slice(0,10)}.json`,createBackup(b.subjectId));message('已建立並下載備份。');}catch(e){message(`備份失敗：${e.message}`,true);}};
 document.getElementById('restoreBackup').onclick=async()=>{try{const text=await readJsonFile(document.getElementById('backupUpload'));if(!text){message('請先選擇備份 JSON。',true);return;}let data;try{data=JSON.parse(text);}catch{throw new Error('備份 JSON 格式錯誤。');}import('./dataManagement.js').then(async ({validateBackup})=>{try{validateBackup(data,b.subjectId);if(!confirm('還原會覆蓋目前此科目的所有學習資料與已匯入題庫。確定還原嗎？'))return;restoreBackup(data,b.subjectId);await switchBank();message('備份還原完成。');}catch(e){message(`還原失敗：${e.message}`,true);}});}catch(e){message(e.message,true);}};
 document.getElementById('clearLocalStorage').onclick=()=>{if(!confirm('確定清空此網站來源的全部 localStorage？所有學習紀錄、收藏、備註、練習歷史、未完成進度、匯入題庫，以及同來源其他頁面儲存的資料都會消失。此操作無法復原。'))return;const code=prompt('最後確認：請輸入「清空」以刪除全部 localStorage 資料。');if(code!=='清空'){message('已取消清空。');return;}try{clearAllLocalStorage();window.location.reload();}catch(e){message(`清空失敗：${e.message}`,true);}};
 document.getElementById('resetProgress').onclick=()=>{if(!confirm('確定清除所有學習紀錄、錯題、收藏及練習歷史？此操作無法復原。'))return;const code=prompt('再次確認：請輸入「重設」以清除所有學習紀錄。');if(code!=='重設'){message('已取消重設。');return;}try{resetLearning(b.subjectId);state.session=null;render();message('已清除學習紀錄，題庫保留。');}catch(e){message(e.message,true);}};
}

function favoriteControl(q,progress){
 const isFavorite=!!progress[q.id]?.favorite;
 return `<button class="btn btn-secondary favorite-toggle" data-favorite="${esc(q.id)}" aria-pressed="${isFavorite}" title="${isFavorite?'取消收藏':'收藏題目'}">${isFavorite?'★ 已收藏':'☆ 收藏'}</button>`;
}
function wireFavorites(root=content){
 root.querySelectorAll('[data-favorite]').forEach(btn=>btn.onclick=()=>{
  const progress=loadProgress(state.bank.subjectId);
  toggleFavorite(progress,btn.dataset.favorite);
  saveProgress(state.bank.subjectId,progress);
  render();
 });
}
function beginSelection(questions,mode){
 if(!questions.length){alert('目前沒有符合條件的題目。');return;}
 if(state.session&&!state.session.finished&&!confirm('目前有尚未結算的練習。確定放棄目前練習並開始新練習嗎？（已確認的作答紀錄仍會保留）'))return;
 state.session={ids:questions.map(q=>q.id),answers:{},index:0,mode,startedAt:new Date().toISOString(),finished:false};
 saveSession(state.bank.subjectId,state.session);
 navigate('practice');
}
function beginFilteredPractice(mode,chapter='all'){
 const progress=loadProgress(state.bank.subjectId);
 let questions=candidates(state.bank,progress,mode);
 if(chapter!=='all')questions=questions.filter(q=>q.chapterId===chapter);
 beginSelection(questions,mode);
}
function chapterSelect(selected,kind){return `<select class="field" id="${kind}Chapter"><option value="all">所有章節</option>${state.bank.chapters.map(ch=>`<option value="${esc(ch.id)}" ${selected===ch.id?'selected':''}>${esc(ch.title)}</option>`).join('')}</select>`;}
function wrongPage(){
 const progress=loadProgress(state.bank.subjectId);
 const mistakes=state.bank.questions.filter(q=>Number(progress[q.id]?.wrong)>0);
 const pending=mistakes.filter(q=>!progress[q.id].mastered);
 const mastered=mistakes.filter(q=>progress[q.id].mastered);
 let visible=mistakes.filter(q=>(state.wrongChapter==='all'||q.chapterId===state.wrongChapter)&&(state.wrongStatus==='all'||mistakeStatus(progress[q.id])===state.wrongStatus));
 content.innerHTML=title('MISTAKE REVIEW','錯題本','歷史錯題不會因為訂正或掌握而刪除；重新答錯會再次進入待複習。')+
 `<section class="metric-grid"><div class="card"><div class="metric-title">歷史錯題</div><div class="metric-value">${mistakes.length}</div></div><div class="card"><div class="metric-title">待複習</div><div class="metric-value">${pending.length}</div></div><div class="card"><div class="metric-title">已掌握</div><div class="metric-value">${mastered.length}</div></div><div class="card"><div class="metric-title">連續答對達標</div><div class="metric-value">3 次</div></div></section>`+
 `<div class="toolbar">${chapterSelect(state.wrongChapter,'wrong')}<select class="field" id="wrongStatus"><option value="all">所有錯題</option><option value="review" ${state.wrongStatus==='review'?'selected':''}>待訂正</option><option value="corrected" ${state.wrongStatus==='corrected'?'selected':''}>已訂正、未掌握</option><option value="mastered" ${state.wrongStatus==='mastered'?'selected':''}>已掌握</option></select><button class="btn" id="practiceWrong" ${!pending.length?'disabled':''}>練習待複習錯題（${pending.length}）</button><button class="btn btn-secondary" id="practiceVisibleWrong" ${!visible.length?'disabled':''}>練習目前篩選（${visible.length}）</button></div>`+
 `<section class="question-list">${visible.length?visible.map(q=>{const r=progress[q.id],status=mistakeStatus(r);return `<article class="card question-card"><div class="question-head"><span class="pill">${esc(q.chapterTitle)} · 第 ${esc(q.originalId)} 題</span><span class="status-pill">${status==='mastered'?'✓ 已掌握':status==='corrected'?'已訂正（繼續複習）':'待訂正'}</span></div><div class="question-text">${renderQuestionBody(q)}</div>${questionMedia(q)}<div class="record-meta">答錯 ${fmt(r.wrong)} 次 · 連續答對 ${fmt(r.streak||0)} 次 · 最近答錯：${esc(r.lastWrongAt?new Date(r.lastWrongAt).toLocaleString('zh-TW'):'舊版紀錄未保存時間')}</div><div class="answer-panel"><div><b>正確答案：</b>${esc(Array.isArray(q.answer)?q.answer.join('、'):q.answer)}${q.options.length?' — '+esc(q.options.filter(([k])=>Array.isArray(q.answer)?q.answer.includes(k):k===q.answer).map(([,v])=>v).join('、')):''}</div><div><b>解析：</b><span class="preline">${esc(q.explanation||'原始題庫未提供解析')}</span></div></div>${referenceButton(q,true)}<div class="tool-actions">${favoriteControl(q,progress)}<label class="inline-check"><input type="checkbox" data-corrected="${esc(q.id)}" ${r.corrected?'checked':''}> 標記已訂正</label><button class="btn btn-secondary" data-practice-one="${esc(q.id)}">練習本題</button></div></article>`;}).join(''):'<div class="card empty">此篩選條件下沒有錯題。</div>'}</section>`;
 document.getElementById('wrongChapter').onchange=e=>{state.wrongChapter=e.target.value;wrongPage();};
 document.getElementById('wrongStatus').onchange=e=>{state.wrongStatus=e.target.value;wrongPage();};
 document.getElementById('practiceWrong').onclick=()=>beginFilteredPractice('wrong');
 document.getElementById('practiceVisibleWrong').onclick=()=>beginSelection(visible,'wrong');
 content.querySelectorAll('[data-corrected]').forEach(el=>el.onchange=()=>{const p=loadProgress(state.bank.subjectId);markCorrected(p,el.dataset.corrected,el.checked);saveProgress(state.bank.subjectId,p);wrongPage();});
 content.querySelectorAll('[data-practice-one]').forEach(el=>el.onclick=()=>beginSelection([state.bank.questionMap.get(el.dataset.practiceOne)],'wrong'));
 wireFavorites();
}
function favoritesPage(){
 const progress=loadProgress(state.bank.subjectId);
 const all=state.bank.questions.filter(q=>progress[q.id]?.favorite);
 const visible=all.filter(q=>state.favoriteChapter==='all'||q.chapterId===state.favoriteChapter);
 content.innerHTML=title('SAVED QUESTIONS','收藏題目','收藏狀態與個人備註保存在目前瀏覽器，重新整理後仍會保留。')+
 `<div class="toolbar">${chapterSelect(state.favoriteChapter,'favorite')}<button class="btn" id="practiceFavorite" ${!visible.length?'disabled':''}>練習目前收藏（${visible.length}）</button></div><p class="muted">已收藏 ${all.length} 題 · 目前顯示 ${visible.length} 題</p>`+
 `<section class="question-list">${visible.length?visible.map(q=>{const r=progress[q.id];return `<article class="card question-card"><div class="question-head"><span class="pill">${esc(q.chapterTitle)} · 第 ${esc(q.originalId)} 題</span>${favoriteControl(q,progress)}</div><div class="question-text">${renderQuestionBody(q)}</div>${questionMedia(q)}<div class="option-list">${q.options.map(([k,v])=>`<div class="option"><b>${esc(k)}.</b>${esc(v)}</div>`).join('')}</div><label class="note-label" for="note-${esc(q.id)}">個人備註</label><textarea class="field note-field" id="note-${esc(q.id)}" data-note="${esc(q.id)}" rows="3" placeholder="記錄你想複習的重點…">${esc(r.note||'')}</textarea><div class="tool-actions"><small class="muted">備註離開輸入框後自動儲存</small><button class="btn btn-secondary" data-practice-one="${esc(q.id)}">練習本題</button></div></article>`;}).join(''):'<div class="card empty">目前沒有符合篩選條件的收藏題目。可在刷題時點選「☆ 收藏」。</div>'}</section>`;
 document.getElementById('favoriteChapter').onchange=e=>{state.favoriteChapter=e.target.value;favoritesPage();};
 document.getElementById('practiceFavorite').onclick=()=>beginSelection(visible,'favorites');
 content.querySelectorAll('[data-note]').forEach(el=>{
  const store=()=>{const p=loadProgress(state.bank.subjectId);setFavoriteNote(p,el.dataset.note,el.value);saveProgress(state.bank.subjectId,p);};
  el.onchange=store;el.onblur=store;
 });
 content.querySelectorAll('[data-practice-one]').forEach(el=>el.onclick=()=>beginSelection([state.bank.questionMap.get(el.dataset.practiceOne)],'favorites'));
 wireFavorites();
}
function captureDraft(question,session){
 const form=document.getElementById('answerForm');
 if(!form||session.answers[question.id]?.confirmed)return;
 let value;
 if(question.type==='single')value=form.querySelector('input[name=answer]:checked')?.value;
 else if(question.type==='multiple')value=[...form.querySelectorAll('input[name=answer]:checked')].map(el=>el.value);
 else if(['text','essay'].includes(question.type))value=form.querySelector('#textAnswer')?.value;
 else if(question.type==='boolean')value=form.querySelector('input[name=answer]:checked')?.value;
 if(value===undefined)return;
 session.answers[question.id]={value,confirmed:false};
 saveSession(state.bank.subjectId,session);
}
function selectedAnswer(value){return value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length)?'未作答':Array.isArray(value)?value.join('、'):String(value);}
function reviewDetails(session,wrongOnly=true){
 const items=session.ids.map((id,index)=>({question:state.bank.questionMap.get(id),answer:session.answers[id],index})).filter(x=>x.question&&(!wrongOnly||(x.answer?.confirmed&&!x.answer.correct)));
 if(!items.length)return `<div class="empty">${wrongOnly?'本次沒有答錯的題目。':'沒有可查看的題目。'}</div>`;
 return items.map(({question:q,answer:a,index})=>`<article class="card question-card"><div class="question-head"><span class="pill">第 ${index+1} 題 · ${esc(q.chapterTitle)} · 原題 ${esc(q.originalId)}</span><span class="status-pill">${!a?.confirmed?'未作答':a.correct?'✓ 答對':'✕ 答錯'}</span></div><div class="question-text">${renderQuestionBody(q)}</div>${questionMedia(q)}<div class="option-list">${q.options.map(([k,v])=>`<div class="option"><b>${esc(k)}.</b>${esc(v)}</div>`).join('')}</div><p><b>你的答案：</b>${esc(selectedAnswer(a?.value))}</p><div class="answer-panel ${a?.correct?'correct-panel':'incorrect-panel'}"><div><b>正確答案：</b>${esc(selectedAnswer(q.answer))}</div><div><b>詳細解析：</b><span class="preline">${esc(q.explanation||'原始題庫沒有提供解析')}</span></div></div>${referenceButton(q,true)}</article>`).join('');
}
function finishCurrentSession(session,question){
 if(question)captureDraft(question,session);
 const pending=session.ids.filter(id=>!session.answers[id]?.confirmed);
 const toGrade=pending.filter(id=>{if(state.bank.questionMap.get(id)?.type==='essay')return false;
  const a=session.answers[id];return a&&a.value!==undefined&&a.value!==null&&a.value!==''&&(!Array.isArray(a.value)||a.value.length>0);
 });
 const unanswered=pending.length-toGrade.length;
 if(!confirm(`即將結算練習。\n尚未確認但已選答案：${toGrade.length} 題（將自動確認計分）\n完全未作答：${unanswered} 題（不計入答對或答錯）\n確定結算嗎？`))return;
 const progress=loadProgress(state.bank.subjectId);
 finalizeDraftAnswers(session,state.bank,progress);
 saveProgress(state.bank.subjectId,progress);
 session.finished=true;session.finishedAt=new Date().toISOString();
 saveSession(state.bank.subjectId,session);
 const result=sessionResult(session);
 addHistory(state.bank.subjectId,{...result,mode:session.mode,startedAt:session.startedAt,finishedAt:session.finishedAt,ids:[...session.ids],answers:structuredClone(session.answers)});
 practicePage();
}
function practicePage(){
 const session=state.session;
 if(!session){
  const chapters=state.bank.chapters;
  content.innerHTML=title('PRACTICE','開始刷題','選擇模式與題數；只有按下「確認答案」後才會顯示正確答案及解析。')+`<div class="card practice-setup"><h2>建立練習</h2><form id="practiceSetup"><label>練習模式<select class="field" id="mode"><option value="all">全部題目</option><option value="chapter">章節練習</option><option value="random">隨機練習</option><option value="unpracticed">未練習題目</option><option value="wrong">待複習錯題</option><option value="favorites">收藏題目</option></select></label><label>指定章節<select class="field" id="practiceChapter">${chapters.map(ch=>`<option value="${esc(ch.id)}">${esc(ch.title)}（${ch.count} 題）</option>`).join('')}</select></label><label>練習題數<input class="field" type="number" id="practiceCount" min="1" value="20" required></label><label class="inline-check"><input type="checkbox" id="randomOrder"> 隨機排序題目</label><p class="muted" id="availableHint"></p><button class="btn" type="submit">開始練習 →</button></form></div>`;
  const mode=document.getElementById('mode'),ch=document.getElementById('practiceChapter'),count=document.getElementById('practiceCount'),hint=document.getElementById('availableHint');
  const refresh=()=>{const n=candidates(state.bank,loadProgress(state.bank.subjectId),mode.value,ch.value).length;ch.disabled=mode.value!=='chapter';count.max=String(n);if(Number(count.value)>n)count.value=String(n);hint.textContent=`目前符合條件 ${n} 題${n===0?'，沒有可練習題目。':''}`;document.querySelector('#practiceSetup button[type=submit]').disabled=!n;};mode.onchange=refresh;ch.onchange=refresh;refresh();
  document.getElementById('practiceSetup').onsubmit=e=>{e.preventDefault();const pool=selectQuestions(state.bank,loadProgress(state.bank.subjectId),{mode:mode.value,chapter:ch.value,count:count.value,random:document.getElementById('randomOrder').checked});if(!pool.length)return;state.session={ids:pool.map(q=>q.id),answers:{},index:0,mode:mode.value,startedAt:new Date().toISOString(),finished:false};saveSession(state.bank.subjectId,state.session);practicePage();};return;
 }
 if(session.finished){const r=sessionResult(session);const missing=r.total-r.answered;content.innerHTML=title('PRACTICE RESULT','本次練習結果','以下列出本次答錯題目及原始題庫解析。已作答的題目在結算時自動確認。')+`<section class="metric-grid"><div class="card"><div class="metric-title">練習題數</div><div class="metric-value">${r.total}</div></div><div class="card"><div class="metric-title">已作答</div><div class="metric-value">${r.answered}</div></div><div class="card"><div class="metric-title">答對／答錯</div><div class="metric-value">${r.correct} / ${r.wrong}</div></div><div class="card"><div class="metric-title">正確率</div><div class="metric-value">${r.answered?r.accuracy.toFixed(1)+'%':'尚無作答'}</div></div></section><div class="card"><p>未作答：${missing} 題（不計分）。正確率依已作答題目計算。</p><div class="tool-actions"><button class="btn" id="newPractice">建立新練習</button><button class="btn btn-secondary" id="goHome">返回首頁</button><button class="btn btn-secondary" id="showAllReview">查看全部題目</button></div></div><div class="section-header"><h2>答錯題目與詳解（${r.wrong} 題）</h2></div><section id="reviewResults" class="question-list">${reviewDetails(session)}</section>`;document.getElementById('newPractice').onclick=()=>{state.session=null;saveSession(state.bank.subjectId,null);practicePage();};document.getElementById('goHome').onclick=()=>navigate('dashboard');document.getElementById('showAllReview').onclick=()=>{const el=document.getElementById('reviewResults'),btn=document.getElementById('showAllReview');const all=btn.dataset.all!=='yes';el.innerHTML=reviewDetails(session,!all);btn.dataset.all=all?'yes':'no';btn.textContent=all?'只看答錯題目':'查看全部題目';};return;}

 const index=session.index, q=state.bank.questionMap.get(session.ids[index]);
 if(!q){content.innerHTML='<div class="error">無法找到目前題目，請重新載入。</div>';return;}
 const previous=session.answers[q.id]||{}, confirmed=!!previous.confirmed, isLast=index===session.ids.length-1;
 const answerHtml=confirmed?`<div class="answer-panel ${previous.correct?'correct-panel':'incorrect-panel'}" role="status"><strong>${previous.correct?'✓ 答對了':'✕ 答錯了'}</strong><div><b>正確答案：</b>${esc(Array.isArray(q.answer)?q.answer.join('、'):q.answer)}</div><div><b>題目解析：</b><span class="preline">${esc(q.explanation||'原始題庫未提供解析')}</span></div></div>${referenceButton(q,true)}`:'';
 const inputHtml=q.type==='single'||q.type==='multiple'?`<div class="answer-options">${q.options.map(([key,value])=>`<label class="answer-option ${confirmed&&((Array.isArray(previous.value)?previous.value:[previous.value]).includes(key))?'chosen':''}"><input name="answer" type="${q.type==='single'?'radio':'checkbox'}" value="${esc(key)}" ${((Array.isArray(previous.value)?previous.value:[previous.value]).includes(key))?'checked':''} ${confirmed?'disabled':''}><span><strong>${esc(key)}.</strong> ${esc(value)}</span></label>`).join('')}</div>`:q.type==='boolean'?`<div class="answer-options">${(q.options.length?q.options:[['true','正確／是'],['false','錯誤／非']]).map(([key,val])=>`<label class="answer-option"><input type="radio" name="answer" value="${esc(key)}" ${String(previous.value)===key?'checked':''} ${confirmed?'disabled':''}><span>${esc(val)}</span></label>`).join('')}</div>`:q.type==='text'?`<label class="input-label">請輸入答案<input id="textAnswer" class="field" value="${esc(previous.value??'')}" ${confirmed?'disabled':''}></label>`:q.type==='essay'?`<label class="input-label">請輸入你的回答<textarea id="textAnswer" class="field essay-field" rows="6" ${confirmed?'disabled':''}>${esc(previous.value??'')}</textarea></label><p class="small-note">問答題不使用不可靠的自動文字比對；確認後對照參考答案自行判定。</p>`:`<div class="notice">目前尚未支援此題型。</div>`;
 const answeredCount=Object.values(session.answers).filter(a=>a.confirmed).length;
 content.innerHTML=title('PRACTICE','題庫練習',`已確認 ${answeredCount} / ${session.ids.length} 題；可自由切換題目，不會提前公布答案。`)+`<div class="card"><div class="practice-top"><span class="pill">${esc(q.chapterTitle)} · 第 ${esc(q.originalId)} 題</span><span class="muted">第 ${index+1} / ${session.ids.length} 題</span>${favoriteControl(q,loadProgress(state.bank.subjectId))}</div><div class="progress-track"><div class="progress-bar" style="width:${Math.round(answeredCount/session.ids.length*100)}%"></div></div><div class="practice-question">${renderQuestionBody(q)}</div>${questionMedia(q)}<form id="answerForm">${inputHtml}<div class="action-row">${!confirmed?`<button class="btn" type="submit">確認答案</button>`:'<span class="muted">本題已確認，無法重複計分。</span>'}</div></form>${answerHtml}<div class="practice-footer"><button class="btn btn-secondary" id="previousQuestion" ${index===0?'disabled':''}>← 上一題</button><button class="btn btn-secondary" id="nextQuestion" ${isLast?'disabled':''}>下一題 →</button></div><div class="practice-footer"><button class="btn btn-secondary" id="leavePractice">返回首頁（保留進度）</button><button class="btn" id="finishPractice">結算練習</button></div></div>`;
 wireFavorites();
 document.getElementById('answerForm').onsubmit=e=>{e.preventDefault();if(confirmed)return;captureDraft(q,session);const value=session.answers[q.id]?.value;if(value===undefined||value===null||(Array.isArray(value)&&!value.length)||(typeof value==='string'&&!value.trim())){alert('請先作答，再按確認答案。');return;}const correct=grade(q,value);if(correct===null && q.type!=='essay'){alert('目前不支援自動判斷此題型。');return;}
 const judged=q.type==='essay'?confirm(`請先核對參考答案與解析，再自行判定是否答對。\n\n參考答案：${String(q.answer??'未提供')}\n解析：${q.explanation||'未提供'}\n\n選「確定」表示答對，「取消」表示答錯。`):correct;session.answers[q.id]={value,correct:judged,confirmed:true,at:new Date().toISOString()};const progress=loadProgress(state.bank.subjectId);recordAnswer(progress,q,value,judged);saveProgress(state.bank.subjectId,progress);saveSession(state.bank.subjectId,session);practicePage();};
 document.getElementById('answerForm').onchange=()=>captureDraft(q,session);
 document.getElementById('answerForm').oninput=()=>{if(['text','essay'].includes(q.type))captureDraft(q,session);};
 document.getElementById('previousQuestion').onclick=()=>{captureDraft(q,session);session.index--;saveSession(state.bank.subjectId,session);practicePage();};document.getElementById('nextQuestion').onclick=()=>{captureDraft(q,session);session.index++;saveSession(state.bank.subjectId,session);practicePage();};document.getElementById('leavePractice').onclick=()=>{captureDraft(q,session);navigate('dashboard');};
 document.getElementById('finishPractice').onclick=()=>finishCurrentSession(session,q);
}

function pendingPage(){content.innerHTML=title('COMING NEXT',pageTitles[state.page],'此功能將在後續開發階段啟用，目前尚無可操作的作答流程。')+`<div class="card"><h2>功能尚未開放</h2><p class="muted">目前可使用「首頁儀表板」、「題庫瀏覽」及「題庫設定」。下一階段將先完成真實答題、判分與解析顯示。</p><button id="goBrowse" class="btn">先瀏覽題目 →</button></div>`;document.getElementById('goBrowse').onclick=()=>navigate('bank');}
function render(){if(!state.bank){showFirstImport();return;} if(state.page==='dashboard')dashboard();else if(state.page==='bank')bankPage();else if(state.page==='settings')settingsPage();else if(state.page==='practice')practicePage();else if(state.page==='wrong')wrongPage();else if(state.page==='favorites')favoritesPage();else if(state.page==='stats')statsPage();else pendingPage();}
function showFirstImport(error='') {
 state.bank=null;
 content.innerHTML=title('LOCAL FIRST','匯入自己的 JSON 題庫','此網站不提供、下載或公開任何內建考試題庫。請從自己的裝置選取有權使用的 JSON 檔案。')+
 `<section class="card settings-actions"><h2>開始使用</h2><p class="muted">題庫只會由瀏覽器讀取並保存在此網站來源的 localStorage，不會由本站程式主動傳送至伺服器。請不要在共用裝置匯入敏感資料。</p><label class="input-label" for="firstBankUpload">選擇題庫 JSON 或含圖片 ZIP<input class="field" id="firstBankUpload" type="file" accept=".json,.zip,application/json,application/zip"></label><div class="tool-actions"><button class="btn" id="firstBankImport">驗證並匯入題庫</button></div><p id="firstBankMessage" class="small-note" role="alert">${esc(error)}</p></section>`;
 document.getElementById('firstBankImport').onclick=async()=>{
   const msg=document.getElementById('firstBankMessage');
   try { const bank=await importQuizFile(document.getElementById('firstBankUpload'));state.bank=bank;state.session=loadSession(bank.subjectId);if(state.session?.ids?.some(id=>!bank.questionMap.has(id))){state.session=null;saveSession(bank.subjectId,null);}navigate('dashboard'); }
   catch(e){msg.textContent=e.message;}
 };
}
try { const imported=readImportedBank();if(imported){state.bank=imported.bank;state.session=loadSession(state.bank.subjectId);if(state.session && (!Array.isArray(state.session.ids)||!state.session.answers||state.session.ids.some(id=>!state.bank.questionMap.has(id)))){state.session=null;saveSession(state.bank.subjectId,null);}render();}else showFirstImport(); }
catch(e){showFirstImport(`載入失敗：${e.message}`);}

// Delegated private page image viewer, initialized once.
content.addEventListener('click', async event=>{
 const btn=event.target.closest('[data-source-page]');if(!btn)return;
 const q=state.bank?.questionMap.get(btn.dataset.sourcePage);const box=btn.parentElement.querySelector('[data-source-output]');if(!q||!box)return;
 box.replaceChildren();
 for(const path of q.referenceImages||[]){try{const blob=await getMedia(path);if(!blob){const p=document.createElement('p');p.textContent='沒有圖片資料，請重新匯入完整 ZIP：'+path;box.append(p);continue;}const img=document.createElement('img');const url=URL.createObjectURL(blob);img.src=url;img.className='reference-page';img.alt='教材原頁，含答案與解析';img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);box.append(img);}catch(e){box.textContent='圖片讀取失敗：'+e.message;}}
});
