const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M9 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8',folder:'M3 7V4h6l2 3h10v13H3Z',contact:'M5 3h15v18H5z M3 7h3 M3 12h3 M3 17h3 M9 17v-1a3 3 0 0 1 6 0v1 M12 7a2 2 0 1 0 0 4a2 2 0 0 0 0-4',activity:'M2 12h5l3-8 4 16 3-8h5',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',menu:'M3 6h18 M3 12h18 M3 18h18',upload:'M12 16V3 M7 8l5-5 5 5 M3 15v6h18v-6',filter:'M3 4h18l-7 8v8l-4-2v-6z',refresh:'M20 8a8 8 0 0 0-14-3L3 8 M3 3v5h5 M4 16a8 8 0 0 0 14 3l3-3 M21 21v-5h-5',phone:'M4 3h4l2 5-3 2a15 15 0 0 0 7 7l2-3 5 2v4c-9 3-21-9-17-17z',chart:'M3 3v18h18 M7 15l5-6 4 3 5-7',search:'M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14 M15 15l6 6'};
document.querySelectorAll('[data-icon]').forEach(n=>n.innerHTML='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[n.dataset.icon]+'"/></svg>');
const viewLabels={dashboard:['Visão geral','Acompanhe os resultados e o ritmo da sua equipe.'],team:['Consultores','Gerencie acessos e acompanhe a operação de cada pessoa.'],campaigns:['Planilhas e campanhas','Distribua novos contatos e gerencie suas campanhas.'],clients:['Clientes / CRM','Consulte o histórico e os próximos passos de cada cliente.'],activity:['Atividades','Acompanhe o que acontece na sua operação.']};
function closeMenu(){el('sidebar').classList.remove('open');el('navBackdrop').classList.add('hidden');el('menuToggle').setAttribute('aria-expanded','false')}
function showView(view){if(!viewLabels[view])view='dashboard';document.querySelectorAll('[data-section]').forEach(n=>n.classList.toggle('hidden',n.dataset.section!==view));document.querySelectorAll('[data-view]').forEach(n=>{n.classList.toggle('active',n.dataset.view===view);if(n.dataset.view===view)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});el('pageTitle').textContent=viewLabels[view][0];el('breadcrumbTitle').textContent=viewLabels[view][0];el('pageDescription').textContent=viewLabels[view][1];history.replaceState(null,'','#'+view);closeMenu()}
document.querySelectorAll('[data-view],[data-go]').forEach(n=>n.onclick=()=>showView(n.dataset.view||n.dataset.go));
el('menuToggle').onclick=()=>{el('sidebar').classList.toggle('open');const open=el('sidebar').classList.contains('open');el('navBackdrop').classList.toggle('hidden',!open);el('menuToggle').setAttribute('aria-expanded',String(open))};el('navBackdrop').onclick=closeMenu;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
document.querySelectorAll('[data-open]').forEach(n=>n.onclick=()=>{if(n.dataset.open==='uploadDialog'){if(selectedConsultant&&!allocationDraft.size){el('allocationTarget').value='single';allocationDraft.set(selectedConsultant,{selected:true,count:0})}renderAllocations();}el(n.dataset.open).showModal();document.body.classList.add('modal-open')});
document.querySelectorAll('[data-close]').forEach(n=>n.onclick=()=>n.closest('dialog').close());
document.querySelectorAll('dialog').forEach(n=>n.addEventListener('close',()=>document.body.classList.remove('modal-open')));
window.addEventListener('hashchange',()=>showView(location.hash.slice(1)));showView(location.hash.slice(1));
function normalizeSearch(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
const numberFormat=new Intl.NumberFormat('pt-BR');
const number=value=>numberFormat.format(metricNumber(value));
el('consultantFilter').onchange=()=>{selectedConsultant=el('consultantFilter').value;selectedCampaign='';leadOffset=0;refresh(false,false,true)};
const saoPauloToday=()=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const todayParts=saoPauloToday();el('dayFilter').max=todayParts.year+'-'+todayParts.month+'-'+todayParts.day;
el('dayFilter').onchange=()=>{selectedDay=el('dayFilter').value;leadOffset=0;refresh(false,false,true)};
let searchTimer;for(const id of ['teamSearch','teamStatus','campaignSearch','campaignStatus'])el(id).addEventListener(id.endsWith('Search')?'input':'change',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(overview){render();renderDashboard()}},id.endsWith('Search')?120:0)});
function renderDashboard(){
  const {consultants=[],campaigns=[],charts,metrics={}}=overview;
  const scoped=consultants.filter(p=>!selectedConsultant||p.id===selectedConsultant);
  const scopedCampaigns=campaigns.filter(c=>!selectedConsultant||c.assigned_to===selectedConsultant);
  el('sLeads').textContent=number(metrics.total);el('sCalls').textContent=number(metrics.dialed);
  el('activeCaption').textContent=selectedConsultant?'No filtro selecionado':consultants.length+' consultores cadastrados';
  el('pendingCaption').textContent=number(metrics.pending)+' clientes pendentes';
  el('connectedCaption').textContent=number(metrics.connected)+(selectedDay?' contatos em '+fmtDay(selectedDay):' com contato registrado');
  el('rateCaption').textContent=selectedDay?'Taxa das ligações de '+fmtDay(selectedDay):'Clientes com duração registrada';
  el('dailyChartTitle').textContent=selectedDay?'Ligações em '+fmtDay(selectedDay):'Ligações nos últimos 7 dias';
  el('outcomeChartCaption').textContent=selectedDay?'Resultados registrados em '+fmtDay(selectedDay):'Situação atual dos clientes';
  if(!charts){el('dailyChart').innerHTML=el('outcomeChart').innerHTML='<div class="empty">Os gráficos estarão disponíveis após a atualização do servidor.</div>';return}
  const daily=charts.daily||[],total=daily.reduce((s,d)=>s+metricNumber(d.total),0),max=Math.max(1,...daily.map(d=>metricNumber(d.total)));
  el('trendTotal').textContent=number(total)+' tentativas';
  const width=700,height=236,left=40,top=22,plot=170,step=90,barWidth=38;
  let graph='';for(let i=0;i<=4;i++){const y=top+plot-i*plot/4;graph+='<line class="grid-line" x1="'+left+'" x2="690" y1="'+y+'" y2="'+y+'"/><text x="30" y="'+(y+4)+'" text-anchor="end">'+number(Math.ceil(max*i/4))+'</text>'}
  daily.forEach((d,i)=>{const count=metricNumber(d.total),h=count/max*plot,x=left+20+i*step,date=d.day.slice(8,10)+'/'+d.day.slice(5,7);graph+='<rect class="bar" x="'+x+'" y="'+(top+plot-h)+'" width="'+barWidth+'" height="'+h+'" rx="5"><title>'+esc(date)+': '+number(count)+' tentativas</title></rect><text x="'+(x+barWidth/2)+'" y="'+(top+plot-h-7)+'" text-anchor="middle">'+number(count)+'</text><text x="'+(x+barWidth/2)+'" y="218" text-anchor="middle">'+esc(date)+'</text>'});
  const graphDescription=daily.map(d=>d.day+': '+number(d.total)+' tentativas').join('; ');
  el('dailyChart').innerHTML='<svg class="chart-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(graphDescription)+'">'+graph+'</svg><div class="chart-key"><i></i>'+(total?'Tentativas de ligação iniciadas no aplicativo':'Nenhuma tentativa iniciada neste período')+'</div>';
  const colors={pending:'#dce8de',completed:'#3b9d71',unreached:'#e9ba64',active:'#8db4e3',blocked:'#c88488'};
  const outcomes=charts.outcomes||[],all=outcomes.reduce((s,x)=>s+metricNumber(x.value),0);let offset=0;
  const arcs=outcomes.map(x=>{const portion=all?metricNumber(x.value)*100/all:0;const arc='<circle cx="50" cy="50" r="40" pathLength="100" fill="none" stroke="'+colors[x.key]+'" stroke-width="12" stroke-dasharray="'+portion+' '+(100-portion)+'" stroke-dashoffset="'+(-offset)+'"/>';offset+=portion;return portion?arc:''}).join('');
  el('outcomeChart').innerHTML='<div class="donut"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="#eff3ef" stroke-width="12"/>'+arcs+'</svg><div class="donut-label"><strong>'+number(all)+'</strong><span>clientes</span></div></div><div class="legend">'+outcomes.map(x=>'<div class="legend-row"><i style="background:'+colors[x.key]+'"></i><span>'+esc(x.label)+'</span><strong>'+number(x.value)+'</strong></div>').join('')+'</div>';
  const ranked=[...scoped].sort((a,b)=>b.connected_count-a.connected_count).slice(0,5),best=Math.max(1,...ranked.map(p=>metricNumber(p.connected_count)));
  el('ranking').innerHTML=ranked.length?ranked.map((p,i)=>'<button class="rank-row" data-consultant="'+esc(p.id)+'"><span class="rank-number">'+String(i+1).padStart(2,'0')+'</span><span class="rank-name">'+esc(p.display_name)+'<small>'+number(p.dialed_count)+' clientes discados</small></span><span class="progress"><i style="width:'+Math.min(100,metricNumber(p.connected_count)/best*100)+'%"></i></span><span class="rank-value">'+number(p.connected_count)+'<small>'+number(p.contact_rate)+'%</small></span></button>').join(''):'<div class="empty">Crie um consultor para começar a acompanhar a equipe.</div>';
  el('campaignOverview').innerHTML=scopedCampaigns.length?scopedCampaigns.slice(0,5).map(c=>'<button class="campaign-summary" data-campaign="'+esc(c.id)+'"><div><strong>'+esc(c.name)+'</strong><span class="badge '+(c.status==='running'?'green':'')+'">'+esc(statusName[c.status]||c.status)+'</span></div><div><small>'+esc(c.consultant_name)+'</small><small>'+number(c.completed)+' / '+number(c.total)+'</small></div><div class="progress"><i style="width:'+Math.min(100,c.total?c.completed/c.total*100:0)+'%"></i></div></button>').join(''):'<div class="empty">Nenhuma campanha neste filtro. Envie uma nova planilha para distribuir contatos.</div>';
  renderManagement(scoped,scopedCampaigns);renderAllocations();
}
function renderManagement(people,campaigns){
  const tq=normalizeSearch(el('teamSearch').value),ts=el('teamStatus').value;
  const shown=people.filter(p=>(!tq||normalizeSearch(p.display_name+' '+p.username).includes(tq))&&(!ts||(ts==='active'?p.active:!p.active)));
  el('teamBody').innerHTML=shown.length?shown.map(p=>'<tr><td><strong>'+esc(p.display_name)+'</strong></td><td>'+esc(p.username)+'</td><td>'+number(p.campaign_count)+' campanhas<br><small>'+number(p.lead_count)+' clientes · '+number(p.connected_count)+' contatos'+(selectedDay?' em '+fmtDay(selectedDay):'')+'</small></td><td><span class="badge '+(p.active?'green':'amber')+'">'+(p.active?'Ativo':'Bloqueado')+'</span></td><td>'+fmtDate(p.last_seen_at)+'</td><td><div class="actions"><button class="mini" data-consultant="'+esc(p.id)+'">Ver operação</button><button class="mini" data-action="'+(p.active?'block':'activate')+'" data-id="'+esc(p.id)+'">'+(p.active?'Bloquear':'Ativar')+'</button><button class="mini" data-action="password" data-id="'+esc(p.id)+'">Nova senha</button><button class="mini danger" data-action="delete_consultant" data-id="'+esc(p.id)+'">Excluir</button></div></td></tr>').join(''):'<tr><td colspan="6" class="empty">Nenhum consultor neste filtro.</td></tr>';
  const cq=normalizeSearch(el('campaignSearch').value),cs=el('campaignStatus').value;
  const filtered=campaigns.filter(c=>(!cq||normalizeSearch(c.name+' '+c.source_filename).includes(cq))&&(!cs||c.status===cs));
  el('campaignBody').innerHTML=filtered.length?filtered.map(c=>'<tr><td><strong>'+esc(c.name)+'</strong><br><small>'+esc(c.source_filename)+'</small></td><td>'+esc(c.consultant_name)+'</td><td>'+number(c.completed)+' / '+number(c.total)+'<div class="progress"><i style="width:'+Math.min(100,c.total?c.completed/c.total*100:0)+'%"></i></div></td><td><span class="badge '+(c.status==='running'?'green':'')+'">'+esc(statusName[c.status]||c.status)+'</span><br><small>'+number(c.allowed_start_hour)+'h–'+number(c.allowed_end_hour)+'h · '+number(c.max_attempts_per_lead)+' tentativas · '+number(c.max_daily_calls)+'/dia</small></td><td><div class="actions"><button class="mini" data-campaign="'+esc(c.id)+'">Ver contatos</button><button class="mini danger" data-action="delete_campaign" data-id="'+esc(c.id)+'">Excluir planilha</button></div></td></tr>').join(''):'<tr><td colspan="5" class="empty">Nenhuma campanha neste filtro.</td></tr>';
}
async function loadConsultant(id){selectedConsultant=id;selectedCampaign='';leadOffset=0;showView('dashboard');await refresh(false,false,true)}
async function loadLeads(id){selectedCampaign=id;leadOffset=0;showView('clients');await refresh(false,false,true)}
function resetPassword(id){openAction('password',id)}
function toggleConsultant(id,active){openAction(active?'activate':'block',id)}
let pendingAction=null;
function openAction(action,id){
 const item=action==='delete_campaign'?overview.campaigns.find(x=>x.id===id):overview.consultants.find(x=>x.id===id);if(!item)return;
 const name=item.display_name||item.name, descriptions={delete_consultant:['Excluir consultor','O acesso de “'+name+'” será bloqueado e suas campanhas serão retiradas da operação. Histórico e reservas de telefones serão preservados. As tabulações pendentes serão preservadas no histórico.','Excluir consultor'],delete_campaign:['Excluir planilha','A campanha “'+name+'” será retirada da operação e deixará de aparecer no Android após sincronizar. Histórico e reservas de telefones serão preservados para evitar contatos repetidos.','Excluir planilha'],password:['Redefinir senha','Informe a nova senha de “'+name+'” (mínimo de 8 caracteres).','Salvar senha'],block:['Bloquear acesso','“'+name+'” deixará de acessar o sistema. As campanhas e o histórico serão mantidos.','Bloquear'],activate:['Ativar acesso','Liberar novamente o acesso de “'+name+'” ao aplicativo?','Ativar']};
 const info=descriptions[action];if(!info)return;pendingAction={action,id};el('actionDialogTitle').textContent=info[0];el('actionDescription').textContent=info[1];el('actionSubmit').textContent=info[2];el('actionSubmit').className=action.startsWith('delete')||action==='block'?'danger':'primary';el('actionPasswordField').classList.toggle('hidden',action!=='password');el('actionPassword').required=action==='password';el('actionPassword').value='';el('actionMsg').textContent='';el('forceArchive').checked=false;el('forceArchiveField').classList.add('hidden');el('actionDialog').showModal();document.body.classList.add('modal-open');
}
document.addEventListener('click',e=>{const n=e.target.closest('[data-consultant],[data-campaign],[data-action]');if(!n)return;if(n.dataset.consultant)loadConsultant(n.dataset.consultant);else if(n.dataset.campaign)loadLeads(n.dataset.campaign);else openAction(n.dataset.action,n.dataset.id)});
el('actionForm').onsubmit=async e=>{e.preventDefault();if(!pendingAction||mutationPending)return;const form=e.currentTarget,{action,id}=pendingAction;mutationPending=true;busy(form,true);el('actionMsg').textContent='Salvando alteração…';let done=false;try{if(action==='password')await api('reset_password',{id,password:el('actionPassword').value});else if(action==='activate'||action==='block')await api('set_consultant_active',{id,active:action==='activate'});else await api(action,{id,force_archive:el('forceArchive').checked});done=true;if(action==='delete_consultant'&&(selectedConsultant===id||overview.campaigns.some(c=>c.id===selectedCampaign&&c.assigned_to===id))){selectedConsultant='';selectedCampaign='';leadOffset=0}if(action==='delete_campaign'&&selectedCampaign===id){selectedCampaign='';leadOffset=0}await refresh(false,true);el('actionDialog').close();toast(action.startsWith('delete')?'Removido da operação. Histórico e proteção dos contatos preservados.':'Alteração salva com sucesso.')}catch(err){el('actionMsg').textContent=(done?'Alteração salva. Atualize a lista. ':'')+err.message;if(!done&&action.startsWith('delete')&&err.status===409)el('forceArchiveField').classList.remove('hidden')}finally{mutationPending=false;busy(form,false)}};
Object.assign(eventName,{CONSULTANT_REMOVED:'Consultor excluído',CAMPAIGN_REMOVED:'Planilha excluída'});
const allocationDraft=new Map();let uploadAnalysis=null,analysisSequence=0,uploadRequest=null,uploadPhase='idle';
const uploadDraftKey='df_upload_draft_v2';
function fileIdentity(file){return file?[file.name,file.size,file.lastModified].join('|'):''}
function activeAllocationPeople(){return (overview?.consultants||[]).filter(p=>p.active)}
function effectiveAvailable(a=uploadAnalysis){return Number(a?.available||0)+(el('redistributeUnworked').checked?Number(a?.reassignable||0):0)}
function setUploadProgress(active,title='',message=''){
 uploadPhase=active?(title.startsWith('Analisando')?'analyzing':'uploading'):'idle';
 el('uploadProgress').classList.toggle('hidden',!active);el('uploadDialog').setAttribute('aria-busy',String(active));
 if(title)el('uploadProgressTitle').textContent=title;if(message)el('uploadProgressText').textContent=message;
 el('analyzeUpload').classList.toggle('is-loading',uploadPhase==='analyzing');
 el('analyzeUpload').textContent=uploadPhase==='analyzing'?'Analisando planilha…':'Analisar contatos disponíveis';
}
function saveUploadDraft(){
 const fields={};for(const id of ['campaignName','allocationTarget','distributionMode','ringTimeout','interval','allowedStart','allowedEnd','maxAttempts','maxDaily'])fields[id]=el(id).value;
 const file=el('masterFile').files?.[0];sessionStorage.setItem(uploadDraftKey,JSON.stringify({fields,allocations:[...allocationDraft],redistributeUnworked:el('redistributeUnworked').checked,fileName:file?.name||''}));
 el('uploadDraftStatus').textContent=file?'Rascunho e arquivo mantidos nesta guia':'Rascunho salvo nesta guia';
}
function restoreUploadDraft(){
 try{const draft=JSON.parse(sessionStorage.getItem(uploadDraftKey)||'null');if(!draft)return;
  for(const [id,value] of Object.entries(draft.fields||{})){const input=el(id);if(input&&value!==undefined)input.value=String(value)}
  allocationDraft.clear();for(const [id,value] of draft.allocations||[])allocationDraft.set(id,value);el('redistributeUnworked').checked=!!draft.redistributeUnworked;
  el('uploadDraftStatus').textContent=draft.fileName?'Rascunho recuperado · selecione '+draft.fileName+' novamente':'Rascunho recuperado';
 }catch{sessionStorage.removeItem(uploadDraftKey)}
}
function clearUploadDraft(){
 analysisSequence++;uploadAnalysis=null;uploadRequest=null;uploadPhase='idle';allocationDraft.clear();sessionStorage.removeItem(uploadDraftKey);el('uploadForm').reset();el('uploadMsg').textContent='';el('uploadMsg').style.color='';el('uploadDraftStatus').textContent='Novo rascunho';setUploadProgress(false);renderAllocations();
}
function renderAllocations(){
 const active=activeAllocationPeople(),single=el('allocationTarget').value==='single',custom=!single&&el('distributionMode').value==='custom';
 const selected=active.filter(p=>allocationDraft.get(p.id)?.selected).slice(0,single?1:active.length);
 const available=effectiveAvailable();
 el('allocationTitle').textContent=single?'Escolha o consultor':'Dividir entre consultores';
 el('allocationHelp').textContent=single?'A planilha inteira irá somente para a pessoa escolhida.':'Selecione quem receberá contatos. A divisão considera apenas telefones novos e válidos.';
 el('distributionModeField').classList.toggle('hidden',single);el('selectAllConsultants').classList.toggle('hidden',single);
 el('allocationList').innerHTML=active.length?active.map(p=>{const entry=allocationDraft.get(p.id)||{selected:false,count:0},i=selected.findIndex(x=>x.id===p.id);const equal=uploadAnalysis&&i>=0?Math.floor(available/selected.length)+(i<available%selected.length?1:0):null;
 const checked=i>=0,control=single?'radio':'checkbox';
 const allocationState=uploadPhase==='analyzing'?'Analisando…':equal===null?'Aguardando análise':number(equal)+' contatos';
 return '<div class="allocation-row '+(checked?'selected':'')+'"><label><input type="'+control+'" '+(single?'name="singleConsultant" ':'')+'data-allocation="'+esc(p.id)+'" aria-describedby="allocationHelp" '+(checked?'checked':'')+'><span>'+esc(p.display_name)+'<small>@'+esc(p.username)+'</small></span></label>'+(custom?'<input type="number" data-quantity="'+esc(p.id)+'" aria-label="Quantidade para '+esc(p.display_name)+'" min="1" max="10000" step="1" '+(!checked?'disabled':'')+' value="'+(entry.count||'')+'" placeholder="Quantidade">':'<span class="allocation-count">'+allocationState+'</span>')+'</div>'}).join(''):'<p class="sub small">Crie ou ative um consultor para distribuir contatos.</p>';
 const reassignable=Number(uploadAnalysis?.reassignable||0);el('redistributeUnworkedField').classList.toggle('hidden',!uploadAnalysis||reassignable<1);el('redistributeUnworkedHelp').textContent=reassignable?number(reassignable)+' contato(s) sem ligação ou resultado podem ser redistribuídos com segurança.':'Transfere somente contatos sem ligação, resultado ou retorno registrado.';
 updateDistributionSummary();
}
function getAllocations(){const single=el('allocationTarget').value==='single',people=activeAllocationPeople().filter(p=>allocationDraft.get(p.id)?.selected).slice(0,single?1:100);return people.map(p=>({consultant_id:p.id,...(!single&&el('distributionMode').value==='custom'?{count:Number(allocationDraft.get(p.id).count)}:{})}))}
function updateDistributionSummary(){
 const list=getAllocations(),a=uploadAnalysis,single=el('allocationTarget').value==='single',custom=!single&&el('distributionMode').value==='custom',chosen=list.length?activeAllocationPeople().find(p=>p.id===list[0].consultant_id):null,available=effectiveAvailable(a);
 let valid=!!a&&available>0&&list.length>0,total=available,message=uploadPhase==='analyzing'?'Analisando telefones novos, repetidos e disponíveis…':'Selecione a planilha. A análise começa automaticamente.';
 if(a){message=number(a.valid_unique)+' telefones válidos e únicos · '+number(a.available)+' novos disponíveis.';
  if(a.reassignable)message+=' '+number(a.reassignable)+' ainda não trabalhados podem ser redistribuídos.';
  if(a.protected_existing)message+=' '+number(a.protected_existing)+' com histórico continuam protegidos.';
  if(!list.length)message+=single?' Escolha o consultor que receberá a planilha.':' Selecione pelo menos um consultor.';
  else if(single)message+=' Todos os '+number(available)+' contatos disponíveis serão enviados somente para '+chosen.display_name+'.';
  else if(custom){total=list.reduce((s,x)=>s+Number(x.count||0),0);const quantitiesValid=list.every(x=>Number.isInteger(x.count)&&x.count>0);valid=valid&&quantitiesValid&&total<=available;message+=' '+number(total)+' selecionados para distribuir.';if(total>available)message+=' A quantidade ultrapassa os contatos disponíveis.';else if(total<available)message+=' '+number(available-total)+' ficarão sem distribuição.';if(!quantitiesValid)message+=' Informe uma quantidade positiva para cada selecionado.'}
  else message+=' Divisão igual entre '+list.length+' consultor(es); diferenças de até 1 contato quando houver sobra.';
  if(!available&&Number(a.reassignable||0)>0&&!el('redistributeUnworked').checked)message+=' Marque “Incluir contatos ainda não trabalhados” para liberar a distribuição.';
 }
 el('distributionSummary').textContent=message;el('distributionSummary').classList.toggle('ready',valid);el('distributeSubmit').textContent=single&&chosen?'Enviar somente para '+chosen.display_name:'Confirmar distribuição';el('distributeSubmit').disabled=!valid||mutationPending||uploadPhase!=='idle';return valid;
}
el('allocationList').addEventListener('change',e=>{const n=e.target;if(n.dataset.allocation){const item=allocationDraft.get(n.dataset.allocation)||{count:0};if(el('allocationTarget').value==='single')activeAllocationPeople().forEach(p=>allocationDraft.set(p.id,{count:allocationDraft.get(p.id)?.count||0,selected:p.id===n.dataset.allocation}));else allocationDraft.set(n.dataset.allocation,{...item,selected:n.checked});renderAllocations()}else if(n.dataset.quantity){const item=allocationDraft.get(n.dataset.quantity)||{selected:true};allocationDraft.set(n.dataset.quantity,{...item,count:Number(n.value)});updateDistributionSummary()}saveUploadDraft()});
el('allocationList').addEventListener('input',e=>{const n=e.target;if(n.dataset.quantity){const item=allocationDraft.get(n.dataset.quantity)||{selected:true};allocationDraft.set(n.dataset.quantity,{...item,count:Number(n.value)});updateDistributionSummary();saveUploadDraft()}});
el('selectAllConsultants').onclick=()=>{const people=activeAllocationPeople(),all=people.every(p=>allocationDraft.get(p.id)?.selected);people.forEach(p=>allocationDraft.set(p.id,{count:allocationDraft.get(p.id)?.count||0,selected:!all}));renderAllocations();saveUploadDraft()};
el('allocationTarget').onchange=()=>{if(el('allocationTarget').value==='single'){const people=activeAllocationPeople(),preferred=people.find(p=>p.id===selectedConsultant)||people.find(p=>allocationDraft.get(p.id)?.selected);people.forEach(p=>allocationDraft.set(p.id,{count:allocationDraft.get(p.id)?.count||0,selected:p.id===preferred?.id}))}renderAllocations();saveUploadDraft()};
el('distributionMode').onchange=()=>{if(el('distributionMode').value==='custom'&&uploadAnalysis){const people=activeAllocationPeople().filter(p=>allocationDraft.get(p.id)?.selected),available=effectiveAvailable();people.forEach((p,i)=>{const row=allocationDraft.get(p.id);if(!row.count)row.count=Math.floor(available/people.length)+(i<available%people.length?1:0)})}renderAllocations();saveUploadDraft()};
el('redistributeUnworked').onchange=()=>{if(el('distributionMode').value==='custom'){const people=activeAllocationPeople().filter(p=>allocationDraft.get(p.id)?.selected),available=effectiveAvailable();people.forEach((p,i)=>{allocationDraft.get(p.id).count=Math.floor(available/people.length)+(i<available%people.length?1:0)})}renderAllocations();saveUploadDraft()};
async function analyzeSelectedFile(){
 const file=el('masterFile').files[0];if(!file){el('uploadMsg').textContent='Selecione uma planilha primeiro.';return}if(file.size>8*1024*1024){el('uploadMsg').textContent='O arquivo deve ter no máximo 8 MB.';return}
 const seq=++analysisSequence,fd=new FormData();fd.append('file',file);el('analyzeUpload').disabled=true;el('uploadMsg').style.color='';el('uploadMsg').textContent='Verificando telefones válidos e já distribuídos…';uploadAnalysis=null;uploadRequest=null;setUploadProgress(true,'Analisando a planilha','Validando telefones e verificando contatos disponíveis…');renderAllocations();
 try{const result=await api('preview_upload',fd,true);if(seq!==analysisSequence)return;uploadAnalysis={...result,file:fileIdentity(file)};el('uploadMsg').textContent='Análise concluída. Confira a divisão e confirme o envio.';saveUploadDraft()}
 catch(err){if(seq===analysisSequence){el('uploadMsg').style.color='var(--danger)';el('uploadMsg').textContent=err.message}}
 finally{if(seq===analysisSequence){setUploadProgress(false);el('analyzeUpload').disabled=false;renderAllocations()}}
}
el('masterFile').onchange=()=>{analysisSequence++;uploadAnalysis=null;uploadRequest=null;el('redistributeUnworked').checked=false;el('uploadMsg').textContent='';saveUploadDraft();renderAllocations();if(el('masterFile').files[0])analyzeSelectedFile()};
el('analyzeUpload').onclick=analyzeSelectedFile;
el('uploadForm').addEventListener('input',e=>{if(e.target.id!=='masterFile')saveUploadDraft()});
el('uploadDialog').addEventListener('close',()=>{if(!mutationPending)saveUploadDraft()});
el('clearUploadDraft').onclick=clearUploadDraft;
restoreUploadDraft();
el('uploadForm').onsubmit=async e=>{
 e.preventDefault();if(mutationPending||!updateDistributionSummary())return;const form=e.currentTarget,file=el('masterFile').files[0];if(fileIdentity(file)!==uploadAnalysis?.file){uploadAnalysis=null;el('uploadMsg').textContent='A planilha mudou. Analise novamente.';updateDistributionSummary();return}
 const single=el('allocationTarget').value==='single',data={campaign_name:el('campaignName').value,allocations:JSON.stringify(getAllocations()),distribution_mode:single?'equal':el('distributionMode').value,redistribute_unworked:String(el('redistributeUnworked').checked),ring_timeout:el('ringTimeout').value,interval:el('interval').value,allowed_start_hour:el('allowedStart').value,allowed_end_hour:el('allowedEnd').value,max_attempts_per_lead:el('maxAttempts').value,max_daily_calls:el('maxDaily').value};
 const signature=JSON.stringify(data)+fileIdentity(file);if(uploadRequest?.signature!==signature)uploadRequest={signature,id:crypto.randomUUID()};
 const fd=new FormData();fd.set('file',file);for(const [key,value] of Object.entries(data))fd.set(key,value);fd.set('request_id',uploadRequest.id);
 mutationPending=true;busy(form,true);setUploadProgress(true,'Distribuindo contatos','Criando as campanhas e reservando cada telefone com segurança…');el('uploadMsg').textContent=single?'Enviando a planilha para o consultor escolhido…':'Distribuindo contatos entre os consultores…';let done=false;
 try{const result=await api('upload',fd,true);done=true;const report=result.distributions?.map(d=>d.consultant_name+': '+number(d.imported)).join(' · '),only=result.distributions?.[0],success=single&&only?'Planilha enviada somente para '+only.consultant_name+': '+number(only.imported)+' contatos.':result.message+(report?' '+report:'');el('uploadMsg').style.color='var(--mint)';el('uploadMsg').textContent=success+(result.unassigned?' '+number(result.unassigned)+' contatos ficaram sem distribuição.':'');form.reset();sessionStorage.removeItem(uploadDraftKey);uploadAnalysis=null;uploadRequest=null;allocationDraft.clear();el('redistributeUnworked').checked=false;el('uploadDraftStatus').textContent='Distribuição concluída';selectedConsultant='';selectedCampaign='';leadOffset=0;await refresh(false,true);showView('campaigns');toast(single?'Planilha enviada para um único consultor.':'Distribuição concluída. Confira o resultado no formulário.');el('distributionSummary').textContent=success;}
 catch(err){el('uploadMsg').style.color='var(--danger)';el('uploadMsg').textContent=(done?'Envio concluído. Não repita; atualize a lista. ':'')+err.message;if(!done&&err.status===409){uploadAnalysis=null;updateDistributionSummary()}}
 finally{mutationPending=false;busy(form,false);setUploadProgress(false);updateDistributionSummary()}
};
