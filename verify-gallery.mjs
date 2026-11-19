import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createArchiveServer } from './server.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const index = await read('gallery-data/grid-index.json');
assert.deepEqual(index.map(p => p.code), ['n1','n2','n3','n4','n5','n6','n7','e1','e2','e3','e5','e4','e6']);
const media = await read('gallery-data/media.json');
for (const pair of Object.values(media)) for (const entry of Object.values(pair)) if (entry) {
  await fs.access(path.join(root, entry.file)); await fs.access(path.join(root, entry.poster));
}
const candidates = await read('design-review/plan-candidates.json');
const audit = await read('design-review/plan-audit.json');
for (const [key,file] of Object.entries({'e4:grid:initial':'jonah-grid-initial.json','e6:grid:initial':'brian-grid-initial.json','e6:text:initial':'brian-text-initial.json'})){
  const recovery=await read(`design-review/recovered-initial-plans/${file}`);
  candidates[key]={...candidates[key],plan:recovery.plan,recovery:{file,sourceEvents:recovery.sourceEvents,verification:recovery.verification}};
}
let linked = 0, unavailable = 0, narrativeCount = 0, initialTextBeats = 0;
for (const item of index) {
  const p = await read(`gallery-data/grids/${item.id}.json`);
  const prose=p.initialTextPlan;
  assert(prose,`Missing Initial Grid text plan for ${item.code}`);
  assert.equal(prose.sourceFile,`projects/${item.id}/plan/initial-grid-plan.txt`);
  assert.equal(await fs.readFile(path.join(root,prose.sourceFile),'utf8'),prose.text);
  assert.equal(prose.sourceGridSha256,createHash('sha256').update(JSON.stringify(p.initial)).digest('hex'));
  assert.equal(prose.beats.length,p.initial.beats.length);
  initialTextBeats+=prose.beats.length;
  const flatten=cards=>cards.flatMap(card=>[card,...flatten(card.children||[])]);
  let elapsed=0;
  for(const [i,beat] of p.initial.beats.entries()){
    const rendered=prose.beats[i];
    assert.equal(rendered.id,beat.id);assert(rendered.title&&rendered.goal);
    assert.equal(rendered.startS,elapsed);elapsed+=beat.targetDurationSeconds;assert.equal(rendered.endS,elapsed);
    for(const track of beat.tracks)for(const card of flatten(track.cards))if(card.kind==='asset'){
      const section=rendered.sections.find(section=>section.track===track.row&&section.cardIds.includes(card.id));
      assert(section,`Every Initial asset belongs to its saved text section: ${item.code} ${card.id}`);
      const moment=p.moments[card.momentId];
      if(moment?.videoName&&Number.isFinite(card.sourceStartS??moment.startS)&&Number.isFinite(card.sourceEndS??moment.endS))assert(section.references.some(ref=>ref.type==='clip'&&ref.videoName===moment.videoName&&ref.startS===(card.sourceStartS??moment.startS)&&ref.endS===(card.sourceEndS??moment.endS)));
    }
    for(const section of rendered.sections)for(const ref of section.references)if(ref.type==='clip'){
      assert(prose.text.includes(ref.tag));
      const card=beat.tracks.filter(track=>track.row===section.track).flatMap(track=>flatten(track.cards)).find(card=>card.id===ref.cardId);
      assert(card,'A text-plan clip must belong to this Initial beat and track');
      const moment=p.moments[card.momentId];
      assert.equal(ref.videoName,moment.videoName);
      assert.equal(ref.startS,card.sourceStartS??moment.startS);assert.equal(ref.endS,card.sourceEndS??moment.endS);
    }
  }
  if(item.code==='n7')assert.equal(elapsed,55,'Preserve the actual Initial Grid runtime');
  const savedNarrative=await read(`projects/${item.id}/plan/narrative-plan.json`).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(savedNarrative?.text?.trim()){
    narrativeCount++;
    assert.equal(p.narrative.text,savedNarrative.text,'The full saved LLM input must remain exact');
    assert.equal(p.narrative.narrativeText+p.narrative.executionInstructions,p.narrative.text,'Separating technical instructions must not remove any text');
    assert.equal(p.narrative.updatedAt,savedNarrative.updatedAt);
    assert.equal(p.narrative.sourceFile,`projects/${item.id}/plan/narrative-plan.json`);
  }else assert.equal(p.narrative,null,'Do not fabricate a missing narrative');
  for (const phase of ['initial','revised']) {
    assert.deepEqual(p[phase],candidates[`${item.code}:grid:${phase}`].plan);
    assert.deepEqual(p.references[phase].map(image=>image.name),audit.rows.find(row=>row.projectId===item.id).phases[phase].screenshots);
    for(const image of p.references[phase]){await fs.access(path.join(root,image.file));await fs.access(path.join(root,image.preview));}
    for (const clip of Object.values(p.clips[phase])) {
      if (clip.unavailable) { unavailable++; continue; }
      linked++; assert(clip.end > clip.start && clip.start >= 0);
      await fs.access(path.join(root, clip.file)); await fs.access(path.join(root, clip.poster));
    }
  }
}
assert.equal(initialTextBeats,52);
// Ensure all 52 saved snapshots retain their audited source and plan, including Brian/Jonah repairs.
for (const file of await fs.readdir(path.join(root, 'gallery-data/plans'))) if (file.endsWith('-snapshots.json')) {
  const pair = await read(`gallery-data/plans/${file}`);
  for (const phase of ['initial','revised']) assert.deepEqual(pair[phase], candidates[`${pair.participant.split(' ')[0]}:${pair.condition}:${phase}`]);
  for(const phase of ['initial','revised'])assert.deepEqual(pair.references[phase].map(image=>image.name),audit.rows.find(row=>row.projectId===pair.projectId).phases[phase].screenshots);
}
class Element {
  constructor(){this.events={};this.dataset={};this.attrs={};this.innerHTML='';this.paused=true;this.currentTime=0;this.classList={remove(){},toggle(){}};this.style={};}
  addEventListener(type, callback){(this.events[type] ||= []).push(callback);}
  async emit(type, event={}){for(const callback of this.events[type]||[])await callback(event);}
  setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k];} removeAttribute(k){delete this.attrs[k];}
  pause(){this.paused=true;} load(){} focus(){} scrollIntoView(){} scrollTo(){}
  querySelectorAll(){return [];} querySelector(){return null;}
  showModal(){this.open=true;} close(){this.open=false;this.emit('close');}
}
const gridJS = await fs.readFile(path.join(root,'grid-view.js'),'utf8');
const requests=[];
const fetchLocal=async url=>{requests.push(url);return {ok:true,json:()=>read(url.replace(/^\//,''))};};
for (const item of index) {
  const content=new Element(), dialog=new Element(), source=new Element(), heading=new Element(), close=new Element(), video=new Element(), viewport=new Element();
  source.querySelector=()=>video;source.querySelectorAll=()=>[video];
  content.querySelector=selector=>selector==='#grid-viewport'?viewport:null;
  const elements={'#grid-preview-content':content,'#source-dialog':dialog,'#source-content':source,'#source-heading':heading,'#source-close':close,'#source-status':new Element()};
  const element=new Element();element.clientWidth=1100;element.querySelector=s=>elements[s];
  const document={body:{dataset:{}},getElementById:id=>id==='pinboard-grid-study'?element:content,addEventListener(){}};
  const window={addEventListener(){}};window.parent=window;
  const context={document,window,location:{search:`?project=${item.id}`,origin:'http://localhost'},URLSearchParams,fetch:fetchLocal,console};
  await vm.runInNewContext(gridJS,context);
  assert(!content.textContent,content.textContent);
  assert(content.innerHTML.includes('data-mode="revised" aria-pressed="true"'));
  assert(!content.innerHTML.includes('data-mode="compare"'));
  assert(!content.innerHTML.includes('grid-inspector'));
  assert(content.innerHTML.includes('data-phase="revised"'));
  assert(content.innerHTML.includes('What the video-generation LLM reads'));
  const narrativeSection=content.innerHTML.split('<section class="g-narrative"')[1].split('</section>')[0];
  const record=await read(`gallery-data/grids/${item.id}.json`);
  const proseSection=()=>content.innerHTML.split('<section class="g-initial-text"')[1].split('</section>')[0];
  assert(proseSection().includes('Initial Grid text plan'));
  assert(!proseSection().includes('Download .txt'));
  assert(!proseSection().includes('Source information'));
  const htmlEscape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  assert(proseSection().includes(`<div class="g-initial-text-prose">${htmlEscape(record.initialTextPlan.text)}</div>`),'Show exact saved plain text without formatting');
  assert(proseSection().includes('<details ><summary>Read Initial text plan'));
  if(record.narrative){
    assert(narrativeSection.includes('Latest saved narrative'));
    assert(narrativeSection.includes('separate Initial and Revised narratives are not preserved'));
    assert(narrativeSection.includes('Full exact saved LLM input'));
    assert(narrativeSection.includes(record.narrative.sourceFile));
    assert(!narrativeSection.includes('\\n\\n##'),'Render real line breaks rather than JSON escapes');
  }else assert(narrativeSection.includes('No saved narrative plan is available'));
  await element.emit('click',{target:{closest:()=>({dataset:{mode:'initial'}})}});
  assert(content.innerHTML.includes('data-phase="initial"'));
  assert(proseSection().includes('<details open><summary>Read Initial text plan'));
  assert([...content.innerHTML.matchAll(/data-status="([^"]+)"/g)].every(match=>match[1]==='plain'),'Initial must not have diff styling');
  assert(!/g-card-mark|g-changebar|data-step=|id="grid-show-diff"/.test(content.innerHTML),'Initial must not have diff controls or badges');
  assert(content.innerHTML.includes('Initial reference screenshots'));
  const notes=record.initial.beats.flatMap(beat=>beat.tracks.flatMap(track=>track.cards)).filter(card=>card.kind==='text'&&card.text);
  assert(notes.length,'Each participant has a note to inspect');
  await element.emit('click',{target:{closest:()=>({dataset:{card:notes[0].id,phase:'initial'}})}});
  assert(dialog.open);assert(heading.textContent.includes('Initial plan · Full note'));
  assert(source.innerHTML.includes(`<div class="g-full-note">${htmlEscape(notes[0].text)}</div>`),'Clicking a note displays its complete text');
  assert(!source.innerHTML.includes('<video'));
  dialog.close();
  assert.equal(content.innerHTML.split('<section class="g-narrative"')[1].split('</section>')[0],narrativeSection,'Switching Grid versions must not imply a different saved narrative');
  await element.emit('click',{target:{closest:()=>({dataset:{mode:'revised'}})}});
  await element.emit('change',{target:{id:'grid-show-diff',checked:false}});
  assert([...content.innerHTML.matchAll(/data-status="([^"]+)"/g)].every(match=>match[1]==='plain'),'Revised with diff off must be clean');
  assert(!/g-card-mark|g-changebar|data-step=|data-phase="initial"/.test(content.innerHTML),'Revised with diff off must not show removed ghosts or diff controls');
  assert(content.innerHTML.includes('Revised reference screenshots'));
  await element.emit('change',{target:{id:'grid-show-diff',checked:true}});
  assert(content.innerHTML.includes('id="grid-show-diff" checked'));
  assert(content.innerHTML.includes('g-changebar'));
  await element.emit('click',{target:{closest:()=>({dataset:{step:'1'}})}});
  const project=await read(`gallery-data/grids/${item.id}.json`);
  const match=Object.entries(project.clips.initial).find(([,clip])=>clip.name==='B003C009_240719KG'&&!clip.unavailable);
  if(match){
    await element.emit('click',{target:{closest:()=>({dataset:{card:match[0],phase:'initial'}})}});
    assert(dialog.open);assert(source.innerHTML.includes(`#t=${match[1].start},${match[1].end}`));
    assert(!source.innerHTML.includes('autoplay'));assert(source.innerHTML.includes('poster='));
    await video.emit('loadedmetadata');assert.equal(video.currentTime,match[1].start);
    video.paused=false;video.currentTime=match[1].end+1;await video.emit('timeupdate');assert(video.paused);assert.equal(video.currentTime,match[1].end);
    dialog.close();assert.equal(source.innerHTML,'');
  }
}
assert(requests.every(url=>url.endsWith('.json')),'Grid startup must not fetch videos');
const galleryJS=await fs.readFile(path.join(root,'videos.js'),'utf8');
const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
for(const id of ['modalInitial','modalFinal'])node(id).parentElement={querySelector:()=>new Element()};
node('search').value='';node('participant').value='all';node('condition').value='all';
const document={getElementById:node,addEventListener(){},body:{style:{}},activeElement:new Element()};
const context=vm.createContext({document,window:{addEventListener(){}},location:{origin:'http://localhost'},fetch:fetchLocal,console});
vm.runInContext(galleryJS.replace(/main\(\);\s*$/,'globalThis.boot=main(); globalThis.openModal=wireModal;'),context);await context.boot;
const rendered=node('cards').innerHTML;
assert.equal((rendered.match(/<details class="participant-row" open>/g)||[]).length,13);
assert.equal((rendered.match(/class="preview-still"/g)||[]).length,26);
assert(!rendered.includes('<video'),'Gallery must not start background video downloads');
let prior=-1;for(const item of index){const pos=rendered.indexOf(`class="participant-name">${item.code} `);assert(pos>prior,item.code);prior=pos;}
const controller=context.openModal();
for(const id of Object.keys(media)){
  const pair=await read(`gallery-data/plans/${id}-snapshots.json`);
  await controller.open({projectId:id,participant:pair.participant,condition:pair.condition==='text'?'text-plan':'grid',projectName:'Study'});
  assert(node('modalInitial').paused&&node('modalFinal').paused);
  const html=node('planPanel').innerHTML;
  assert(pair.condition==='grid'?html.includes('interactive-grid'):html.includes('Initial plan · before revision'));
  if(pair.condition==='text'){
    assert(html.includes('id="text-show-diff"'));
    const initial=html.split('<div class="line-list left">')[1].split('</section>')[0];
    assert(!/line-removed|line-added/.test(initial),'Initial Text plan must have no diff styling');
    assert(html.includes('Initial reference screenshots')&&html.includes('Revised reference screenshots'));
    assert(!/<img src=/.test(html),'Reference images must load only when expanded');
    for(const phase of ['initial','revised'])for(const image of pair.references[phase]){await fs.access(path.join(root,image.file));await fs.access(path.join(root,image.preview));}
  }
  assert(html.includes('Requirement text:'));
}
console.log(`Data/UI checks passed: 13 Initial Grid text files (${initialTextBeats} beats), 26 modals, 52 audited snapshots, ${narrativeCount} exact saved narratives; ${linked} source references linked, ${unavailable} explicitly unavailable.`);
// Exercise real HTTP byte-range streaming, route isolation, and JSON responses.
const server=await createArchiveServer(root);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const route of ['/','/stats','/videos','/grid-view.html','/grid-view.js','/grid-view.css','/gallery-data/grid-index.json']){
    const r=await fetch(base+route);assert.equal(r.status,200,route);if(route.endsWith('.js'))assert(r.headers.get('content-type').includes('javascript'));await r.arrayBuffer();
  }
  const file=(await read('gallery-data/sources.json')).B003C009_240719KG.file;
  const reference=(await read(`gallery-data/grids/${index[0].id}.json`)).references.initial[0];
  const image=await fetch(base+'/'+encodeURI(reference.file));assert.equal(image.status,200);assert(image.headers.get('content-type').includes('image/png'));await image.arrayBuffer();
  const started=performance.now();
  const r=await fetch(base+'/'+file,{headers:{Range:'bytes=0-1023'}});assert.equal(r.status,206);assert(r.headers.get('content-range').startsWith('bytes 0-1023/'));assert.equal((await r.arrayBuffer()).byteLength,1024);
  console.log(`HTTP checks passed, including MP4 byte-range playback (${Math.round(performance.now()-started)}ms for 1 KB locally).`);
}finally{await new Promise(resolve=>server.close(resolve));}
