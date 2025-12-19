const clickBtn = document.getElementById('clickBtn');
const countEl = document.getElementById('count');
const lastRunEl = document.getElementById('lastRun');
const lastRankEl = document.getElementById('lastRank');
const topListEl = document.getElementById('topList');
const endRunBtn = document.getElementById('endRun');
const resetBtn = document.getElementById('reset');

const STORAGE_TOP = 'clickforge.top10';
const STORAGE_LAST = 'clickforge.last';
const STORAGE_RANK = 'clickforge.lastRank';

const seedScores = [240, 220, 205, 190, 175, 160, 150, 130, 120, 110];

const state = {
  count: 0,
  saved: false,
  runActive: false
};

function loadTop10(){
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_TOP));
    if (Array.isArray(data) && data.length){
      return data.map(n => Number(n)).filter(n => Number.isFinite(n)).slice(0, 10);
    }
  } catch (err) {
    return seedScores.slice();
  }
  return seedScores.slice();
}

function saveTop10(list){
  localStorage.setItem(STORAGE_TOP, JSON.stringify(list));
}

function renderTop10(list){
  topListEl.innerHTML = '';
  list.forEach((score, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<div>#${idx + 1}</div><span>${score} clicks</span>`;
    topListEl.appendChild(li);
  });
}

function updateCounter(){
  countEl.textContent = state.count;
}

function formatTimestamp(ts){
  const date = new Date(ts);
  return date.toLocaleString();
}

function updateLastRun(){
  const last = JSON.parse(localStorage.getItem(STORAGE_LAST) || 'null');
  const lastRank = localStorage.getItem(STORAGE_RANK);
  if (last && typeof last.score === 'number'){
    lastRunEl.textContent = `Last run: ${last.score} clicks (${formatTimestamp(last.time)})`;
  }
  if (lastRank){
    lastRankEl.textContent = `Top 10 rank: ${lastRank}`;
  }
}

function maybeSeed(){
  if (!localStorage.getItem(STORAGE_TOP)){
    saveTop10(seedScores.slice());
  }
}

function addScore(score){
  const list = loadTop10();
  const combined = list.concat(score).sort((a,b) => b - a);
  const rank = combined.indexOf(score) + 1;
  const trimmed = combined.slice(0, 10);
  const qualifies = rank > 0 && rank <= 10 && trimmed.includes(score);

  saveTop10(trimmed);
  localStorage.setItem(STORAGE_LAST, JSON.stringify({
    score,
    time: Date.now()
  }));
  if (qualifies){
    localStorage.setItem(STORAGE_RANK, `#${rank}`);
  } else {
    localStorage.setItem(STORAGE_RANK, '—');
  }

  renderTop10(trimmed);
  updateLastRun();
}

function saveFinal(){
  if (state.saved || !state.runActive) return;
  state.saved = true;
  addScore(state.count);
}

function startNewRun(){
  state.count = 0;
  state.saved = false;
  state.runActive = false;
  updateCounter();
}

function handleClick(){
  state.runActive = true;
  state.count += 1;
  updateCounter();
}

clickBtn.addEventListener('click', handleClick);
endRunBtn.addEventListener('click', () => {
  saveFinal();
  startNewRun();
});

resetBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_TOP);
  localStorage.removeItem(STORAGE_LAST);
  localStorage.removeItem(STORAGE_RANK);
  maybeSeed();
  renderTop10(loadTop10());
  lastRunEl.textContent = 'Last run: —';
  lastRankEl.textContent = 'Top 10 rank: —';
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter'){
    e.preventDefault();
    handleClick();
  }
});

window.addEventListener('beforeunload', saveFinal);
window.addEventListener('pagehide', saveFinal);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden'){
    saveFinal();
  }
});

maybeSeed();
renderTop10(loadTop10());
updateLastRun();
updateCounter();
