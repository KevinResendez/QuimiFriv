(() => {
  'use strict';
  const data = window.QUIZ_DATA;
  const storageKey = 'quimifiv-progress-v1';
  const defaultState = () => ({points:0,completed:[],medals:[],best:{},unlockedLevel:1});
  let state = loadState();
  let activeGame = null;
  let run = null;
  let configMode = 'text';
  let toastTimer;
  let audioEnabled = false;
  let audioChoiceMade = false;
  let audioMuted = false;
  let audioVolume = 0.4;
  try { audioMuted=localStorage.getItem('quimifriv-muted')==='true';const storedVolume=localStorage.getItem('quimifriv-volume');if(storedVolume!==null){const savedVolume=Number(storedVolume);if(Number.isFinite(savedVolume)&&savedVolume>=0&&savedVolume<=1)audioVolume=savedVolume;} } catch {}
  const tracks={site:new Audio('assets/quimifriv-theme.mp3'),catcher:new Audio('assets/food-drop.mp3')};
  const effects={correct:new Audio('assets/check-true.mp3'),success:new Audio('assets/success.mp3')};
  Object.values(tracks).forEach(audio=>{audio.loop=true;audio.preload='none';});
  Object.values(effects).forEach(audio=>{audio.preload='auto';});
  let catcher = null;
  const $ = (selector, root=document) => root.querySelector(selector);
  const dialog = $('#gameDialog');
  const resetDialog = $('#resetDialog');
  const content = $('#dialogContent');

  function loadState(){
    try { const saved=JSON.parse(localStorage.getItem(storageKey)); return {...defaultState(),...(saved||{})}; }
    catch { return defaultState(); }
  }
  function saveState(){ localStorage.setItem(storageKey,JSON.stringify(state)); }
  function esc(value){ return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function render(){
    $('#pointsTotal').textContent=state.points;
    $('#medalsTotal').textContent=state.medals.length;
    const percent=Math.round(state.completed.length/data.games.length*100);
    $('#progressLabel').textContent=`${percent}%`;
    $('#progressBar').style.width=`${percent}%`;
    $('#completedLabel').textContent=`${state.completed.length} de ${data.games.length} juegos completados`;
    $('#medalProgress').textContent=`${state.medals.length} / ${data.medals.length}`;
    renderRoute(); renderMedals(); renderGames();
  }
  function renderRoute(){
    $('#routeTrack').innerHTML=data.route.map(step=>{
      const done=step.games.every(id=>state.completed.includes(id));
      return `<div class="route-step ${done?'done':''}"><span class="route-node">${done?'✓':step.icon}</span><small>${esc(step.label)}</small></div>`;
    }).join('');
  }
  function renderMedals(){
    $('#medalGrid').innerHTML=data.medals.map(m=>`<div class="medal ${state.medals.includes(m.id)?'unlocked':''}"><span class="medal-icon">${m.icon}</span><span><strong>${esc(m.name)}</strong><small>${esc(m.hint)}</small></span></div>`).join('');
  }
  function renderGames(filter='Todos'){
    const games=data.games.filter(g=>filter==='Todos'||g.category===filter);
    $('#visibleCount').textContent=games.length;
    $('#gameGrid').innerHTML=games.map((g,i)=>`<article class="game-card ${state.completed.includes(g.id)?'completed':''}"><div class="card-top"><span class="game-icon">${g.icon}</span><span class="game-tag">${esc(g.tag)}</span></div><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><div class="card-bottom"><span class="difficulty">${esc(g.difficulty)} <span>${'★'.repeat(g.difficulty==='Básico'?1:g.difficulty==='Intermedio'?2:3)}</span></span><button class="play-button" type="button" data-play="${g.id}">${state.completed.includes(g.id)?'Jugar otra vez':'Jugar'} →</button></div></article>`).join('');
  }
  function showToast(message){ const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600); }
  function syncAudioControls(){
    const soundButton=$('#soundToggle');soundButton.setAttribute('aria-pressed',String(audioEnabled));soundButton.querySelector('.sound-label').textContent=audioEnabled?'Pausar':'Música';soundButton.title=audioEnabled?'Pausar la música':'Reproducir la música de QuimiFriv';
    $('#muteAudio').setAttribute('aria-pressed',String(audioMuted));$('#muteAudio').textContent=audioMuted?'Activar sonido':'Silenciar';
    $('#musicVolume').value=audioVolume;$('#volumeValue').textContent=`${Math.round(audioVolume*100)}%`;
    [...Object.values(tracks),...Object.values(effects)].forEach(audio=>audio.volume=audioMuted?0:audioVolume);
  }
  function pauseTrack(name){tracks[name].pause();}
  function pauseAllTracks(){Object.values(tracks).forEach(audio=>audio.pause());}
  function playTrack(name){
    if(!audioEnabled)return;
    Object.entries(tracks).forEach(([key,audio])=>{if(key!==name)audio.pause();});
    const audio=tracks[name];audio.volume=audioMuted?0:audioVolume;
    if(audio.paused)audio.play().catch(()=>showToast('Toca Música para activar el audio.'));
  }
  function playEffect(name){
    if(!audioEnabled||audioMuted)return;
    const audio=effects[name];audio.currentTime=0;audio.volume=audioVolume;
    audio.play().catch(()=>{});
  }
  function playTone(good){if(good){playEffect('correct');return;}if(!audioEnabled||audioMuted)return;try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();const o=c.createOscillator();const gain=c.createGain();o.connect(gain);gain.connect(c.destination);o.frequency.value=220;gain.gain.value=.06*audioVolume;o.start();o.stop(c.currentTime+.12);o.onended=()=>c.close();}catch{} }
  function openGame(id){
    activeGame=data.games.find(g=>g.id===id); if(!activeGame)return;
    pauseTrack('site');
    run=null;configMode='text';
    if(activeGame.kind==='catcher'){
      content.innerHTML=`<div class="dialog-head"><span class="dialog-kicker">${esc(activeGame.tag)} · LABORATORIO</span><h2 class="dialog-title" id="dialogTitle">🧑🏻‍🔬 ${esc(activeGame.title)}</h2><p class="dialog-desc">${esc(activeGame.description)}</p></div><div class="catcher-intro"><span class="catcher-intro-icon">🧪</span><h3>¡Alimenta al científico!</h3><p>${esc(activeGame.instruction)}</p><div class="start-rules"><span>⚛️ Elemento: +10 puntos</span><span>🧬 Molécula: −1 vida</span><span>⬇️ 10 elementos perdidos = fin</span></div><button class="start-button" type="button" data-action="start-catcher">Comenzar partida</button></div>`;
      if(!dialog.open)dialog.showModal();
      return;
    }
    const modes=activeGame.kind==='text'?`<div class="mode-picker" role="group" aria-label="Modo de configuración"><button type="button" class="mode-button active" data-mode="text">✍️ Notación</button><button type="button" class="mode-button" data-mode="diagram">↕ Diagrama orbital</button></div>`:'';
    content.innerHTML=`<div class="dialog-head"><span class="dialog-kicker">${esc(activeGame.tag)} · ${esc(activeGame.category.toUpperCase())}</span><h2 class="dialog-title" id="dialogTitle">${activeGame.icon} ${esc(activeGame.title)}</h2><p class="dialog-desc">${esc(activeGame.description)}</p></div><div class="start-screen"><span class="start-emoji">${activeGame.icon}</span><h3>¿Listo para el reto?</h3><p>${esc(activeGame.instruction)}</p>${modes}<div class="start-rules"><span>❤️ 3 vidas</span><span>⭐ +10 por acierto</span><span>🧠 ${activeGame.questions.length} retos</span></div><button class="start-button" type="button" data-action="start">Comenzar misión</button></div>`;
    if(!dialog.open)dialog.showModal();
  }
  function startRun(){
    run={questions:shuffle(activeGame.questions),index:0,score:0,lives:3,answered:false,correct:0,mode:activeGame.kind==='text'?configMode:null};
    renderQuestion();
  }
  function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function meta(){return `<div class="game-meta"><span class="meta-pill">Reto <b>${run.index+1}/${run.questions.length}</b></span><span class="meta-pill">⭐ <b>${run.score}</b> pts</span><span class="meta-pill">${'❤️'.repeat(run.lives)}${'🖤'.repeat(3-run.lives)} <b>${run.lives}</b></span><span class="meta-pill">Nivel <b>${esc(activeGame.difficulty)}</b></span></div>`;}
  function renderQuestion(){
    if(run.lives<=0||run.index>=run.questions.length){finishRun();return;}
    run.answered=false;
    const q=run.questions[run.index];
    let body='';
    if(activeGame.kind==='atom')body=atomQuestion(q);
    else if(activeGame.kind==='text')body=run.mode==='diagram'?configurationDiagram(q):textQuestion(q);
    else if(activeGame.kind==='family')body=familyQuestion(q);
    else if(activeGame.kind==='spin')body=spinQuestion(q);
    else if(activeGame.kind==='lewis')body=lewisQuestion(q);
    else body=choiceQuestion(q);
    content.innerHTML=`<div class="dialog-head"><span class="dialog-kicker">${esc(activeGame.tag)} · ${esc(activeGame.category.toUpperCase())}</span><h2 class="dialog-title" id="dialogTitle">${activeGame.icon} ${esc(activeGame.title)}</h2></div>${meta()}<section class="quiz-panel" id="quizPanel"><div class="question-count">RETO ${run.index+1} DE ${run.questions.length}</div>${body}<div id="feedback" aria-live="polite"></div></section><div class="question-actions" id="questionActions"></div>`;
    if(activeGame.kind==='family')setupFamilyDrag();
    if(activeGame.kind==='lewis')setupLewisPreview(q);
  }
  function choiceQuestion(q){
    return `${q.configuration?`<div class="orbital-visual"><span class="orbital-label">${esc(q.configuration)}</span></div>`:''}<p class="question-prompt">${esc(q.prompt)}</p>${q.context?`<span class="question-context">${esc(q.context)}</span>`:''}<div class="answer-grid">${shuffle(q.options).map(o=>`<button type="button" class="answer-choice" data-answer="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  }
  function textQuestion(q){return `<p class="question-prompt">Escribe la configuración electrónica completa de <strong>${esc(q.prompt)}</strong>.</p><span class="question-context">Puedes escribir, por ejemplo, 1s2 2s2 2p2</span><div class="input-row"><input class="answer-input" id="textAnswer" type="text" autocomplete="off" placeholder="1s2 2s2 …" aria-label="Configuración electrónica"><button class="check-button" type="button" data-action="check-text">Comprobar</button></div>`;}
  function configurationDiagram(q){
    const match=q.answer.match(/(\d+)([spdf])(\d+)$/);if(!match)return textQuestion(q);
    const [,n,sub,e]=match.map((x,i)=>i===0?x:x);const count={s:1,p:3,d:5,f:7}[sub];const l={s:0,p:1,d:2,f:3}[sub];
    return `<p class="question-prompt">Construye el diagrama orbital del último subnivel de <strong>${esc(q.prompt)}</strong>.</p><span class="question-context">Haz clic en cada orbital para ciclar entre vacío, ↑ y ↑↓. Los electrones desapareados deben ocupar orbitales distintos primero.</span><div class="orbital-builder"><div class="orbital-sublevel"><b>${n}${sub}<sup>${e}</sup></b><span>${Array.from({length:count},(_,i)=>`<button type="button" class="orbital-cell" data-orbital="${i}" data-fill="0" aria-label="Orbital m sub l ${i-l}">[ ]</button>`).join('')}</span><small>mₗ: ${Array.from({length:count},(_,i)=>i-l).join(' · ')}</small></div><p class="spin-note">Cada casilla es un orbital: máximo dos electrones con spins opuestos. Hund: primero uno por casilla.</p><div class="input-row"><button class="check-button" type="button" data-action="check-diagram">Comprobar diagrama</button></div></div>`;
  }
  function checkDiagram(){const q=run.questions[run.index],match=q.answer.match(/(\d+)([spdf])(\d+)$/);if(!match){showToast('No se pudo preparar este diagrama.');return;}const sub=match[2],electrons=Number(match[3]),count={s:1,p:3,d:5,f:7}[sub];const expected=Array(count).fill(0);for(let i=0;i<Math.min(electrons,count);i++)expected[i]=1;for(let i=0;i<electrons-count;i++)expected[i]++;const actual=[...document.querySelectorAll('[data-orbital]')].map(x=>Number(x.dataset.fill));answer(expected.every((x,i)=>x===actual[i]),$('#quizPanel'));}
  function atomQuestion(q){
    const elements=['Hidrógeno','Carbono','Oxígeno','Sodio','Cloro','Calcio'];
    const charges=[-2,-1,0,1,2]; const masses=[q.a-1,q.a,q.a+1];
    return `<div class="atom-counts"><span class="count-chip">🔴 ${q.p} protones</span><span class="count-chip">⚪ ${q.n} neutrones</span><span class="count-chip">🔵 ${q.e} electrones</span></div><p class="question-prompt">¿Qué especie se formó? Completa los datos del átomo.</p><div class="field-grid"><label><span class="field-label">ELEMENTO</span><select class="field-select" data-atom="element"><option value="">Elige…</option>${elements.map(x=>`<option>${x}</option>`).join('')}</select></label><label><span class="field-label">NÚMERO ATÓMICO Z</span><select class="field-select" data-atom="z"><option value="">Elige…</option>${shuffle([q.z,q.z+1,q.z-1]).map(x=>`<option value="${x}">${x}</option>`).join('')}</select></label><label><span class="field-label">NÚMERO DE MASA A</span><select class="field-select" data-atom="a"><option value="">Elige…</option>${shuffle(masses).map(x=>`<option value="${x}">${x}</option>`).join('')}</select></label><label><span class="field-label">TIPO DE ESPECIE</span><select class="field-select" data-atom="kind"><option value="">Elige…</option><option value="neutral">Átomo neutro</option><option value="cation">Catión</option><option value="anion">Anión</option></select></label><label><span class="field-label">CARGA</span><select class="field-select" data-atom="charge"><option value="">Elige…</option>${shuffle(charges).map(x=>`<option value="${x}">${x>0?'+':''}${x}</option>`).join('')}</select></label><label><span class="field-label">¿DIFIERE DEL ISÓTOPO NATURAL MÁS ABUNDANTE?</span><select class="field-select" data-atom="isotope"><option value="">Elige…</option><option value="yes">Sí</option><option value="no">No</option></select></label></div><div class="question-actions"><button class="check-button" type="button" data-action="check-atom">Comprobar datos</button></div>`;
  }
  function spinQuestion(q){
    let visual='';
    if(q.configuration){const match=q.configuration.match(/\[(.*?)\]/);if(match){visual=`<div class="orbital-visual"><span class="orbital-label">${esc(q.configuration.split(':')[0])}:</span><span class="orbital-shell">${match[1].trim().split(/\s+/).map(s=>`<span class="orbital-box">${esc(s.replace(/[\[\]]/g,''))}</span>`).join('')}</span></div>`;}else visual=`<div class="orbital-visual"><span class="orbital-label">${esc(q.configuration)}</span></div>`;}
    return `${visual}<p class="question-prompt">${esc(q.prompt)}</p><div class="answer-grid">${shuffle(q.options).map(o=>`<button type="button" class="answer-choice" data-answer="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  }
  const families=['Grupo 13 · familia del boro','Grupo 14 · familia del carbono','Grupo 15 · familia del nitrógeno','Grupo 16 · calcógenos','Grupo 17 · halógenos','Grupo 18 · gases nobles'];
  function familyQuestion(q){return `<p class="question-prompt">¿A qué familia del bloque p pertenece este elemento?</p><span class="draggable-element" id="familyElement" draggable="true" aria-label="Elemento ${esc(q.element)}">${esc(q.element)}</span><span class="question-context">Arrástralo a su familia o toca una tarjeta.</span><div class="drop-families">${families.map(f=>`<button type="button" class="family-drop" data-family="${esc(f)}">${esc(f)}</button>`).join('')}</div>`;}
  function setupFamilyDrag(){const el=$('#familyElement');el.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain','element'));document.querySelectorAll('.family-drop').forEach(zone=>{zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');answer(zone.dataset.family===run.questions[run.index].family,zone);});});}
  function lewisQuestion(q){
    const b=q.builder, bonds=b.type==='diatomic'?[b.bond]:b.bonds;
    const bondFields=bonds.map((_,i)=>`<label><span class="field-label">${b.type==='diatomic'?`ENLACE ${q.prompt.slice(0,-1)}`:`ENLACE ${b.center}–${b.ligands[i]}${b.ligands.filter(x=>x===b.ligands[i]).length>1?` ${i+1}`:''}`}</span><select class="field-select" data-lewis-bond="${i}"><option value="">Elige…</option><option value="1">Sencillo (1)</option><option value="2">Doble (2)</option><option value="3">Triple (3)</option></select></label>`).join('');
    const atomFields=b.type==='diatomic'?`<label><span class="field-label">PARES LIBRES EN CADA ${q.prompt.slice(0,-1)}</span><select class="field-select" data-lewis-pairs><option value="">Elige…</option>${[0,1,2,3,4].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label>`:`<label><span class="field-label">PARES LIBRES EN ${b.center}</span><select class="field-select" data-lewis-center-pairs><option value="">Elige…</option>${[0,1,2,3,4].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><label><span class="field-label">PARES EN CADA ${b.ligands[0]}</span><select class="field-select" data-lewis-ligand-pairs><option value="">Elige…</option>${[0,1,2,3,4].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label>`;
    return `<p class="question-prompt">Construye la estructura de Lewis de <strong>${esc(q.prompt)}</strong>.</p><span class="question-context">${esc(q.context)}</span><div class="lewis-builder"><div class="builder-fields">${bondFields}${atomFields}</div><div class="lewis-preview" id="lewisPreview" aria-live="polite"><small>VISTA PREVIA · los puntos son pares libres</small><div>Elige enlaces y pares para comenzar</div></div></div><div class="question-actions"><button class="check-button" type="button" data-action="check-lewis">Comprobar estructura</button></div>`;
  }
  function setupLewisPreview(q){document.querySelectorAll('.field-select').forEach(el=>el.addEventListener('change',()=>updateLewisPreview(q)));}
  function updateLewisPreview(q){
    const b=q.builder, bondGlyph=['','—','=','≡'];
    const pairs=Number(b.type==='diatomic'?$('[data-lewis-pairs]')?.value: $('[data-lewis-center-pairs]')?.value);
    const lp=Number(b.type==='diatomic'?$('[data-lewis-pairs]')?.value: $('[data-lewis-ligand-pairs]')?.value);
    const dots=n=>Number.isFinite(n)?(n>0?'·· '.repeat(n).trim():''):'⋯';
    const bondAt=i=>bondGlyph[Number($(`[data-lewis-bond="${i}"]`)?.value)]||'⋯';
    let diagram='';
    if(b.type==='diatomic')diagram=`<span class="lewis-dots">${dots(pairs)}</span><strong>${esc(q.prompt.slice(0,-1))}</strong><b>${bondAt(0)}</b><strong>${esc(q.prompt.slice(0,-1))}</strong><span class="lewis-dots">${dots(pairs)}</span>`;
    else diagram=`<span class="center-atom"><span class="lewis-dots">${dots(pairs)}</span><strong>${esc(b.center)}</strong><small>central</small></span><span class="lewis-attachments">${b.ligands.map((atom,i)=>`<span class="lewis-link"><span class="lewis-dots">${dots(lp)}</span><strong>${esc(atom)}</strong><b>${bondAt(i)}</b><strong>${esc(b.center)}</strong></span>`).join('')}</span>`;
    $('#lewisPreview').innerHTML=`<small>VISTA PREVIA · los puntos son pares libres</small><div class="lewis-molecule">${diagram}</div>`;
  }
  function checkLewis(){
    const q=run.questions[run.index],b=q.builder;const bondFields=[...document.querySelectorAll('[data-lewis-bond]')];
    if(bondFields.some(el=>!el.value)){showToast('Elige el orden de cada enlace.');return;}
    const bonds=bondFields.map(el=>Number(el.value));let ok;
    if(b.type==='diatomic'){const pairs=$('[data-lewis-pairs]').value;if(pairs===''){showToast('Indica los pares libres por átomo.');return;}ok=bonds[0]===b.bond&&Number(pairs)===b.pairs;}
    else{const center=$('[data-lewis-center-pairs]').value,ligand=$('[data-lewis-ligand-pairs]').value;if(center===''||ligand===''){showToast('Completa los pares libres del centro y los átomos externos.');return;}ok=bonds.every((n,i)=>n===b.bonds[i])&&Number(center)===b.centerPairs&&b.ligandPairs.every(n=>n===Number(ligand));}
    answer(ok,$('#quizPanel'));
  }
  function normalize(text){return String(text).toLowerCase().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).replace(/[\s,;]+/g,'').replace(/\^/g,'').replace(/−/g,'-');}
  function checkText(){const input=$('#textAnswer');const expected=run.questions[run.index].answer;if(!input.value.trim()){input.focus();return;}answer(normalize(input.value)===normalize(expected),input);}
  function checkAtom(){const q=run.questions[run.index];const vals={};document.querySelectorAll('[data-atom]').forEach(el=>vals[el.dataset.atom]=el.value);if(Object.values(vals).some(v=>v==='')){showToast('Completa todos los datos para comprobar.');return;}
    const kind=q.charge===0?'neutral':q.charge>0?'cation':'anion';const ok=vals.element===q.element&&Number(vals.z)===q.z&&Number(vals.a)===q.a&&vals.kind===kind&&Number(vals.charge)===q.charge&&vals.isotope===(q.isotope?'yes':'no');
    answer(ok,$('#quizPanel'));
  }
  function answer(correct,element){if(!run||run.answered)return;run.answered=true;const q=run.questions[run.index];
    if(correct){run.score+=10;run.correct++;run.lives=Math.min(3,run.lives+0);playTone(true);element.classList.add('correct','celebrate');}
    else{run.lives--;playTone(false);if(element.classList)element.classList.add('incorrect','shake');}
    const feedback=$('#feedback');feedback.innerHTML=`<div class="feedback ${correct?'good':'bad'}"><strong>${correct?'¡Correcto! +10 puntos':'Casi, revisemos la idea'}</strong>${esc(q.explanation)}</div>`;
    $('#quizPanel').querySelectorAll('.answer-choice,.family-drop,.check-button,.field-select,.orbital-cell').forEach(el=>el.disabled=true);
    const actions=$('#questionActions'); if(actions)actions.innerHTML=`<button class="next-button" type="button" data-action="next">${run.lives<=0||run.index===run.questions.length-1?'Ver resultado':'Siguiente reto →'}</button>`;
    const metaEl=$('.game-meta');if(metaEl)metaEl.outerHTML=meta();
  }
  function finishRun(){
    playEffect('success');
    const earned=run.score;state.points+=earned;const previous=state.best[activeGame.id]||0;state.best[activeGame.id]=Math.max(previous,earned);
    const completedNow=run.lives>0&&run.correct>=Math.ceil(run.questions.length*.6);
    let medalMessage='';
    if(completedNow){if(!state.completed.includes(activeGame.id))state.completed.push(activeGame.id);const medal=data.medals.find(m=>m.id===activeGame.id);if(medal&&!state.medals.includes(medal.id)){state.medals.push(medal.id);medalMessage=` ¡Medalla desbloqueada: ${medal.name}!`;}state.unlockedLevel=Math.max(state.unlockedLevel,activeGame.difficulty==='Básico'?2:activeGame.difficulty==='Intermedio'?3:4);}
    saveState();render();
    content.innerHTML=`<div class="dialog-head"><span class="dialog-kicker">MISIÓN ${completedNow?'COMPLETADA':'FINALIZADA'}</span><h2 class="dialog-title" id="dialogTitle">${activeGame.icon} ${esc(activeGame.title)}</h2></div><div class="end-screen"><span class="end-emoji">${completedNow?'🎉':'🧪'}</span><h3>${completedNow?'¡Buen trabajo, químico!':'¡Sigue practicando!'}</h3><div class="end-score">${earned}<small> pts</small></div><p>Respuestas correctas: ${run.correct} de ${run.questions.length}. Mejor puntuación: ${state.best[activeGame.id]} puntos.${esc(medalMessage)} ${completedNow?'Tu progreso quedó guardado en este dispositivo.':'Necesitas al menos 60% de aciertos y conservar una vida para marcar esta misión como completada.'}</p><div class="end-actions"><button class="return-button" type="button" data-action="return">Volver al menú</button><button class="start-button" type="button" data-action="restart">Repetir misión</button></div></div>`;
  }
  const catcherElements=[['H','Hidrógeno'],['C','Carbono'],['N','Nitrógeno'],['O','Oxígeno'],['Na','Sodio'],['Mg','Magnesio'],['Al','Aluminio'],['Si','Silicio'],['P','Fósforo'],['S','Azufre'],['Cl','Cloro'],['K','Potasio'],['Ca','Calcio'],['Fe','Hierro'],['Cu','Cobre'],['Zn','Zinc'],['Ag','Plata'],['Au','Oro'],['Ne','Neón'],['He','Helio']];
  const catcherMolecules=['H₂O','CO₂','O₂','N₂','NH₃','NaCl','CH₄','HCl','H₂SO₄','C₆H₁₂O₆'];
  function startCatcher(){
    stopCatcher();
    playTrack('catcher');
    catcher={x:.5,objects:[],score:0,caught:0,missed:0,lives:3,elapsed:0,lastSpawn:0,lastFrame:0,frame:0,finished:false,tiltEnabled:false,tiltCenter:null,tiltSeen:false,tiltTimer:0};
    content.innerHTML=`<div class="catcher-head"><div><span class="dialog-kicker">ATRAPA ELEMENTOS PUROS · EVITA MOLÉCULAS</span><h2 class="dialog-title" id="dialogTitle">¡Atrapaelementos!</h2></div><span class="catcher-instructions">← → / A D · mouse · toca y arrastra</span></div><div class="catcher-tilt-row"><span id="catcherTiltStatus">Inclina el teléfono para mover al científico.</span><button type="button" id="catcherTiltButton">Activar inclinación</button></div><div class="catcher-hud" aria-live="polite"><span>⭐ <b id="catcherScore">0</b> pts</span><span>❤️ <b id="catcherLives">3</b></span><span>⬇️ Perdidos <b id="catcherMissed">0</b>/10</span><span>⚡ <b id="catcherSpeed">1.0×</b></span></div><div class="catcher-playfield" id="catcherPlayfield" tabindex="0" aria-label="Zona de juego. Mueve al científico para atrapar elementos puros y esquivar moléculas"><div class="catcher-lab-glow"></div><div class="catcher-objects" id="catcherObjects"></div><div class="catcher-player" id="catcherPlayer"><span class="catcher-scientist" aria-hidden="true">🧑🏻‍🔬</span><span class="catcher-beaker" aria-hidden="true"><i></i><b>⚛</b></span></div><div class="catcher-mobile-controls"><button type="button" data-catcher-dir="-1" aria-label="Mover a la izquierda">←</button><button type="button" data-catcher-dir="1" aria-label="Mover a la derecha">→</button></div></div><p class="catcher-tip">Analiza la fórmula: Fe o Au son elementos; H₂O, O₂ y NaCl son moléculas o compuestos.</p>`;
    const field=$('#catcherPlayfield');
    field.addEventListener('pointerdown',moveCatcherPointer);field.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')moveCatcherPointer(e);});
    field.focus({preventScroll:true});
    catcher.frame=requestAnimationFrame(updateCatcher);
  }
  function stopCatcher(){if(catcher?.frame)cancelAnimationFrame(catcher.frame);if(catcher?.tiltTimer)clearTimeout(catcher.tiltTimer);if(catcher?.tiltEnabled)window.removeEventListener('deviceorientation',handleCatcherTilt);catcher=null;}
  function activateCatcherTilt(){
    if(!catcher)return;
    const TiltEvent=window.DeviceOrientationEvent;
    if(!TiltEvent){$('#catcherTiltStatus').textContent='Este navegador no ofrece sensor de inclinación. Usa los botones táctiles.';showToast('Usa las flechas táctiles para mover al científico.');return;}
    const enable=permission=>{if(permission!=='granted'){showToast('No se activó el sensor. Puedes jugar con los botones táctiles.');$('#catcherTiltStatus').textContent='Sensor sin permiso: usa los botones táctiles.';return;}if(!catcher)return;catcher.tiltEnabled=true;catcher.tiltCenter=null;catcher.tiltSeen=false;window.addEventListener('deviceorientation',handleCatcherTilt,{passive:true});$('#catcherTiltButton').textContent='✓ Inclinación activa';$('#catcherTiltButton').disabled=true;$('#catcherTiltStatus').textContent='Inclina el teléfono a izquierda y derecha para moverte.';catcher.tiltTimer=setTimeout(()=>{if(!catcher||catcher.tiltSeen)return;catcher.tiltEnabled=false;window.removeEventListener('deviceorientation',handleCatcherTilt);$('#catcherTiltButton').disabled=false;$('#catcherTiltButton').textContent='Reintentar sensor';$('#catcherTiltStatus').textContent='No llegan datos del sensor. Usa las flechas o arrastra.';},2200);};
    if(typeof TiltEvent.requestPermission==='function'){TiltEvent.requestPermission().then(enable).catch(()=>enable('denied'));}else enable('granted');
  }
  function handleCatcherTilt(event){if(!catcher||!Number.isFinite(event.gamma))return;if(!catcher.tiltSeen){catcher.tiltSeen=true;clearTimeout(catcher.tiltTimer);}if(catcher.tiltCenter===null)catcher.tiltCenter=event.gamma;const target=Math.max(.07,Math.min(.93,.5+(event.gamma-catcher.tiltCenter)/36));catcher.x+=(target-catcher.x)*.32;updateCatcherPlayer();}
  function moveCatcherPointer(e){if(!catcher||e.target.closest('[data-catcher-dir]'))return;const rect=$('#catcherPlayfield').getBoundingClientRect();catcher.x=Math.max(.055,Math.min(.945,(e.clientX-rect.left)/rect.width));updateCatcherPlayer();}
  function updateCatcherPlayer(){const player=$('#catcherPlayer');if(player&&catcher)player.style.left=`${catcher.x*100}%`;}
  function addCatcherObject(){
    const isElement=Math.random()<.67;
    const item=isElement?catcherElements[Math.floor(Math.random()*catcherElements.length)]:catcherMolecules[Math.floor(Math.random()*catcherMolecules.length)];
    const symbol=isElement?item[0]:item;
    const el=document.createElement('div');el.className=`falling-chemical ${isElement?'falling-element':'falling-molecule'}`;el.innerHTML=`<strong>${symbol}</strong><small>Muestra</small>`;el.setAttribute('aria-label',`Muestra química: ${symbol}`);$('#catcherObjects').append(el);
    const direction=Math.random()<.5?-1:1,offset=Math.max(.15,60/$('#catcherPlayfield').clientWidth)+Math.random()*.14;let x=catcher.x+direction*offset;
    if(x<.07||x>.93)x=catcher.x-direction*offset;
    x=Math.max(.07,Math.min(.93,x));
    catcher.objects.push({el,x,y:-58,element:isElement,speed:78+Math.random()*32});
  }
  function updateCatcherHud(){if(!catcher)return;$('#catcherScore').textContent=catcher.score;$('#catcherLives').textContent=`${'❤️'.repeat(catcher.lives)}${'🖤'.repeat(3-catcher.lives)}`;$('#catcherMissed').textContent=catcher.missed;$('#catcherSpeed').textContent=`${(1+catcher.elapsed/45).toFixed(1)}×`;}
  function updateCatcher(time){
    if(!catcher||catcher.finished)return;
    const field=$('#catcherPlayfield');if(!field)return;
    const delta=catcher.lastFrame?Math.min(.05,(time-catcher.lastFrame)/1000):0;catcher.lastFrame=time;catcher.elapsed+=delta;
    const spawnInterval=Math.max(430,1000-catcher.elapsed*8);
    if(time-catcher.lastSpawn>spawnInterval){addCatcherObject();catcher.lastSpawn=time;}
    const height=field.clientHeight,playerLine=height-92,playerX=catcher.x*field.clientWidth;
    const multiplier=1+catcher.elapsed/45;
    catcher.objects=catcher.objects.filter(obj=>{
      obj.y+=(obj.speed*multiplier)*delta;obj.el.style.top=`${obj.y}px`;obj.el.style.left=`${obj.x*100}%`;
      const objX=obj.x*field.clientWidth;
      if(obj.y+52>=playerLine&&obj.y<playerLine+48&&Math.abs(objX-playerX)<60){
        obj.el.remove();if(obj.element){catcher.score+=10;catcher.caught++;playTone(true);}else{catcher.lives--;playTone(false);}updateCatcherHud();return false;
      }
      if(obj.y>height){obj.el.remove();if(obj.element){catcher.missed++;updateCatcherHud();}return false;}
      return true;
    });
    if(catcher.lives<=0||catcher.missed>=10){finishCatcher();return;}
    updateCatcherHud();catcher.frame=requestAnimationFrame(updateCatcher);
  }
  function finishCatcher(){
    if(!catcher||catcher.finished)return;
    pauseTrack('catcher');playEffect('success');
    catcher.finished=true;if(catcher.frame)cancelAnimationFrame(catcher.frame);
    const result={...catcher};const previous=state.best.catcher||0;state.points+=result.score;state.best.catcher=Math.max(previous,result.score);
    const completedNow=result.caught>=5;if(completedNow&&!state.completed.includes('catcher'))state.completed.push('catcher');
    let medalMessage='';if(result.caught>=10&&!state.medals.includes('catcher')){state.medals.push('catcher');medalMessage=' ¡Desbloqueaste la medalla Atrapaelementos!';}
    saveState();render();
    content.innerHTML=`<div class="dialog-head"><span class="dialog-kicker">PARTIDA TERMINADA</span><h2 class="dialog-title" id="dialogTitle">${result.missed>=10?'¡Se escaparon 10 elementos!':'¡Cuidado con las moléculas!'}</h2></div><div class="end-screen"><span class="end-emoji">${completedNow?'🎉':'🧪'}</span><h3>${completedNow?'¡Buen trabajo, químico!':'¡Inténtalo otra vez!'}</h3><div class="end-score">${result.score}<small> pts</small></div><p>Atrapaste ${result.caught} elementos puros y dejaste caer ${result.missed}. Esquivaste ${3-result.lives} moléculas o compuestos. Mejor puntuación: ${state.best.catcher} puntos.${esc(medalMessage)} ${completedNow?'El minijuego quedó completado en tu progreso.':'Atrapa al menos 5 elementos puros para completar este minijuego.'}</p><div class="end-actions"><button class="return-button" type="button" data-action="return">Volver al menú</button><button class="start-button" type="button" data-action="restart-catcher">Jugar otra vez</button></div></div>`;
  }
  function next(){run.index++;renderQuestion();}
  document.addEventListener('click',e=>{
    const catcherDir=e.target.closest('[data-catcher-dir]');if(catcherDir&&catcher){catcher.x=Math.max(.055,Math.min(.945,catcher.x+Number(catcherDir.dataset.catcherDir)*.12));updateCatcherPlayer();return;}
    if(e.target.closest('#catcherTiltButton')){activateCatcherTilt();return;}
    const play=e.target.closest('[data-play]');if(play){openGame(play.dataset.play);return;}
    const filter=e.target.closest('[data-filter]');if(filter){document.querySelectorAll('.filter-button').forEach(x=>x.classList.toggle('active',x===filter));renderGames(filter.dataset.filter);return;}
    const action=e.target.closest('[data-action]');if(action){const a=action.dataset.action;if(a==='start')startRun();else if(a==='start-catcher')startCatcher();else if(a==='restart-catcher')startCatcher();else if(a==='next')next();else if(a==='check-text')checkText();else if(a==='check-atom')checkAtom();else if(a==='check-lewis')checkLewis();else if(a==='check-diagram')checkDiagram();else if(a==='return'){dialog.close();}else if(a==='restart')startRun();return;}
    const mode=e.target.closest('[data-mode]');if(mode){configMode=mode.dataset.mode;document.querySelectorAll('.mode-button').forEach(x=>x.classList.toggle('active',x===mode));return;}
    const orbital=e.target.closest('[data-orbital]');if(orbital&&!run.answered){const nextFill=(Number(orbital.dataset.fill)+1)%3;orbital.dataset.fill=nextFill;orbital.textContent=['[ ]','[↑]','[↑↓]'][nextFill];orbital.setAttribute('aria-pressed',String(nextFill>0));return;}
    const choice=e.target.closest('[data-answer]');if(choice){const q=run.questions[run.index];answer(choice.dataset.answer===q.answer,choice);return;}
    const fam=e.target.closest('[data-family]');if(fam){answer(fam.dataset.family===run.questions[run.index].family,fam);}
  });
  $('#filters').innerHTML=data.categories.map((c,i)=>`<button class="filter-button ${i===0?'active':''}" type="button" data-filter="${esc(c)}">${esc(c)}</button>`).join('');
  $('#closeDialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open)dialog.close();if(e.key==='Enter'&&dialog.open&&$('#textAnswer')===document.activeElement){e.preventDefault();checkText();}});
  document.addEventListener('keydown',e=>{if(!dialog.open||!catcher)return;const key=e.key.toLowerCase();if(key==='arrowleft'||key==='a'){e.preventDefault();catcher.x=Math.max(.055,catcher.x-.12);updateCatcherPlayer();}else if(key==='arrowright'||key==='d'){e.preventDefault();catcher.x=Math.min(.945,catcher.x+.12);updateCatcherPlayer();}});
  dialog.addEventListener('close',()=>{stopCatcher();if(audioEnabled)playTrack('site');});
  $('#resetProgress').addEventListener('click',()=>resetDialog.showModal());
  $('#cancelReset').addEventListener('click',()=>resetDialog.close());
  $('#confirmReset').addEventListener('click',()=>{state=defaultState();saveState();render();resetDialog.close();showToast('Progreso reiniciado. ¡A empezar de nuevo!');});
  resetDialog.addEventListener('click',e=>{if(e.target===resetDialog)resetDialog.close();});
  $('#soundToggle').addEventListener('click',()=>{
    audioEnabled=!audioEnabled;
    audioChoiceMade=true;
    if(!audioEnabled)pauseAllTracks();
    else if(dialog.open){if(activeGame?.kind==='catcher'&&catcher)playTrack('catcher');else pauseAllTracks();}
    else playTrack('site');
    syncAudioControls();
  });
  $('#audioSettingsToggle').addEventListener('click',e=>{const panel=$('#audioPanel'),open=panel.hidden;panel.hidden=!open;e.currentTarget.setAttribute('aria-expanded',String(open));});
  $('#musicVolume').addEventListener('input',e=>{audioVolume=Number(e.currentTarget.value);try{localStorage.setItem('quimifriv-volume',String(audioVolume));}catch{}syncAudioControls();});
  $('#muteAudio').addEventListener('click',()=>{audioMuted=!audioMuted;audioChoiceMade=true;try{localStorage.setItem('quimifriv-muted',String(audioMuted));}catch{}syncAudioControls();});
  syncAudioControls();
  document.addEventListener('pointerdown',e=>{
    if(e.target.closest('.top-controls')||audioChoiceMade)return;
    audioEnabled=true;audioChoiceMade=true;syncAudioControls();
    if(dialog.open){if(activeGame?.kind==='catcher'&&catcher)playTrack('catcher');else pauseAllTracks();}
    else playTrack('site');
  },{capture:true});
  const themeToggle=$("#themeToggle");
  function syncThemeButton(){const dark=document.documentElement.dataset.theme==="dark";themeToggle.setAttribute("aria-pressed",String(dark));themeToggle.title=dark?"Activar modo claro":"Activar modo oscuro";themeToggle.setAttribute("aria-label",themeToggle.title);themeToggle.querySelector(".theme-icon").textContent=dark?"☀":"☾";themeToggle.querySelector(".theme-label").textContent=dark?"Modo claro":"Modo oscuro";document.querySelector("#themeColorMeta").content=dark?"#102a35":"#123f50";}
  syncThemeButton();
  themeToggle.addEventListener("click",()=>{const dark=document.documentElement.dataset.theme!=="dark";document.documentElement.dataset.theme=dark?"dark":"light";try{localStorage.setItem("quimifriv-theme",dark?"dark":"light")}catch{}syncThemeButton();});
  $('#newConcept').addEventListener('click',()=>{const el=$('#conceptText');const current=data.concepts.indexOf(el.textContent);el.textContent=data.concepts[(current+1)%data.concepts.length];});
  render();
})();

