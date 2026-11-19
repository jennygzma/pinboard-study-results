(async () => {
  const root=document.getElementById('pinboard-grid-study');
  const content=root.querySelector('#grid-preview-content');
  const query=new URLSearchParams(location.search);
  document.body.dataset.embed=String(query.get('embed')==='1');
  const fetchJSON=async url=>{const response=await fetch(url);if(!response.ok)throw Error('Saved Grid could not be loaded.');return response.json();};
  const participants=await fetchJSON('/gallery-data/grid-index.json');
  const requested=participants.find(item=>item.id===query.get('project')||item.code===query.get('participant'))||participants[0];
  const projectCache=new Map();
  const loadProject=async id=>{if(!projectCache.has(id))projectCache.set(id,await fetchJSON(`/gallery-data/grids/${id}.json`));return projectCache.get(id);};
  const data={projects:[await loadProject(requested.id)]};
  const saved=globalThis.window?.openai?.widgetState?.privateContent;
  const state={participant:'n1',mode:'revised',showDiff:true,zoom:1,dim:false,labels:false,filter:'all',selected:null,cardHeight:105,...(saved?.kind==='pinboard-grid-design'?saved:{})};
  if(!['initial','revised'].includes(state.mode))state.mode='revised';
  state.participant=requested.code;
  const trackNames={b_roll:'B-Roll',a_roll:'A-Roll',music:'Music',text_graphics:'Text / Graphics'};
  const categoryNames={all:'All changes',added:'Added',removed:'Removed',timing:'Timing',text:'Text',source:'Source',moved:'Moved',labels:'Group names'};
  const escape=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const equal=(before,after)=>JSON.stringify(before??null)===JSON.stringify(after??null);
  const format=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))?`${Number(value).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}s`:'Unknown';
  const project=()=>data.projects.find(item=>item.code===state.participant)||data.projects[0];
  const plans=()=>({initial:project().initial,revised:project().revised});
  const diffEnabled=()=>state.mode==='revised'&&state.showDiff!==false;
  let maps,changes,scale,total,placements;
  function flatten(plan) {
    const cards=new Map(),beats=new Map();let offset=0;
    for(const beat of plan.beats){
      const span=Number(beat.targetDurationSeconds)||Math.max(1,...beat.tracks.flatMap(track=>track.cards.map(card=>(Number(card.time?.positionSeconds)||0)+(Number(card.time?.durationSeconds)||0))));
      const record={...beat,offset,duration:span};beats.set(beat.id,record);
      for(const track of beat.tracks){function visit(card,parent=null,parentStart=0){const local=Number(card.time?.positionSeconds)||0;const value={...card,beatId:beat.id,beatName:beat.name,row:card.row||track.row,parent,start:offset+parentStart+local,local,duration:Number(card.time?.durationSeconds)||0};cards.set(card.id,value);for(const child of card.children??[])visit(child,card.id,parentStart+local);}for(const card of track.cards)visit(card);}
      offset+=span;
    }
    return {cards,beats,duration:offset};
  }
  function sourceRange(card){const moment=project().moments[card?.momentId]??{};return {start:card?.sourceStartS??moment.startS??null,end:card?.sourceEndS??moment.endS??null};}
  const sourceDialog=root.querySelector('#source-dialog'),sourceContent=root.querySelector('#source-content');
  function releaseSource(){for(const video of sourceContent.querySelectorAll('video')){video.pause();video.removeAttribute('src');video.load();}sourceContent.innerHTML='';}
  sourceDialog.addEventListener('close',releaseSource);
  root.querySelector('#source-close').addEventListener('click',()=>sourceDialog.close());
  sourceDialog.addEventListener('click',event=>{if(event.target===sourceDialog)sourceDialog.close();});
  root.addEventListener('toggle',event=>{if(event.target.matches?.('.g-supporting')&&event.target.open)for(const video of event.target.querySelectorAll('video[data-video-file]')){video.src=video.dataset.videoFile;video.removeAttribute('data-video-file');}},true);
  root.addEventListener('toggle',event=>{if(event.target.matches?.('.reference-screenshots')&&event.target.open)for(const image of event.target.querySelectorAll('img[data-reference-src]')){image.src=image.dataset.referenceSrc;image.removeAttribute('data-reference-src');}},true);
  root.addEventListener('play',event=>{if(event.target.tagName==='VIDEO')for(const other of root.querySelectorAll('video'))if(other!==event.target)other.pause();},true);
  root.addEventListener('play',()=>{if(window.parent!==window)window.parent.postMessage({type:'pinboard:source-play'},location.origin);},true);
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='pinboard:pause')for(const video of root.querySelectorAll('video'))video.pause();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sourceDialog.open&&window.parent!==window){window.parent.postMessage({type:'pinboard:close'},location.origin);}});
  function showSource(card,phase){
    releaseSource();
    const info=project().clips[phase]?.[card.id];
    root.querySelector('#source-heading').textContent=`${phase==='initial'?'Initial':'Revised'} plan · Source footage`;
    if(card.kind==='group'){
      const assets=[];const visit=cards=>cards.forEach(child=>{if(child.kind==='asset')assets.push(child);if(child.children)visit(child.children);});visit(card.children||[]);
      sourceContent.innerHTML=`<p class="g-caption">${escape(cardTitle(card))}</p><div class="g-clip-list">${assets.map(child=>{const clip=project().clips[phase]?.[child.id];return `<button type="button" class="g-button" data-source-card="${escape(child.id)}" data-source-phase="${phase}">${escape(cardTitle(child))}<small>${clip&&!clip.unavailable?`${format(clip.start)}–${format(clip.end)}`:'Source unavailable'}</small></button>`;}).join('')||'<p>No source clips are saved for this group.</p>'}</div>`;
    }else if(!info||info.unavailable){
      sourceContent.innerHTML=`<p>${escape(info?.name||cardTitle(card))}</p><p class="g-caption">${escape(info?.reason||'No source footage is linked to this card.')}</p>`;
    }else{
      // Stream the existing fast-start MP4. No clip rendering or transcoding on click.
      sourceContent.innerHTML=`<video id="source-player" controls playsinline preload="metadata" poster="/${escape(info.poster)}" src="/${escape(info.file)}#t=${info.start},${info.end}"></video><p class="g-caption">${escape(info.name)} · ${format(info.start)}–${format(info.end)} in the original source · ${(info.end-info.start).toFixed(1)} seconds</p><p class="g-caption" id="source-status" role="status">Source segment referenced by this plan card. Press play to watch.</p>`;
      const video=sourceContent.querySelector('video');
      video.addEventListener('loadedmetadata',()=>{video.currentTime=info.start;},{once:true});
      video.addEventListener('play',()=>{if(video.currentTime<info.start||video.currentTime>=info.end-.05)video.currentTime=info.start;});
      video.addEventListener('timeupdate',()=>{if(video.currentTime>=info.end){video.pause();if(video.currentTime>info.end+.05)video.currentTime=info.end;}else if(video.currentTime<info.start-.15)video.currentTime=info.start;});
      video.addEventListener('error',()=>{const status=sourceContent.querySelector('#source-status');if(status)status.textContent='This source video could not be loaded. The rest of the gallery is still available.';});
    }
    if(!sourceDialog.open)sourceDialog.showModal();
  }
  function cardFields(before,after){
    if(!before)return ['added'];if(!after)return ['removed'];const changed=[];
    if(!equal(before.text??'',after.text??'')||!equal(before.notes??'',after.notes??'')||before.kind!==after.kind)changed.push('text');
    if(!equal(before.summary??'',after.summary??''))changed.push('labels');
    if(Math.abs(before.local-after.local)>.001||Math.abs(before.duration-after.duration)>.001)changed.push('timing');
    if(before.beatId!==after.beatId||before.row!==after.row||before.parent!==after.parent)changed.push('moved');
    if(before.momentId!==after.momentId||!equal(sourceRange(before),sourceRange(after)))changed.push('source');
    return changed;
  }
  function rebuild(){
    const values=plans();maps={initial:flatten(values.initial),revised:flatten(values.revised)};changes=[];
    for(const [id,beat]of maps.revised.beats){const before=maps.initial.beats.get(id);if(!before||Math.abs(before.duration-beat.duration)>.001)changes.push({key:'beat:'+id,id,entity:'beat',categories:[before?'timing':'added'],title:beat.name,before,after:beat});}
    for(const [id,beat]of maps.initial.beats)if(!maps.revised.beats.has(id))changes.push({key:'beat:'+id,id,entity:'beat',categories:['removed'],title:beat.name,before:beat,after:null});
    for(const id of new Set([...maps.initial.cards.keys(),...maps.revised.cards.keys()])){
      const before=maps.initial.cards.get(id),after=maps.revised.cards.get(id),categories=cardFields(before,after);
      if(categories.length)changes.push({key:'card:'+id,id,entity:'card',categories,title:cardTitle(after||before),before,after});
    }
    const visibleMaps=diffEnabled()?Object.values(maps):[maps[state.mode]];
    total=Math.max(...visibleMaps.map(map=>map.duration),...visibleMaps.flatMap(map=>[...map.cards.values()].map(card=>card.start+card.duration)));scale=(Math.max(740,(root.clientWidth||1000)-46)-86)/Math.max(1,total)*state.zoom;
    placements={};
    for(const row of Object.keys(trackNames))for(const phase of ['initial','revised']){
      const cards=[...maps[phase].cards.values()].filter(card=>card.row===row&&!card.parent);const lanes=[];
      placements[phase+':'+row]=cards.map(card=>{const start=card.start*scale,span=Math.max(54,card.duration*scale);let lane=lanes.findIndex(end=>end<=start+1);if(lane<0)lane=lanes.length;lanes[lane]=start+span+3;return {card,lane,left:86+start,width:span};});
    }
    const visible=visibleChanges();
    if(state.selected){const [kind,id]=state.selected.split(':');const collection=kind==='beat'?'beats':'cards';if(!maps.initial[collection].has(id)&&!maps.revised[collection].has(id))state.selected=null;}
    if(!state.selected&&diffEnabled()){const first=visible.find(change=>change.entity==='card'&&change.categories.includes('timing'))||visible[0];state.selected=first?.key||null;}
  }
  function visibleChanges(){return changes.filter(change=>(state.labels||change.categories.some(category=>category!=='labels'))&&(state.filter==='all'||change.categories.includes(state.filter)));}
  function selected(){const change=changes.find(change=>change.key===state.selected);if(change)return change;if(state.selected?.startsWith('beat:')){const id=state.selected.slice(5),before=maps.initial.beats.get(id),after=maps.revised.beats.get(id);return {key:state.selected,id,entity:'beat',categories:[],title:(after||before).name,before,after};}return null;}
  function cardTitle(card){const moment=project().moments[card?.momentId];return card?.kind==='group'?(card.summary||`Asset group · ${card.children?.length??0} members`):card?.text||moment?.videoName||card?.notes||'Unidentified source';}
  function selectedCard(){if(!state.selected?.startsWith('card:'))return null;const id=state.selected.slice(5);return maps.revised.cards.get(id)||maps.initial.cards.get(id);}
  function badgeText(fields,before,after){
    if(fields.includes('added'))return '+ Added';if(fields.includes('removed'))return '− Removed';
    if(fields.includes('timing'))return before&&after&&Math.abs(before.duration-after.duration)>.001?`${format(before.duration)} → ${format(after.duration)}`:'Position changed';
    if(fields.includes('source'))return 'Source trim changed';if(fields.includes('text'))return 'Text edited';if(fields.includes('moved'))return 'Moved';if(fields.includes('labels'))return 'Group name updated';return '';
  }
  function cardMarkup(item,phase,ghost=false){
    const {card,lane,left,width}=item;const before=maps.initial.cards.get(card.id),after=maps.revised.cards.get(card.id);
    const allFields=diffEnabled()?cardFields(before,after):[],fields=allFields.filter(category=>category!=='labels'||state.labels);const status=!diffEnabled()?'plain':ghost?'removed':!fields.length?'unchanged':fields.includes('added')?'added':fields.includes('removed')?'removed':'changed';
    const range=sourceRange(card);const description=card.kind==='group'?`${card.children?.length??0} members`:card.kind==='asset'?`${format(range.start)}–${format(range.end)}`:format(card.duration);
    const icon=card.kind==='group'?'▱':card.kind==='asset'?'▧':'▤';
    const childrenChanged=diffEnabled()&&card.kind==='group'&&(card.children??[]).some(child=>cardFields(maps.initial.cards.get(child.id),maps.revised.cards.get(child.id)).some(category=>category!=='labels'));
    return `<button type="button" class="g-card g-card-${card.kind}" data-card="${escape(card.id)}" data-phase="${ghost?'initial':phase}" data-status="${status==='unchanged'&&childrenChanged?'changed':status}" data-selected="${state.selected==='card:'+card.id||selectedCard()?.parent===card.id}" style="left:${left}px;top:${lane*(state.cardHeight+9)+10}px;width:${width}px;height:${state.cardHeight}px" aria-label="${escape(cardTitle(card))}. ${diffEnabled()?(badgeText(fields,before,after)||'Unchanged'):''}"><span class="g-card-top"><span>${icon} ${card.kind==='group'?'Group':card.kind==='asset'?(project().clips[ghost?'initial':phase]?.[card.id]?.file?'▶ Clip':'Clip · unavailable'):'Note'}</span><span>${escape(description)}</span></span><span class="g-card-content">${escape(cardTitle(card))}</span>${diffEnabled()&&status!=='unchanged'?`<span class="g-card-mark">${escape(badgeText(fields,before,after))}</span>`:childrenChanged?'<span class="g-card-mark">Change inside group</span>':''}</button>`;
  }
  function beatBand(phase){
 const showDiff=diffEnabled();
 return `<div class="g-beat-band"><div class="g-version"><strong>${phase==='initial'?'Initial':'Revised'}</strong>${format(maps[phase].duration)} total</div>${[...maps[phase].beats.values()].map(beat=>{const other=maps.initial.beats.get(beat.id),changed=showDiff&&(!other||Math.abs(other.duration-beat.duration)>.001),shift=showDiff&&other?beat.offset-other.offset:0;return `<button type="button" class="g-beat" data-beat="${escape(beat.id)}" data-changed="${changed}" data-status="${!showDiff?'plain':!other?'added':changed?'changed':'unchanged'}" data-selected="${state.selected==='beat:'+beat.id}" style="left:${86+beat.offset*scale}px;width:${beat.duration*scale}px" aria-label="${escape(beat.name)}, ${format(beat.duration)}${changed?', duration changed':''}"><strong>${escape(beat.name)}</strong><small>${format(beat.duration)} planned${changed&&other?` · was ${format(other.duration)}`:shift>.001?` · starts +${format(shift)}`:''}</small></button>`;}).join('')}</div>`;
}
  function timeline(){
    const phases=[state.mode];const width=86+total*scale+8;
    const axis=`<div class="g-axis"><span class="g-axis-label">Seconds</span>${Array.from({length:Math.floor(total/5)+1},(_,index)=>index*5).map(second=>`<span style="left:${86+second*scale}px">${second}s</span>`).join('')}</div>`;
    let rows='';
    for(const row of Object.keys(trackNames)){
      const rowItems=phases.map(phase=>placements[phase+':'+row]);const maxLane=Math.max(0,...rowItems.flatMap(items=>items.map(item=>item.lane)));
      const height=Math.max(85,(maxLane+1)*(state.cardHeight+9)+10);
      rows+=`<div class="g-track-heading">${trackNames[row]}</div>`;
      for(const phase of phases){
        let items=[...placements[phase+':'+row]];let laneHeight=height;
        if(diffEnabled()&&phase==='revised'){
          const removed=placements['initial:'+row].filter(item=>!maps.revised.cards.has(item.card.id));
          items.push(...removed.map((item,index)=>({...item,ghost:true,lane:maxLane+1+index})));laneHeight+=removed.length*(state.cardHeight+9);
        }
        rows+=`<div class="g-lane" data-phase="${phase}" style="height:${laneHeight}px"><div class="g-version"><strong>${phase==='initial'?'Initial':'Revised'}</strong></div>${[...maps[phase].beats.values()].map(beat=>`<span class="g-boundary" style="left:${86+beat.offset*scale}px"></span>`).join('')}${items.map(item=>cardMarkup(item,phase,item.ghost)).join('')}</div>`;
      }
    }
    return `<div class="g-grid-frame"><div class="g-viewport" id="grid-viewport"><div class="g-board ${diffEnabled()&&state.dim?'g-dim':''}" style="width:${width}px;--g-second:${scale}px"><div class="g-header">${axis}${phases.map(beatBand).join('')}</div>${rows}</div></div><div class="g-footer">${diffEnabled()?`<span class="g-key"><span class="g-dot"></span>Edited / retimed</span><span class="g-key"><span class="g-dot g-added"></span>＋ Added</span><span class="g-key"><span class="g-dot g-removed"></span>− Removed</span>`:''}<span class="g-key"><span class="g-dot g-selected"></span>Selected</span><span>Click a clip to watch its source. Click a group to browse its clips.</span></div></div>`;
  }
  function support(){
    return `<details class="g-supporting"><summary>Videos and plan-following requirements</summary><div class="g-video-pair">${['initial','revised'].map(phase=>{const score=project().scores[phase],media=project().videos[phase];return `<section><h3>${phase==='initial'?'Initial':'Revised'} video</h3>${media?`<video controls playsinline preload="none" poster="/${escape(media.poster)}" data-video-file="/${escape(media.file)}"></video>`:'<p class="g-caption">Video unavailable.</p>'}${score?`<p style="margin-top:8px">Plan following: ${escape(score.rating)} · ${score.percent}%</p><ul class="g-requirements">${score.checks.map(check=>`<li>${({pass:'✓ Passed',fail:'× Failed',mixed:'◐ Partial'})[check.outcome]}: ${escape(check.text)}</li>`).join('')}</ul>`:'<p class="g-caption">Score not supplied.</p>'}</section>`;}).join('')}</div></details>`;
  }
  function references(){
 const phase=state.mode, images=project().references?.[phase]||[],label=phase==='initial'?'Initial':'Revised';
 return `<details class="reference-screenshots"><summary>${label} reference screenshots (${images.length})</summary><p class="g-caption">Original screenshots supplied for ${escape(project().participant)} · Grid · ${label.toLowerCase()}. Open an image at full resolution to check the saved plan.</p><div class="reference-images">${images.map(image=>`<figure><a href="/${escape(image.file)}" target="_blank" rel="noopener"><img data-reference-src="/${escape(image.preview)}" alt="${escape(image.name)}" loading="lazy" decoding="async"><figcaption>${escape(image.name)} · Open full size ↗</figcaption></a></figure>`).join('')||'<p class="g-caption">No reference screenshots were supplied for this plan.</p>'}</div></details>`;
}
  function render(){
 rebuild();const showDiff=diffEnabled(),visible=visibleChanges(),chosen=selected(),index=visible.findIndex(change=>change.key===state.selected);
 const groups=changes.filter(change=>change.categories.includes('labels')).length;
 const chips=Object.entries(categoryNames).filter(([key])=>key!=='labels').map(([key,label])=>{const count=key==='all'?changes.filter(change=>state.labels||change.categories.some(category=>category!=='labels')).length:changes.filter(change=>change.categories.includes(key)).length;return `<button type="button" class="g-count" data-category="${key}" data-kind="${key}" aria-pressed="${state.filter===key}">${label} <strong>${count}</strong></button>`;}).join('');
 const warning=project().status==='supported-visible-content'?'':`Plan verification: ${project().status}. ${project().status==='reconstructed-partial'?'Some history was reconstructed; unknown details stay marked.':project().status==='missing-reference'?'Reference screenshots were not supplied.':'Some details still need reference review.'}`;
 const diffControls=showDiff?`<div class="g-changebar">${chips}</div><div class="g-toolbar" style="margin-top:0"><label class="g-toggle"><input type="checkbox" id="grid-dim" ${state.dim?'checked':''}> Dim unchanged cards</label><label class="g-toggle"><input type="checkbox" id="grid-labels" ${state.labels?'checked':''}> Include group-name updates (${groups})</label></div><div class="g-navigation"><div class="g-navigation-text"><span class="g-caption">${visible.length?`Change ${index>=0?index+1:'—'} of ${visible.length}`:'No changes in this category'}</span><strong>${escape(chosen?.title||'Select a card to highlight it')}</strong>${chosen?`<span class="g-caption">${escape(chosen.entity==='beat'?`Beat duration: ${format(chosen.before?.duration)} → ${format(chosen.after?.duration)}`:badgeText(chosen.categories,chosen.before,chosen.after))}</span>`:''}</div><div class="g-actions"><button type="button" class="g-button" data-step="-1" aria-label="Previous change">←</button><button type="button" class="g-button" data-step="1" aria-label="Next change">→</button></div></div>`:'';
 content.innerHTML=`<div class="g-heading"><div><h1>${state.mode==='initial'?'Initial Grid':showDiff?'Revised Grid + diff':'Revised Grid'}</h1><p class="g-caption">${escape(project().name)} · beats across time, tracks down the page</p></div><label class="g-caption g-participant">Participant <select id="grid-participant">${participants.map(item=>`<option value="${item.code}" ${state.participant===item.code?'selected':''}>${escape(item.participant)}</option>`).join('')}</select></label></div>${warning?`<p class="g-note">${warning}</p>`:''}<div class="g-toolbar"><div class="g-actions" aria-label="Plan view">${[['initial','Initial'],['revised','Revised']].map(([value,label])=>`<button type="button" class="g-button" data-mode="${value}" aria-pressed="${state.mode===value}">${label}</button>`).join('')}${state.mode==='revised'?`<label class="g-toggle"><input type="checkbox" id="grid-show-diff" ${state.showDiff!==false?'checked':''}> Show diff from Initial</label>`:''}</div><div class="g-actions"><button type="button" class="g-button" data-zoom="-0.25" aria-label="Zoom out">−</button><span class="g-caption">${Math.round(state.zoom*100)}%</span><button type="button" class="g-button" data-zoom="0.25" aria-label="Zoom in">+</button><button type="button" class="g-button" data-fit="true">Fit</button></div></div>${diffControls}${references()}${timeline()}${support()}<p class="g-caption g-provenance" style="margin-top:12px">Saved archived snapshots · source clips open paused · original study files remain unchanged.</p>`;
}
  function persist(){const host=globalThis.window?.openai;if(host?.setWidgetState)host.setWidgetState({modelContent:{participant:state.participant,view:state.mode},privateContent:{kind:'pinboard-grid-design',...state}}).catch(()=>{});}
  function locate(){
    const key=state.selected;const card=selectedCard();const change=selected();const start=card?.start??change?.after?.offset??change?.before?.offset??0;
    const viewport=content.querySelector('#grid-viewport');if(viewport?.scrollTo)viewport.scrollTo({left:Math.max(0,start*scale-80),behavior:'smooth'});
    const selector=key?.startsWith('beat:')?'.g-beat[data-selected="true"]':'.g-card[data-selected="true"]';
    content.querySelector(selector)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;const values=button.dataset;
    const viewport=content.querySelector('#grid-viewport');const position={left:viewport?.scrollLeft||0,top:viewport?.scrollTop||0};
    let jump=false;
    if(values.sourceCard){const phase=values.sourcePhase;const card=maps[phase].cards.get(values.sourceCard);if(card)showSource(card,phase);return;}
    if(values.mode&&['initial','revised'].includes(values.mode)){state.mode=values.mode;state.selected=null;state.filter='all';}
    else if(values.zoom)state.zoom=Math.max(.5,Math.min(3,state.zoom+Number(values.zoom)));
    else if(values.fit)state.zoom=1;
    else if(values.card){state.selected='card:'+values.card;}
    else if(values.beat){state.selected='beat:'+values.beat;}
    else if(values.category){state.filter=values.category;state.selected=visibleChanges()[0]?.key||null;}
    else if(values.step){const visible=visibleChanges();const current=visible.findIndex(change=>change.key===state.selected);if(visible.length)state.selected=visible[(current+Number(values.step)+visible.length)%visible.length].key;jump=true;}
    else return;
    render();const updated=content.querySelector('#grid-viewport');if(updated){updated.scrollLeft=position.left;updated.scrollTop=position.top;}
    if(jump)locate();persist();
    if(values.card){const phase=values.phase||state.mode;const card=maps[phase].cards.get(values.card)||selectedCard();if(card&&['asset','group'].includes(card.kind))showSource(card,phase);}
  });
  root.addEventListener('change',async event=>{
    if(event.target.id==='grid-participant'){sourceDialog.close();const item=participants.find(item=>item.code===event.target.value);try{const next=await loadProject(item.id);data.projects=[next];state.participant=next.code;state.selected=null;state.filter='all';}catch(error){content.innerHTML=`<p role="alert">${escape(error.message)}</p>`;return;}}
    else if(event.target.id==='grid-show-diff'){state.showDiff=event.target.checked;state.selected=null;state.filter='all';}
    else if(event.target.id==='grid-dim')state.dim=event.target.checked;
    else if(event.target.id==='grid-labels'){state.labels=event.target.checked;if(!state.labels&&state.filter==='labels')state.filter='all';}
    else return;render();persist();
  });
  globalThis.window?.addEventListener?.('openai:set_globals',event=>{const value=event.detail?.globals?.widgetState?.privateContent;if(value?.kind==='pinboard-grid-design'){Object.assign(state,value);render();}});
  render();
  if(globalThis.Tweak){const controls=new Tweak({container:root,onChange:render});controls.addSlider(state,'cardHeight',{label:'Card height',min:85,max:155,step:10,unit:'px'});}
})().catch(error=>{document.getElementById('grid-preview-content').textContent=`Could not open this Grid: ${error.message}. Refresh to try again.`;});
