if (!(window.ORDOLIO_SUPABASE&&(window.ORDOLIO_SUPABASE.url||window.ORDOLIO_SUPABASE.anonKey))) {
const demoStorageKey='ordolio-demo-v4';
let localPersistence=true;try{localStorage.setItem(`${demoStorageKey}-check`,'1');localStorage.removeItem(`${demoStorageKey}-check`)}catch{localPersistence=false}
function readDemoData(){try{const value=JSON.parse(localStorage.getItem(demoStorageKey)||'{}');return{people:Array.isArray(value.people)?value.people:[],submissions:Array.isArray(value.submissions)?value.submissions:[]}}catch{return{people:[],submissions:[]}}}
const savedDemoData=readDemoData();
const people=savedDemoData.people;
const submissions=savedDemoData.submissions;
function persistDemoData(){try{localStorage.setItem(demoStorageKey,JSON.stringify({people,submissions:submissions.map(({photoUrl,...item})=>item)}));return true}catch{localPersistence=false;return false}}
function createId(){return window.crypto?.randomUUID?.()||`doctor-${Date.now()}-${Math.random().toString(36).slice(2)}`}
let isDoctor=document.body.dataset.role==='doctor';
let selectedFile=null;
let nextSubmissionId=Math.max(0,...submissions.map(s=>Number(s.id)||0))+1;
let reviewingId=null;
let submissionPage=0,historyPage=0,notificationsRead=false,previewUrl='';
let activeDoctorId='';try{activeDoctorId=localStorage.getItem(`${demoStorageKey}-active-doctor`)||''}catch{}
const pageSize=5;

const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const getActiveDoctor=()=>people.find(person=>person.id===activeDoctorId&&person.active!==false)||null;
function addProfessionField(form,id){if(!form)return;const label=document.createElement('label');label.className='profession-field';label.innerHTML='<span>Profession</span><select id="'+id+'" required><option>Médecin</option><option>Infirmier / infirmière</option><option>Sage-femme / maïeuticien</option></select>';form.querySelector('button[type="submit"]')?.before(label)}
addProfessionField($('invite-form'),'invite-profession');addProfessionField($('doctor-profile-form'),'doctor-profession');
function updateDoctorIdentity(){
 const person=getActiveDoctor();
 $('active-doctor-card').classList.toggle('hidden',!person);$('doctor-profile-picker').classList.toggle('hidden',Boolean(person));$('doctor-profile-divider').classList.toggle('hidden',Boolean(person));$('doctor-profile-form').classList.toggle('hidden',Boolean(person));
 $('active-doctor-name').textContent=person?`${person.name}${person.place?` · ${person.place}`:''}`:'';
 if(person&&isDoctor){$('page-title').textContent=`Bonjour, ${person.name}`;$('profile-name').textContent=person.name;$('profile-role').textContent=person.profession||'Professionnel de santé';$('avatar').textContent=person.initials;$('top-avatar').textContent=person.initials;$('page-subtitle').textContent='Envoyez une ordonnance et suivez vos validations et votre solde estimé.';}
 $('send-button').disabled=!person||!selectedFile;
 document.querySelector('.personal-summary .good-note').textContent=person?'Vos envois et leurs statuts sont visibles dans votre historique.':'Choisissez ou créez votre profil médecin pour commencer.';
}
function renderDoctorProfiles(){
 const select=$('doctor-profile-select'),available=people.filter(person=>person.active!==false);
 if(activeDoctorId&&!getActiveDoctor())activeDoctorId='';
 select.innerHTML=available.length?'<option value="">Choisissez votre profil</option>'+available.map(person=>`<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} · ${escapeHtml(person.profession||'Professionnel de santé')}${person.place?` · ${escapeHtml(person.place)}`:''}</option>`).join(''):'<option value="">Aucun profil professionnel</option>';
 $('use-doctor-profile').disabled=!select.value;
 updateDoctorIdentity();
}
function activateDoctor(id){
 const person=people.find(item=>item.id===id&&item.active!==false);if(!person)return;
 activeDoctorId=person.id;try{localStorage.setItem(`${demoStorageKey}-active-doctor`,activeDoctorId)}catch{}
 renderDoctorProfiles();renderHistory();renderStats();renderNotifications();
}
function avatar(person,cls='table-avatar'){return `<span class="${cls}" style="background:${escapeHtml(person.color)};color:${escapeHtml(person.ink)}">${escapeHtml(person.initials)}</span>`}
function formatToday(){return new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toLocaleUpperCase('fr-FR')}
function renderNavigation(){
 const pendingCount=submissions.filter(s=>s.pending).length;
 const items=isDoctor?[['⌂','Mon espace'],['↑','Envoyer une ordonnance'],['▤','Historique'],['₣','Mon solde'],['◈','Services']]:[['▦','Vue d’ensemble'],['♙','Équipe'],['▤','Ordonnances',String(pendingCount)],['⌁','Statistiques'],['₣','Rémunérations'],['◈','Catalogue & demandes']];
 $('navigation').innerHTML=items.map((it,i)=>`<button class="nav-item ${i===0?'active':''}" type="button" aria-label="${escapeHtml(it[1])}" data-label="${it[1]}"><span class="nav-icon">${it[0]}</span><span>${it[1]}</span>${it[2]?`<span class="nav-count">${it[2]}</span>`:''}</button>`).join('');
 $('navigation').querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  $('navigation').querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  const destinations={'Vue d’ensemble':'.welcome-row','Mon espace':'.welcome-row','Équipe':'#team-section','Statistiques':'.chart-panel','Ordonnances':'.table-panel','Historique':'.history-panel','Mon solde':'#professional-earnings','Rémunérations':'#admin-payouts'};
  if(btn.dataset.label==='Catalogue & demandes')window.location.href='gestion-catalogue.html';
  else if(btn.dataset.label==='Services')window.location.href='espace-standard.html';
  else if(btn.dataset.label==='Envoyer une ordonnance')$('file-input').click();
  else if(btn.dataset.label==='Équipe'){$('team-section').classList.remove('hidden');document.querySelectorAll('#admin-view,#admin-bottom').forEach(el=>el.classList.add('hidden'));renderTeam();$('team-section').scrollIntoView({behavior:'smooth',block:'start'});}
  else if(btn.dataset.label==='Vue d’ensemble'){$('team-section').classList.add('hidden');document.querySelectorAll('#admin-view,#admin-bottom').forEach(el=>el.classList.remove('hidden'));document.querySelector(destinations[btn.dataset.label])?.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(destinations[btn.dataset.label])document.querySelector(destinations[btn.dataset.label])?.scrollIntoView({behavior:'smooth',block:'center'});
 }));
}
function renderStats(){
 const now=new Date(),monthItems=submissions.filter(s=>{const d=new Date(s.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}),doctorItems=monthItems.filter(s=>s.person.id===activeDoctorId);
 const pending=monthItems.filter(s=>s.pending).length,approved=monthItems.filter(s=>s.status==='Validé').length,rejected=monthItems.filter(s=>s.status==='Refusé').length;
 const cards=isDoctor?[
  ['Ordonnances envoyées',doctorItems.length,'Ce mois-ci','▤'],['En cours d’examen',doctorItems.filter(s=>s.pending).length,'En attente de validation','◷'],['Ordonnances validées',doctorItems.filter(s=>s.status==='Validé').length,'Ce mois-ci','✓'],['Ordonnances refusées',doctorItems.filter(s=>s.status==='Refusé').length,'Motif visible dans l’historique','!']
 ]:[
  ['Ordonnances reçues',monthItems.length,'Ce mois-ci','▤'],['À examiner',pending,'En attente de validation','◷'],['Professionnels actifs',people.filter(p=>p.active!==false).length,`sur ${people.length} comptes santé`,'♙'],['Taux de validation',`${monthItems.length?Math.round(approved/monthItems.length*100):0}%`,`${approved} validées · ${rejected} refusées`,'✓']
 ];
 $('stats').innerHTML=cards.map(c=>`<article class="stat-card"><div class="stat-top"><span class="stat-label">${escapeHtml(c[0])}</span><span class="stat-icon">${c[3]}</span></div><div class="stat-number">${escapeHtml(c[1])}</div><div class="stat-bottom">${escapeHtml(c[2])}</div></article>`).join('');
 document.querySelector('.chart-legend>b').textContent=String(monthItems.length);
 document.querySelector('.personal-summary .big-number').innerHTML=`${doctorItems.length} <small>ordonnances envoyées</small>`;
 document.querySelector('.personal-summary .progress-copy b').textContent=String(doctorItems.filter(s=>s.pending).length);
 $('period-label').textContent=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 renderChart(monthItems);
 document.querySelector('.insight-panel h2').textContent=monthItems.length?'Activité de l’équipe':'Prêt pour vos premières données';
 document.querySelector('.insight-panel p').textContent=monthItems.length?`${approved} ordonnances validées et ${pending} en attente ce mois-ci.`:'Les indicateurs se rempliront lorsque votre équipe commencera à saisir les premiers envois.';
 renderEarnings();
}
function renderEarnings(){
 const rate=200;
 const stamp=item=>new Date(item.reviewedAt||item.createdAt);
 const money=value=>`${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
 const today=new Date();
 const approved=submissions.filter(item=>item.status==='Validé');
 if(isDoctor){
  const own=approved.filter(item=>item.person.id===activeDoctorId);
  const earnedToday=own.filter(item=>{const d=stamp(item);return d.toDateString()===today.toDateString()}).length*rate;
  const byDay=Object.groupBy?Object.groupBy(own,item=>stamp(item).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})):own.reduce((groups,item)=>{const key=stamp(item).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});(groups[key]??=[]).push(item);return groups},{});
  let panel=$('professional-earnings');if(!panel){panel=document.createElement('article');panel.id='professional-earnings';panel.className='panel earnings-panel';document.querySelector('.doctor-side')?.insertBefore(panel,document.querySelector('.history-panel'));}
  panel.innerHTML=`<div class="panel-heading"><div><span class="eyebrow">RÉMUNÉRATION</span><h2>Mon solde estimé</h2><p>${money(rate)} par ordonnance validée</p></div><span class="summary-icon">₣</span></div><div class="earnings-total">${money(own.length*rate)}</div><div class="earnings-caption">Cumul estimé · paiements non déduits · ${own.length} validée${own.length===1?'':'s'}</div><div class="earnings-today"><span>Gain validé aujourd’hui</span><b>${money(earnedToday)}</b></div><div class="earnings-list">${Object.entries(byDay).length?Object.entries(byDay).sort((a,b)=>stamp(b[1][0])-stamp(a[1][0])).slice(0,5).map(([day,items])=>`<div><span>${escapeHtml(day)}</span><b>+ ${money(items.length*rate)}</b></div>`).join(''):'<p class="empty-state">Les gains apparaîtront après la validation de vos premiers envois.</p>'}</div><p class="earnings-note">Estimation de démonstration. Vérifiez le cadre de rémunération applicable et veillez à ce qu’il ne guide pas le choix clinique.</p>`;
 }else{
  let panel=$('admin-payouts');if(!panel){panel=document.createElement('article');panel.id='admin-payouts';panel.className='panel payout-panel';panel.innerHTML='<div class="panel-heading"><div><span class="eyebrow">SUIVI DES VERSEMENTS</span><h2>Estimations par professionnel</h2><p>200 FCFA par ordonnance validée</p></div><span class="summary-icon">₣</span></div><div class="payout-total" id="payout-total"></div><div class="payout-table-wrap"><table><thead><tr><th>Professionnel</th><th>Validées</th><th>Estimation</th></tr></thead><tbody id="payout-rows"></tbody></table></div><p class="earnings-note">Montants calculés depuis les validations, sans preuve de paiement. Le suivi des virements sera raccordé au back-end; vérifiez aussi le cadre de rémunération applicable.</p>';document.querySelector('#admin-bottom')?.appendChild(panel);}
  const groups=new Map();approved.forEach(item=>{const id=item.person.id,entry=groups.get(id)||{person:item.person,count:0};entry.count++;groups.set(id,entry)});
  const paidToday=approved.filter(item=>stamp(item).toDateString()===today.toDateString()).length;
  $('payout-total').textContent=`${money(approved.length*rate)} cumul estimé · aujourd’hui ${money(paidToday*rate)} · virements non déduits`;
  $('payout-rows').innerHTML=groups.size?[...groups.values()].sort((a,b)=>b.count-a.count).map(entry=>`<tr><td>${escapeHtml(entry.person.name)}</td><td>${entry.count}</td><td>${money(entry.count*rate)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty-state">Aucune ordonnance validée à rémunérer.</td></tr>';
 }
}
function renderChart(monthItems){
 const now=new Date(),days=Math.max(1,now.getDate()),counts=Array(days).fill(0);
 monthItems.forEach(s=>{const day=new Date(s.createdAt).getDate()-1;if(day>=0&&day<days)counts[day]++});
 const max=Math.max(1,...counts),axisMax=Math.max(4,Math.ceil(max/4)*4);
 const points=counts.map((count,index)=>[days===1?0:index*680/(days-1),155-count/axisMax*135]);
 const line=points.map((point,index)=>`${index?'L':'M'}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(' ');
 document.querySelector('.chart .line').setAttribute('d',line);document.querySelector('.chart .area').setAttribute('d',`${line} V190 H0Z`);
 const last=points[points.length-1];document.querySelector('.chart circle').setAttribute('cx',last[0]);document.querySelector('.chart circle').setAttribute('cy',last[1]);
 document.querySelectorAll('.y-labels span').forEach((label,index)=>label.textContent=String(Math.round(axisMax*(4-index)/4)));
 const labels=[0,Math.floor((days-1)/5),Math.floor((days-1)/4),Math.floor((days-1)/2),Math.floor((days-1)*3/4),Math.floor((days-1)*5/6),days-1];
 document.querySelector('.x-labels').innerHTML=[...new Set(labels)].map(day=>`<span>${String(day+1).padStart(2,'0')} ${now.toLocaleDateString('fr-FR',{month:'short'})}</span>`).join('');
 $('chart-total').firstChild.textContent=String(monthItems.length);
}
function renderRanking(){
 const now=new Date();const ranked=people.map(p=>({...p,score:submissions.filter(s=>s.person.id===p.id&&s.status==='Validé'&&new Date(s.createdAt).getMonth()===now.getMonth()).length})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 document.querySelector('.ranking-panel h2').textContent='Suivi des validations';document.querySelector('.ranking-panel .panel-heading p').textContent='Comptage utile aux rémunérations';
 $('ranking').innerHTML=ranked.length?ranked.map(p=>`<div class="rank-row"><span class="rank-num">✓</span>${avatar(p,'rank-avatar')}<span><span class="rank-name">${escapeHtml(p.name)}</span><span class="rank-sub">${escapeHtml(p.profession||'Professionnel de santé')}</span></span><span class="rank-value">${p.score}<small>validées</small></span></div>`).join(''):'<p class="empty-state">Les professionnels apparaîtront ici après la création de leurs profils.</p>';
}
function visibleSubmissions(){
 const query=$('submission-search').value.trim().toLocaleLowerCase('fr');
 const status=$('submission-status').value;
 const from=$('submission-from').value?new Date(`${$('submission-from').value}T00:00:00`):null;
 const to=$('submission-to').value?new Date(`${$('submission-to').value}T23:59:59`):null;
 return submissions.filter(s=>{
  const matchesQuery=`${s.person.name} ${s.person.place} ${s.date}`.toLocaleLowerCase('fr').includes(query);
  const state=s.pending?'pending':s.status==='Refusé'?'rejected':'approved';
  const date=new Date(s.createdAt);
  return matchesQuery&&(status==='all'||status===state)&&(!from||date>=from)&&(!to||date<=to);
 });
}
function renderRows(){
 const all=visibleSubmissions(),pages=Math.max(1,Math.ceil(all.length/pageSize));submissionPage=Math.min(submissionPage,pages-1);const rows=all.slice(submissionPage*pageSize,(submissionPage+1)*pageSize);
 $('submission-rows').innerHTML=rows.length?rows.map(s=>`<tr><td><div class="person-cell">${avatar(s.person)}<span><b>${escapeHtml(s.person.name)}</b><small>${escapeHtml(s.person.place||'')}</small></span></div></td><td>${escapeHtml(s.date)}</td><td>${escapeHtml(s.amount)}</td><td><span class="status ${s.pending?'pending':s.status==='Refusé'?'rejected':'approved'}">${escapeHtml(s.status)}</span></td><td>${s.pending?`<button class="review-btn" data-id="${s.id}">Ouvrir</button>`:'<span class="row-more">✓</span>'}</td></tr>`).join(''):`<tr><td colspan="5" class="empty-state">${submissions.length?'Aucun envoi ne correspond aux filtres.':'Aucun envoi saisi pour le moment.'}</td></tr>`;
 $('submission-page-info').textContent=`${all.length?submissionPage*pageSize+1:0}–${Math.min((submissionPage+1)*pageSize,all.length)} sur ${all.length}`;$('submission-prev').disabled=submissionPage===0;$('submission-next').disabled=submissionPage>=pages-1;
 $('submission-rows').querySelectorAll('.review-btn').forEach(btn=>btn.addEventListener('click',()=>openReview(Number(btn.dataset.id))));
}
function exportSubmissions(){
 const quote=value=>`"${String(value??'').replace(/^[=+@-]/,'\u2019$&').replace(/"/g,'""')}"`;
 const csv=[['Médecin','Lieu','Date','Nombre','Statut'],...visibleSubmissions().map(s=>[s.person.name,s.person.place,s.date,s.amount,s.status])].map(row=>row.map(quote).join(';')).join('\r\n');
 const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));link.download='ordolio-envois.csv';link.click();URL.revokeObjectURL(link.href);
}
function openReview(id){
 const item=submissions.find(s=>s.id===id);if(!item)return;reviewingId=id;
 $('review-name').textContent=item.person.name;$('review-meta').textContent=`${item.date} · ${item.amount} · ${item.fileName||'Exemple'}`;
 $('review-note').textContent=item.note||'';$('review-note').classList.toggle('hidden',!item.note);
 $('decision-note').value='';
 const hasPhoto=Boolean(item.photoUrl);$('review-image').src=hasPhoto?item.photoUrl:'';$('review-image').classList.toggle('hidden',!hasPhoto);$('image-placeholder').textContent=hasPhoto?'':'Fichier non conservé en mode local. Configurez Supabase pour partager les photos entre les espaces.';$('image-placeholder').classList.toggle('hidden',hasPhoto);
 $('review-dialog').showModal();
}
function resolveReview(approved){
 const item=submissions.find(s=>s.id===reviewingId);if(!item)return;
 const reason=$('decision-note').value.trim();if(!approved&&!reason){$('decision-note').focus();$('decision-note').setCustomValidity('Indiquez le motif du refus pour le médecin.');$('decision-note').reportValidity();return;}$('decision-note').setCustomValidity('');
 item.pending=false;item.status=approved?'Validé':'Refusé';item.decisionNote=reason;item.reviewedAt=new Date().toISOString();persistDemoData();
 $('review-dialog').close();notificationsRead=false;renderRows();renderHistory();renderStats();renderNavigation();renderRanking();renderNotifications();
}
function renderHistory(){
 const from=$('history-from').value?new Date(`${$('history-from').value}T00:00:00`):null,to=$('history-to').value?new Date(`${$('history-to').value}T23:59:59`):null,status=$('history-status').value;
 const all=submissions.filter(s=>s.person.id===activeDoctorId&&(!from||new Date(s.createdAt)>=from)&&(!to||new Date(s.createdAt)<=to)&&(status==='all'||status===(s.pending?'pending':s.status==='Refusé'?'rejected':'approved')));
 const pages=Math.max(1,Math.ceil(all.length/pageSize));historyPage=Math.min(historyPage,pages-1);const data=all.slice(historyPage*pageSize,(historyPage+1)*pageSize);
 $('doctor-history').innerHTML=data.length?data.map(s=>`<div class="history-row"><span class="history-icon">▤</span><span class="history-copy"><b>${escapeHtml(s.amount)}</b><small>${escapeHtml(s.date)}${s.decisionNote?` · ${s.status==='Refusé'?'Motif':'Commentaire'} : ${escapeHtml(s.decisionNote)}`:''}</small></span><span class="status ${s.pending?'pending':s.status==='Refusé'?'rejected':'approved'}">${escapeHtml(s.status)}</span></div>`).join(''):'<p class="empty-state">Aucun envoi sur cette période.</p>';
 $('history-page-info').textContent=`${all.length?historyPage*pageSize+1:0}–${Math.min((historyPage+1)*pageSize,all.length)} sur ${all.length}`;$('history-prev').disabled=historyPage===0;$('history-next').disabled=historyPage>=pages-1;
}
function renderTeam(){
 const query=$('team-search').value.trim().toLocaleLowerCase('fr'),status=$('team-status').value;
 const visible=people.filter(p=>`${p.name} ${p.email||''} ${p.place||''}`.toLocaleLowerCase('fr').includes(query)&&(status==='all'||(status==='active')===(p.active!==false)));
 $('team-total').textContent=`${visible.length} sur ${people.length} comptes`;
 $('doctor-rows').innerHTML=visible.length?visible.map(p=>{const sent=submissions.filter(s=>s.person.id===p.id).length;return `<tr><td><div class="person-cell">${avatar(p)}<span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.profession||'Professionnel de santé')} · ${escapeHtml(p.email||'')}</small></span></div></td><td>${escapeHtml(p.place||'—')}</td><td>${sent}</td><td><span class="status ${p.active?'approved':'rejected'}">${p.active?'Actif':'Suspendu'}</span></td><td><button class="review-btn account-toggle" data-id="${escapeHtml(p.id)}">${p.active?'Suspendre':'Réactiver'}</button></td></tr>`}).join(''):'<tr><td colspan="5" class="empty-state">Aucun compte ne correspond à cette recherche.</td></tr>';
 $('doctor-rows').querySelectorAll('.account-toggle').forEach(button=>button.addEventListener('click',()=>{const person=people.find(p=>p.id===button.dataset.id);person.active=!person.active;if(activeDoctorId===person.id&&!person.active){activeDoctorId='';try{localStorage.removeItem(`${demoStorageKey}-active-doctor`)}catch{}renderDoctorProfiles()}persistDemoData();renderTeam();renderStats();}));
}
function renderNotifications(){
 const relevant=isDoctor?submissions.filter(s=>s.person.id===activeDoctorId):submissions;
 const recent=relevant.slice(0,8);$('notification-list').innerHTML=recent.length?recent.map(s=>`<button class="notification-item" data-id="${s.id}"><span class="notification-icon ${s.status==='Refusé'?'rejected':s.pending?'pending':'approved'}">${s.pending?'◷':s.status==='Refusé'?'!':'✓'}</span><span><b>${s.status==='À examiner'?'Nouvel envoi':`Ordonnance ${s.status.toLocaleLowerCase('fr')}`}</b><small>${escapeHtml(s.person.name)} · ${escapeHtml(s.date)}${s.decisionNote?` · ${escapeHtml(s.decisionNote)}`:''}</small></span></button>`).join(''):'<p class="empty-state">Aucune notification pour le moment.</p>';
 const alerts=isDoctor?relevant.some(s=>!s.pending):submissions.some(s=>s.pending);
 $('notification-dot').classList.toggle('hidden',notificationsRead||!alerts);$('notifications-button').setAttribute('aria-label',alerts?`Notifications non lues`:'Notifications');
}
document.querySelectorAll('#admin-view,#admin-bottom').forEach(el=>el.classList.toggle('hidden',isDoctor));
$('doctor-view').classList.toggle('hidden',!isDoctor);
$('team-section').classList.add('hidden');
if(isDoctor){$('page-title').textContent='Espace médecin';$('crumb').textContent='Mon espace';$('page-subtitle').textContent='Créez votre profil ou choisissez le vôtre pour commencer.';$('profile-name').textContent='Médecin';$('profile-role').textContent='Compte médecin';$('avatar').textContent='ME';$('top-avatar').textContent='ME';$('eyebrow').textContent='VOTRE ESPACE PERSONNEL';}
$('all-doctors-button').addEventListener('click',()=>document.querySelector('.nav-item[data-label="Équipe"]')?.click());
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());
$('help-close').addEventListener('click',()=>$('help-dialog').close());
$('help-done').addEventListener('click',()=>$('help-dialog').close());
$('submission-search').addEventListener('input',()=>{submissionPage=0;renderRows()});
['submission-status','submission-from','submission-to'].forEach(id=>$(id).addEventListener('change',()=>{submissionPage=0;renderRows()}));
$('export-submissions').addEventListener('click',exportSubmissions);
$('submission-prev').addEventListener('click',()=>{submissionPage=Math.max(0,submissionPage-1);renderRows()});
$('submission-next').addEventListener('click',()=>{submissionPage++;renderRows()});
['history-status','history-from','history-to'].forEach(id=>$(id).addEventListener('change',()=>{historyPage=0;renderHistory()}));
$('history-prev').addEventListener('click',()=>{historyPage=Math.max(0,historyPage-1);renderHistory()});
$('history-next').addEventListener('click',()=>{historyPage++;renderHistory()});
$('doctor-month-label').textContent=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 $('invite-form').addEventListener('submit',event=>{event.preventDefault();const name=$('invite-name').value.trim(),email=$('invite-email').value.trim().toLowerCase(),place=$('invite-place').value.trim(),profession=$('invite-profession').value;if(people.some(person=>person.email?.toLowerCase()===email)){$('invite-feedback').textContent='Cette adresse e-mail est déjà enregistrée.';$('invite-feedback').classList.add('error');return;}const initialsValue=name.split(/\s+/).filter(Boolean).slice(-2).map(word=>word[0]).join('').toUpperCase()||'ME';const person={id:createId(),name,initials:initialsValue,email,place,profession,active:true,color:'#e4f2ec',ink:'#27816d'};people.push(person);const saved=persistDemoData();$('invite-feedback').textContent=saved?'Profil professionnel ajouté sur cet appareil. Aucun e-mail ne sera envoyé en mode démonstration.':'Le navigateur ne peut pas conserver ces données. Ouvrez le site sur localhost pour les partager entre pages.';$('invite-feedback').classList.toggle('error',!saved);$('invite-form').reset();renderTeam();renderRanking();renderDoctorProfiles()});
$('team-search').addEventListener('input',renderTeam);$('team-status').addEventListener('change',renderTeam);
$('doctor-profile-select').addEventListener('change',()=>{$('use-doctor-profile').disabled=!$('doctor-profile-select').value});
$('use-doctor-profile').addEventListener('click',()=>activateDoctor($('doctor-profile-select').value));
$('change-doctor-profile').addEventListener('click',()=>{activeDoctorId='';try{localStorage.removeItem(`${demoStorageKey}-active-doctor`)}catch{}renderDoctorProfiles()});
 $('doctor-profile-form').addEventListener('submit',event=>{event.preventDefault();const name=$('doctor-name').value.trim(),email=$('doctor-email').value.trim().toLowerCase(),place=$('doctor-place').value.trim(),profession=$('doctor-profession').value;if(people.some(person=>person.email?.toLowerCase()===email)){$('doctor-profile-feedback').textContent='Cette adresse e-mail est déjà enregistrée. Choisissez le profil existant dans la liste.';$('doctor-profile-feedback').classList.add('error');return;}const initialsValue=name.split(/\s+/).filter(Boolean).slice(-2).map(word=>word[0]).join('').toUpperCase()||'ME';const person={id:createId(),name,initials:initialsValue,email,place,profession,active:true,color:'#e4f2ec',ink:'#27816d'};people.push(person);const saved=persistDemoData();$('doctor-profile-feedback').textContent=saved?'Profil créé sur cet appareil.':'Le navigateur ne peut pas conserver ces données. Ouvrez le site sur localhost pour garder le profil.';$('doctor-profile-feedback').classList.toggle('error',!saved);$('doctor-profile-form').reset();activateDoctor(person.id);renderTeam()});
