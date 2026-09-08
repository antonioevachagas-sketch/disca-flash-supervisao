
const el=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const API='https://apxatktafwdrjccmbjju.supabase.co/functions/v1/disca-flash';
let token=sessionStorage.getItem('df_token')||'',refreshToken=sessionStorage.getItem('df_refresh')||'',expiresAt=Number(sessionStorage.getItem('df_expires')||0),overview=null,timer=null,selectedCampaign='',selectedConsultant='',leadOffset=0;const leadLimit=100;
const statusName={idle:'Aguardando',running:'Em andamento',paused:'Pausada',finished:'Finalizada',archived:'Arquivada',pending:'Pendente',dialing:'Ligando',connected:'Em conversa',awaiting_disposition:'A tabular',no_answer:'Não atendeu',completed:'Concluído',failed:'Falhou',busy:'Ocupado'};
const eventName={CONSULTANT_CREATED:'Consultor criado',MASTER_UPLOADED:'Planilha distribuída',LEAD_UPDATED:'Resultado de ligação atualizado',CALL_STARTED:'Ligação iniciada',CALL_RETRY_SCHEDULED:'Nova tentativa agendada',CAMPAIGN_RESET:'Fila reiniciada'};
function toast(message){el('toast').textContent=message;el('toast').classList.add('show');setTimeout(()=>el('toast').classList.remove('show'),3500)}
let renewal=null,refreshSequence=0,refreshPending=0,mutationPending=false;
async function request(action,data,form=false,bearer=token){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),form?120000:35000);
  const headers={};if(bearer)headers.Authorization='Bearer '+bearer;
  if(form){data.set('action',action)}else headers['Content-Type']='application/json';
  try{const res=await fetch(API,{method:'POST',headers,body:form?data:JSON.stringify({action,...data}),signal:controller.signal});const body=await res.json().catch(()=>({error:'O servidor não retornou uma resposta válida.'}));return {res,body}}
  catch(error){throw new Error(error.name==='AbortError'?'A operação demorou mais que o esperado. Atualize a lista antes de repetir.':'Sem conexão com o servidor. Verifique sua internet e tente novamente.')}
  finally{clearTimeout(timeout)}
}
async function renewSession(){
  if(renewal)return renewal;if(!refreshToken)return false;
  renewal=(async()=>{const {res,body}=await request('refresh',{refresh_token:refreshToken},false,'');if(!res.ok)return false;saveSession(body);return true})().finally(()=>renewal=null);return renewal;
}
function saveSession(r){token=r.access_token;refreshToken=r.refresh_token;expiresAt=Number(r.expires_at||0);sessionStorage.setItem('df_token',token);sessionStorage.setItem('df_refresh',refreshToken);sessionStorage.setItem('df_expires',String(expiresAt))}
async function api(action,data={},form=false,retry=true){
  if(action!=='login'&&expiresAt&&expiresAt*1000<Date.now()+60000){if(!await renewSession()){logout();throw new Error('Sua sessão terminou. Entre novamente.')}}
  const {res,body}=await request(action,data,form,action==='login'?'':token);
  if(res.status===401&&action!=='login'&&retry&&await renewSession())return api(action,data,form,false);
  if(!res.ok){if(res.status===401&&action!=='login')logout();throw new Error(body.error||'Não foi possível concluir a operação.')}return body;
}
function busy(form,on){form.classList.toggle('loading',on);form.setAttribute('aria-busy',String(on));form.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=on)}
function startPolling(){clearInterval(timer);timer=setInterval(()=>{if(!document.hidden&&!refreshPending&&!mutationPending&&!document.querySelector('dialog[open]'))refresh()},15000)}
function logout(){refreshSequence++;overview=null;selectedCampaign='';selectedConsultant='';leadOffset=0;document.querySelectorAll('dialog[open]').forEach(d=>d.close());token='';refreshToken='';expiresAt=0;sessionStorage.removeItem('df_token');sessionStorage.removeItem('df_refresh');sessionStorage.removeItem('df_expires');clearInterval(timer);el('appView').classList.add('hidden');el('loginView').classList.remove('hidden');el('password').value=''}
el('logout').onclick=logout;
el('loginForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;if(f.classList.contains('loading'))return;busy(f,true);el('loginMsg').textContent='Entrando…';try{const r=await api('login',{login:el('login').value,password:el('password').value,client:'supervisor'});saveSession(r);sessionStorage.setItem('df_name',r.profile.display_name);setUserName(r.profile.display_name);el('loginView').classList.add('hidden');el('appView').classList.remove('hidden');el('password').value='';await refresh(false,true);startPolling();el('loginMsg').textContent=''}catch(err){el('loginMsg').textContent=err.message;el('syncStatus').textContent=err.message}finally{busy(f,false)}};
function setUserName(name){el('userName').textContent=name||'Supervisor';el('avatar').textContent=(name||'Supervisor').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}
el('consultantForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;if(mutationPending)return;mutationPending=true;busy(f,true);el('consultantMsg').textContent='Criando acesso…';let created=false;try{const r=await api('create_consultant',{display_name:el('cName').value,username:el('cLogin').value,password:el('cPassword').value});created=true;f.reset();el('consultantMsg').textContent='Acesso criado: '+r.username;await refresh(false,true);el('consultantDialog').close();showView('team');toast('Consultor criado. Login: '+r.username)}catch(err){el('consultantMsg').textContent=(created?'Conta criada. Não repita o cadastro. ':'')+err.message}finally{mutationPending=false;busy(f,false)}};
el('uploadForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,file=el('masterFile').files[0];if(!file||mutationPending)return;if(file.size>8*1024*1024){el('uploadMsg').textContent='O arquivo deve ter no máximo 8 MB.';return}const fd=new FormData();fd.append('file',file);for(const [key,id] of Object.entries({campaign_name:'campaignName',assigned_to:'assignedTo',ring_timeout:'ringTimeout',interval:'interval',allowed_start_hour:'allowedStart',allowed_end_hour:'allowedEnd',max_attempts_per_lead:'maxAttempts',max_daily_calls:'maxDaily'}))fd.append(key,el(id).value);mutationPending=true;busy(f,true);el('uploadMsg').textContent='Processando e verificando contatos duplicados…';let done=false;try{const r=await api('upload',fd,true);done=true;el('uploadMsg').style.color='var(--mint)';el('uploadMsg').textContent=r.message;f.reset();selectedConsultant='';selectedCampaign='';leadOffset=0;await refresh(false,true);if(r.imported>0){el('uploadDialog').close();showView('campaigns');toast(r.message)}}catch(err){el('uploadMsg').style.color='var(--danger)';el('uploadMsg').textContent=(done?'Planilha processada. Não repita o envio. ':'')+err.message}finally{mutationPending=false;busy(f,false)}};
el('refresh').onclick=()=>refresh(true);
el('clearConsultantFilter').onclick=()=>loadConsultant('');
async function refresh(show=false,rethrow=false){
 const seq=++refreshSequence;refreshPending++;el('refresh').classList.add('is-refreshing');el('refresh').setAttribute('aria-busy','true');
 if(!overview)el('syncStatus').textContent='Carregando dados da equipe…';
 try{const result=await api('overview',{campaign_id:selectedCampaign,consultant_id:selectedConsultant,lead_offset:leadOffset,lead_limit:leadLimit});if(seq!==refreshSequence||!token)return result;overview=result;selectedCampaign=result.selected_campaign||'';selectedConsultant=result.selected_consultant||'';leadOffset=Number(result.lead_offset||0);render();renderDashboard();el('syncStatus').textContent='Atualizado às '+new Intl.DateTimeFormat('pt-BR',{timeStyle:'short'}).format(new Date());el('syncStatus').parentElement.classList.remove('error');if(show)toast('Dados atualizados');return result}
 catch(err){if(seq===refreshSequence){el('syncStatus').textContent=err.message;el('syncStatus').parentElement.classList.add('error');if(show)toast(err.message)}if(rethrow)throw err;return null}
 finally{refreshPending--;if(!refreshPending){el('refresh').classList.remove('is-refreshing');el('refresh').setAttribute('aria-busy','false')}}
}
function fmtDate(v){return v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—'}
function metricNumber(value){let n=Number(value);return Number.isFinite(n)?n:0}
function render(){
  let {consultants=[],campaigns=[],metrics={},leads=[],activities=[],lead_total:leadTotal=0,lead_offset:currentOffset=0,lead_limit:currentLimit=leadLimit,next_lead_offset:nextOffset=null,previous_lead_offset:previousOffset=null}=overview;
  const backendSupportsConsultantFilter=Object.prototype.hasOwnProperty.call(overview,'selected_consultant');
  const currentConsultantId=selectedConsultant||'';
  const selectedPerson=consultants.find(x=>x.id===currentConsultantId)||null;
  const scopedCampaigns=currentConsultantId?campaigns.filter(x=>x.assigned_to===currentConsultantId):campaigns;
  const scopedCampaignIds=new Set(scopedCampaigns.map(x=>x.id));
  const scopedLeads=currentConsultantId&&!backendSupportsConsultantFilter?leads.filter(x=>scopedCampaignIds.has(x.campaign_id)):leads;
  const scopedLeadTotal=currentConsultantId&&!backendSupportsConsultantFilter&&selectedPerson?metricNumber(selectedPerson.lead_count):metricNumber(leadTotal);
  const exactPaging=!currentConsultantId||backendSupportsConsultantFilter;
  const activeConsultants=consultants.filter(x=>x.active&&(!currentConsultantId||x.id===currentConsultantId)).length;
  const teamQuery=normalizeSearch(el('teamSearch').value),teamStatus=el('teamStatus').value;
  const visibleConsultants=consultants.filter(x=>(!currentConsultantId||x.id===currentConsultantId)&&(!teamQuery||normalizeSearch(x.display_name+' '+x.username).includes(teamQuery))&&(!teamStatus||(teamStatus==='active'?x.active:!x.active)));
  const campaignQuery=normalizeSearch(el('campaignSearch').value),campaignStatus=el('campaignStatus').value;
  const visibleCampaigns=scopedCampaigns.filter(x=>(!campaignQuery||normalizeSearch(x.name+' '+x.source_filename).includes(campaignQuery))&&(!campaignStatus||x.status===campaignStatus));
  el('consultantFilter').innerHTML='<option value="">Toda a equipe</option>'+consultants.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.display_name)+'</option>').join('');el('consultantFilter').value=currentConsultantId;
  const first=scopedLeadTotal&&currentOffset<scopedLeadTotal?currentOffset+1:0;
  const last=first?Math.min(currentOffset+scopedLeads.length,scopedLeadTotal):0;

  el('sConsultants').textContent=activeConsultants;
  el('sLeads').textContent=metricNumber(metrics.total);
  el('sCalls').textContent=metricNumber(metrics.dialed);
  el('sRate').textContent=metricNumber(metrics.contact_rate)+'%';
  el('teamCount').textContent=visibleConsultants.length+' de '+consultants.length+' consultores';
  el('campaignCount').textContent=visibleCampaigns.length+' de '+scopedCampaigns.length+' campanhas';
  el('leadCount').textContent=first+'–'+last+' de '+scopedLeadTotal;
  const pendingAssignee=el('assignedTo').value;
  el('assignedTo').innerHTML='<option value="">Selecione</option>'+consultants.filter(x=>x.active).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.display_name)+'</option>').join('');
  if(consultants.some(x=>x.id===pendingAssignee&&x.active))el('assignedTo').value=pendingAssignee;

  const selectedName=selectedPerson?.display_name||'';
  el('teamFilterLabel').textContent=selectedName?'Consultor: '+selectedName:'Toda a equipe';
  el('clearConsultantFilter').classList.toggle('hidden',!currentConsultantId);
  el('teamDashboardSummary').textContent=selectedPerson
    ? 'Você está vendo a operação de '+selectedName+'. As campanhas, contatos e atividade abaixo ficam neste consultor.'
    : 'Acompanhe todos os consultores e abra a operação de uma pessoa para ver somente as campanhas e contatos dela.';
  el('consultantCards').innerHTML=visibleConsultants.length?visibleConsultants.map(x=>{
    const selected=x.id===currentConsultantId;
    const active=x.active===true;
    const counts={campaigns:metricNumber(x.campaign_count),leads:metricNumber(x.lead_count),pending:metricNumber(x.pending_count),dialed:metricNumber(x.dialed_count),connected:metricNumber(x.connected_count),completed:metricNumber(x.completed_count),interested:metricNumber(x.interested_count),sales:metricNumber(x.sales_count),scheduled:metricNumber(x.scheduled_count),blocked:metricNumber(x.do_not_call_count),rate:metricNumber(x.contact_rate)};
    const cardMetric=(label,value)=>'<div class="consultant-metric"><span>'+label+'</span><strong>'+value+'</strong></div>';
    return '<article class="consultant-card '+(selected?'selected':'')+'"><div class="consultant-card-head"><div><h3>'+esc(x.display_name)+'</h3><p class="consultant-login">@'+esc(x.username)+'</p></div><span class="badge '+(active?'green':'amber')+'">'+(active?'Ativo':'Bloqueado')+'</span></div><div class="consultant-presence"><span>Último acesso: '+fmtDate(x.last_seen_at)+'</span><span>'+counts.campaigns+' campanha'+(counts.campaigns===1?'':'s')+' em operação</span></div><div class="consultant-metrics">'+cardMetric('Leads',counts.leads)+cardMetric('Pendentes',counts.pending)+cardMetric('Ligações',counts.dialed)+cardMetric('Conectados',counts.connected)+cardMetric('Interessados',counts.interested)+cardMetric('Vendas',counts.sales)+cardMetric('Retornos',counts.scheduled)+cardMetric('Não ligar',counts.blocked)+cardMetric('Contato',counts.rate+'%')+'</div><div class="consultant-actions"><button class="mini" type="button" aria-pressed="'+selected+'" onclick="loadConsultant(\''+esc(x.id)+'\')">'+(selected?'Visão aberta':'Ver operação')+'</button><span class="badge">'+counts.completed+'/'+counts.leads+' concluídos</span></div></article>'
  }).join(''):'<div class="empty">Nenhum consultor neste filtro. Limpe a busca ou crie um novo acesso.</div>';

  el('teamBody').innerHTML=visibleConsultants.length?visibleConsultants.map(x=>'<tr><td><strong>'+esc(x.display_name)+'</strong></td><td>'+esc(x.username)+'</td><td><strong>'+metricNumber(x.campaign_count)+' campanha(s)</strong><br><small>'+metricNumber(x.lead_count)+' leads • '+metricNumber(x.pending_count)+' pendentes • '+metricNumber(x.dialed_count)+' ligações • '+metricNumber(x.connected_count)+' contatos • '+metricNumber(x.sales_count)+' vendas • '+metricNumber(x.scheduled_count)+' retornos • '+metricNumber(x.contact_rate)+'% contato</small></td><td><span class="badge '+(x.active?'green':'amber')+'">'+(x.active?'Ativo':'Bloqueado')+'</span></td><td>'+fmtDate(x.last_seen_at)+'</td><td><div class="actions"><button class="mini" type="button" onclick="loadConsultant(\''+esc(x.id)+'\')">Ver operação</button><button class="mini" type="button" onclick="toggleConsultant(\''+esc(x.id)+'\','+(!x.active)+')">'+(x.active?'Bloquear':'Ativar')+'</button><button class="mini" type="button" onclick="resetPassword(\''+esc(x.id)+'\')">Nova senha</button></div></td></tr>').join(''):'<tr><td colspan="6" class="empty">Nenhum consultor neste filtro.</td></tr>';

  el('campaignBody').innerHTML=visibleCampaigns.length?visibleCampaigns.map(x=>{let pct=x.total?Math.round(x.completed*100/x.total):0;return '<tr><td><strong>'+esc(x.name)+'</strong><br><small>'+esc(x.source_filename||'')+'</small></td><td>'+esc(x.consultant_name||'Não atribuído')+'</td><td><div>'+metricNumber(x.completed)+' / '+metricNumber(x.total)+'</div><div class="progress"><i style="width:'+pct+'%"></i></div></td><td><span class="badge">'+esc(statusName[x.status]||x.status)+'</span><br><small>'+metricNumber(x.allowed_start_hour||8)+'h–'+metricNumber(x.allowed_end_hour||20)+'h • '+metricNumber(x.max_attempts_per_lead||3)+' tentativas • '+metricNumber(x.max_daily_calls||250)+'/dia</small></td><td><button class="mini" type="button" onclick="loadLeads(\''+esc(x.id)+'\')">Ver contatos</button></td></tr>'}).join(''):'<tr><td colspan="5" class="empty">Nenhuma campanha neste filtro.</td></tr>';
  el('campaignTabs').innerHTML='<button class="tab '+(overview.selected_campaign?'':'active')+'" type="button" onclick="loadLeads(\'\')">'+(selectedName?'Todos de '+esc(selectedName):'Todos recentes')+'</button>'+scopedCampaigns.map(x=>'<button class="tab '+(overview.selected_campaign===x.id?'active':'')+'" type="button" onclick="loadLeads(\''+esc(x.id)+'\')">'+esc(x.name)+'</button>').join('');
  el('leadBody').innerHTML=scopedLeads.length?scopedLeads.map(x=>'<tr><td><strong>'+esc(x.name)+'</strong></td><td>'+esc(x.company||'—')+'</td><td>'+esc(x.phone)+'</td><td>'+esc(x.consultant_name||selectedName||'—')+'</td><td><span class="badge '+(x.status==='completed'?'green':'')+'">'+esc(x.do_not_call?'Não ligar':(statusName[x.status]||x.status))+'</span></td><td>'+esc(x.disposition||'—')+'</td><td>'+metricNumber(x.attempt_count)+'</td><td>'+fmtDate(x.next_attempt_at)+'</td><td>'+Math.floor(metricNumber(x.call_duration)/60)+'m '+(metricNumber(x.call_duration)%60)+'s</td><td>'+fmtDate(x.updated_at)+'</td></tr>').join(''):'<tr><td colspan="10" class="empty">Nenhum contato neste filtro.</td></tr>';
  if(exactPaging){
    el('leadPager').innerHTML='<span>'+first+'–'+last+' de '+scopedLeadTotal+'</span><div class="actions"><button class="mini" type="button" '+(previousOffset===null?'disabled':'')+' onclick="changeLeadPage('+(previousOffset??0)+')">Anterior</button><button class="mini" type="button" '+(nextOffset===null?'disabled':'')+' onclick="changeLeadPage('+(nextOffset??0)+')">Próximos</button></div>';
  }else{
    el('leadPager').innerHTML='<span>Mostrando os contatos recentes deste consultor. Atualize o servidor para navegar por toda a lista filtrada.</span>';
  }
  const scopedActivities=currentConsultantId?activities.filter(x=>x.consultant_id===currentConsultantId):activities;
  el('activityBody').innerHTML=scopedActivities.length?scopedActivities.map(x=>'<tr><td><strong>'+esc(x.consultant_name||'Sistema')+'</strong></td><td>'+esc(eventName[x.event_type]||x.event_type)+'</td><td>'+esc(x.campaign_name||'—')+'</td><td>'+fmtDate(x.created_at)+'</td></tr>').join(''):'<tr><td colspan="4" class="empty">Nenhuma atividade registrada neste filtro.</td></tr>';
}
async function loadConsultant(id){selectedConsultant=id;selectedCampaign='';leadOffset=0;await refresh()}async function loadLeads(id){selectedCampaign=id;leadOffset=0;await refresh()}async function changeLeadPage(offset){leadOffset=Math.max(0,Number(offset)||0);await refresh()}
async function toggleConsultant(id,active){try{await api('set_consultant_active',{id,active});await refresh();toast(active?'Consultor ativado':'Consultor bloqueado')}catch(err){toast(err.message)}}
async function resetPassword(id){let password=prompt('Digite uma nova senha com pelo menos 8 caracteres:');if(!password)return;try{await api('reset_password',{id,password});toast('Senha atualizada')}catch(err){toast(err.message)}}
if(token){setUserName(sessionStorage.getItem('df_name'));el('loginView').classList.add('hidden');el('appView').classList.remove('hidden');refresh().then(startPolling)}