$('notifications-button').addEventListener('click',()=>{const panel=$('notification-panel');const open=panel.classList.toggle('hidden')===false;$('notifications-button').setAttribute('aria-expanded',String(open));if(open){notificationsRead=true;renderNotifications()}});
$('mark-notifications-read').addEventListener('click',()=>{notificationsRead=true;renderNotifications()});
 $('notification-list').addEventListener('click',event=>{const button=event.target.closest('.notification-item');if(!button)return;const item=submissions.find(s=>s.id===Number(button.dataset.id));$('notification-panel').classList.add('hidden');$('notifications-button').setAttribute('aria-expanded','false');if(isDoctor){document.querySelector('.history-panel').scrollIntoView({behavior:'smooth',block:'center'});return}if(item?.pending){$('team-section').classList.add('hidden');document.querySelectorAll('#admin-view,#admin-bottom').forEach(el=>el.classList.remove('hidden'));document.querySelector('.table-panel').scrollIntoView({behavior:'smooth',block:'center'});openReview(item.id)}});
function selectFile(file){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=''}
 selectedFile=file||null;
  if(!selectedFile){$('send-button').disabled=true;$('file-preview').classList.add('hidden');$('file-input').value='';$('upload-title').textContent='Déposez votre photo ici';$('upload-hint').textContent='ou parcourez vos fichiers';return;}
 const extension=selectedFile.name.split('.').pop().toLowerCase();
 const mimeTypes=['image/jpeg','image/png','image/heic','image/heif'];
 if(selectedFile.size>10*1024*1024||!['jpg','jpeg','png','heic','heif'].includes(extension)||(selectedFile.type&&!mimeTypes.includes(selectedFile.type))){
  $('send-feedback').textContent=selectedFile.size>10*1024*1024?'La photo dépasse la limite de 10 Mo.':'Formats acceptés : JPEG, PNG ou HEIC.';
  $('send-feedback').classList.add('error');$('send-button').disabled=true;selectedFile=null;$('file-preview').classList.add('hidden');$('upload-title').textContent='Déposez votre photo ici';$('upload-hint').textContent='ou parcourez vos fichiers';return;
 }
 $('send-feedback').classList.remove('error');
 $('upload-title').textContent=selectedFile.name;$('upload-hint').textContent=`${(selectedFile.size/1024/1024).toFixed(1)} Mo · prêt à envoyer`;$('send-button').disabled=!getActiveDoctor();$('send-feedback').textContent=getActiveDoctor()?'':'Choisissez ou créez un profil médecin avant l’envoi.';$('file-preview-name').textContent=`${selectedFile.name} · ${(selectedFile.size/1024/1024).toFixed(1)} Mo`;
 if(selectedFile.type.startsWith('image/')&&!['heic','heif'].includes(extension)){previewUrl=URL.createObjectURL(selectedFile);$('file-preview-image').src=previewUrl;$('file-preview-image').classList.remove('hidden')}else{$('file-preview-image').classList.add('hidden')}
 $('file-preview').classList.remove('hidden');
}
$('file-input').addEventListener('change',e=>selectFile(e.target.files?.[0]));
$('dropzone').addEventListener('dragover',e=>{e.preventDefault();e.currentTarget.classList.add('dragging');});
$('dropzone').addEventListener('dragleave',e=>e.currentTarget.classList.remove('dragging'));
$('dropzone').addEventListener('drop',e=>{e.preventDefault();e.currentTarget.classList.remove('dragging');selectFile(e.dataTransfer.files?.[0]);});
$('remove-file').addEventListener('click',()=>selectFile(null));
$('note').addEventListener('input',()=>$('note-count').textContent=`${$('note').value.length} / 1000`);
$('send-button').addEventListener('click',()=>{
 const doctor=getActiveDoctor();if(!selectedFile||!doctor){$('send-feedback').textContent='Choisissez ou créez un profil médecin avant l’envoi.';return;}
 const label=selectedFile.name;
 const record={id:nextSubmissionId++,person:{...doctor},date:'À l’instant',createdAt:new Date().toISOString(),amount:'1 ordonnance',status:'À examiner',pending:true,fileName:label,note:$('note').value.trim(),isDemoLive:true};
 submissions.unshift(record);persistDemoData();notificationsRead=false;renderRows();renderHistory();renderStats();renderNavigation();renderNotifications();
 $('send-feedback').textContent='Envoi de démonstration enregistré sur cet appareil. Les photos ne sont pas partagées entre les pages en mode local.';
 $('send-button').disabled=true;$('upload-title').textContent='Déposez votre photo ici';$('upload-hint').textContent='ou parcourez vos fichiers';$('file-input').value='';$('note').value='';$('note-count').textContent='0 / 1000';selectFile(null);
});
$('dialog-close').addEventListener('click',()=>$('review-dialog').close());
$('approve-button').addEventListener('click',()=>resolveReview(true));
$('reject-button').addEventListener('click',()=>resolveReview(false));
 $('eyebrow').textContent=formatToday();
if(!localPersistence){$('sync-status').textContent='Mémoire locale indisponible — données temporaires';$('sync-status').classList.remove('hidden');}
renderDoctorProfiles();renderNavigation();renderStats();renderRanking();renderRows();renderHistory();renderTeam();renderNotifications();
}
