if (!(window.ORDOLIO_SUPABASE&&(window.ORDOLIO_SUPABASE.url||window.ORDOLIO_SUPABASE.anonKey))) {
const people=[
  {name:'Dr. Awa Koné', initials:'AK', place:'Abidjan · Cocody', count:42, color:'#e4f2ec', ink:'#27816d'},
  {name:'Dr. Yao Mensah', initials:'YM', place:'Abidjan · Plateau', count:36, color:'#eeeafa', ink:'#7661ad'},
  {name:'Dr. Fatou Diabaté', initials:'FD', place:'Abidjan · Marcory', count:29, color:'#fbeee5', ink:'#b37545'},
  {name:'Dr. Serge Kouassi', initials:'SK', place:'Grand-Bassam', count:24, color:'#e8effa', ink:'#6482b3'},
  {name:'Dr. Mariam Traoré', initials:'MT', place:'Abidjan · Yopougon', count:18, color:'#f8e9ed', ink:'#a55d75'}
];
const submissions=[
  {person:people[0],date:'Aujourd’hui, 09:42',amount:'3 ordonnances',status:'À examiner',pending:true},
  {person:people[1],date:'Aujourd’hui, 09:18',amount:'2 ordonnances',status:'Validé',pending:false},
  {person:people[2],date:'Hier, 17:06',amount:'4 ordonnances',status:'Validé',pending:false},
  {person:people[3],date:'Hier, 15:31',amount:'1 ordonnance',status:'À examiner',pending:true}
];
for(let i=0;i<16;i++){
 const person=people[(i+1)%people.length],status=i%6===0?'Refusé':i%3===0?'À examiner':'Validé';
 const createdAt=new Date(Date.now()-(i+4)*86400000);
 submissions.push({id:100+i,person,date:createdAt.toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),createdAt:createdAt.toISOString(),amount:`${i%3+1} ordonnance${i%3?'s':''}`,status,pending:status==='À examiner',note:status==='Refusé'?'Photo à reprendre : le texte est flou.':''});
}
let isDoctor=document.body.dataset.role==='doctor';
let selectedFile=null;
let nextSubmissionId=1;
submissions.forEach((s,i)=>{if(!s.id)s.id=i+1;s.createdAt=s.createdAt||new Date(Date.now()-i*3600000).toISOString();s.isDemoBasePending=s.pending;s.person.active=s.person.active!==false;});
nextSubmissionId=submissions.length+1;
let reviewingId=null;
let submissionPage=0,historyPage=0,historyExpanded=false,notificationsRead=false,previewUrl='';
const pageSize=5;

const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function avatar(person,cls='table-avatar'){return `<span class="${cls}" style="background:${escapeHtml(person.color)};color:${escapeHtml(person.ink)}">${escapeHtml(person.initials)}</span>`}
function formatToday(){return new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toLocaleUpperCase('fr-FR')}
function renderNavigation(){
 const pendingCount=submissions.filter(s=>s.pending).length;
 const items=isDoctor?[['⌂','Mon espace'],['↑','Envoyer une ordonnance'],['▤','Historique']]:[['▦','Vue d’ensemble'],['♙','Équipe'],['▤','Ordonnances',String(pendingCount)],['⌁','Statistiques']];
 $('navigation').innerHTML=items.map((it,i)=>`<button class="nav-item ${i===0?'active':''}" type="button" aria-label="${escapeHtml(it[1])}" data-label="${it[1]}"><span class="nav-icon">${it[0]}</span><span>${it[1]}</span>${it[2]?`<span class="nav-count">${it[2]}</span>`:''}</button>`).join('');
 $('navigation').querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  $('navigation').querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  const destinations={'Vue d’ensemble':'.welcome-row','Mon espace':'.welcome-row','Équipe':'#team-section','Statistiques':'.chart-panel','Ordonnances':'.table-panel','Historique':'.history-panel'};
  if(btn.dataset.label==='Envoyer une ordonnance')$('file-input').click();
  else if(btn.dataset.label==='Équipe'){$('team-section').classList.remove('hidden');document.querySelectorAll('#admin-view,#admin-bottom').forEach(el=>el.classList.add('hidden'));renderTeam();$('team-section').scrollIntoView({behavior:'smooth',block:'start'});}
  else if(btn.dataset.label==='Vue d’ensemble'){$('team-section').classList.add('hidden');document.querySelectorAll('#admin-view,#admin-bottom').forEach(el=>el.classList.remove('hidden'));document.querySelector(destinations[btn.dataset.label])?.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(destinations[btn.dataset.label])document.querySelector(destinations[btn.dataset.label])?.scrollIntoView({behavior:'smooth',block:'center'});
 }));
}
function renderStats(){
 const now=new Date(),monthItems=submissions.filter(s=>{const d=new Date(s.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}),doctorItems=monthItems.filter(s=>s.person.initials==='AK');
 const pending=monthItems.filter(s=>s.pending).length,approved=monthItems.filter(s=>s.status==='Validé').length,rejected=monthItems.filter(s=>s.status==='Refusé').length;
 const cards=isDoctor?[
  ['Ordonnances envoyées',doctorItems.length,'Ce mois-ci','▤'],['En cours d’examen',doctorItems.filter(s=>s.pending).length,'En attente de validation','◷'],['Ordonnances validées',doctorItems.filter(s=>s.status==='Validé').length,'Ce mois-ci','✓'],['Ordonnances refusées',doctorItems.filter(s=>s.status==='Refusé').length,'Motif visible dans l’historique','!']
 ]:[
  ['Ordonnances reçues',monthItems.length,'Ce mois-ci','▤'],['À examiner',pending,'En attente de validation','◷'],['Médecins actifs',people.filter(p=>p.active!==false).length,`sur ${people.length} comptes médecin`,'♙'],['Taux de validation',`${monthItems.length?Math.round(approved/monthItems.length*100):0}%`,`${approved} validées · ${rejected} refusées`,'✓']
 ];
 $('stats').innerHTML=cards.map(c=>`<article class="stat-card"><div class="stat-top"><span class="stat-label">${escapeHtml(c[0])}</span><span class="stat-icon">${c[3]}</span></div><div class="stat-number">${escapeHtml(c[1])}</div><div class="stat-bottom">${escapeHtml(c[2])}</div></article>`).join('');
 document.querySelector('.chart-legend>b').textContent=String(monthItems.length);
 document.querySelector('.personal-summary .big-number').innerHTML=`${doctorItems.length} <small>ordonnances envoyées</small>`;
 document.querySelector('.personal-summary .progress-track span').style.width=`${Math.min(100,doctorItems.length/30*100)}%`;
 document.querySelector('.personal-summary .progress-copy b').textContent=`${doctorItems.length} / 30`;
 $('period-label').textContent=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 renderChart(monthItems);
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
 const now=new Date();const ranked=people.map(p=>({...p,score:submissions.filter(s=>s.person.initials===p.initials&&s.status==='Validé'&&new Date(s.createdAt).getMonth()===now.getMonth()).length})).sort((a,b)=>b.score-a.score);
 $('ranking').innerHTML=ranked.map((p,i)=>`<div class="rank-row"><span class="rank-num">${String(i+1).padStart(2,'0')}</span>${avatar(p,'rank-avatar')}<span><span class="rank-name">${escapeHtml(p.name)}</span><span class="rank-sub">${escapeHtml(p.place)}</span></span><span class="rank-value">${p.score}<small>ordonnances</small></span></div>`).join('');
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
 $('submission-rows').innerHTML=rows.length?rows.map(s=>`<tr><td><div class="person-cell">${avatar(s.person)}<span><b>${escapeHtml(s.person.name)}</b><small>${escapeHtml(s.person.place)}</small></span></div></td><td>${escapeHtml(s.date)}</td><td>${escapeHtml(s.amount)}</td><td><span class="status ${s.pending?'pending':s.status==='Refusé'?'rejected':'approved'}">${escapeHtml(s.status)}</span></td><td>${s.pending?`<button class="review-btn" data-id="${s.id}">Ouvrir</button>`:'<span class="row-more">✓</span>'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-state">Aucun envoi ne correspond à votre recherche.</td></tr>';
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
 const hasPhoto=Boolean(item.photoUrl);$('review-image').src=hasPhoto?item.photoUrl:'';$('review-image').classList.toggle('hidden',!hasPhoto);$('image-placeholder').classList.toggle('hidden',hasPhoto);
 $('review-dialog').showModal();
}
function resolveReview(approved){
 const item=submissions.find(s=>s.id===reviewingId);if(!item)return;
 const reason=$('decision-note').value.trim();if(!approved&&!reason){$('decision-note').focus();$('decision-note').setCustomValidity('Indiquez le motif du refus pour le médecin.');$('decision-note').reportValidity();return;}$('decision-note').setCustomValidity('');
 item.pending=false;item.status=approved?'Validé':'Refusé';item.decisionNote=reason;
 $('review-dialog').close();notificationsRead=false;renderRows();renderHistory();renderStats();renderNavigation();renderRanking();renderNotifications();
}
function renderHistory(){
 const from=$('history-from').value?new Date(`${$('history-from').value}T00:00:00`):null,to=$('history-to').value?new Date(`${$('history-to').value}T23:59:59`):null,status=$('history-status').value;
 const all=submissions.filter(s=>s.person.initials==='AK'&&(!from||new Date(s.createdAt)>=from)&&(!to||new Date(s.createdAt)<=to)&&(status==='all'||status===(s.pending?'pending':s.status==='Refusé'?'rejected':'approved')));
 const pages=Math.max(1,Math.ceil(all.length/pageSize));historyPage=Math.min(historyPage,pages-1);const data=all.slice(historyPage*pageSize,(historyPage+1)*pageSize);
 $('doctor-history').innerHTML=data.length?data.map(s=>`<div class="history-row"><span class="history-icon">▤</span><span class="history-copy"><b>${escapeHtml(s.amount)}</b><small>${escapeHtml(s.date)}${s.decisionNote?` · ${s.status==='Refusé'?'Motif':'Commentaire'} : ${escapeHtml(s.decisionNote)}`:''}</small></span><span class="status ${s.pending?'pending':s.status==='Refusé'?'rejected':'approved'}">${escapeHtml(s.status)}</span></div>`).join(''):'<p class="empty-state">Aucun envoi sur cette période.</p>';
 $('history-page-info').textContent=`${all.length?historyPage*pageSize+1:0}–${Math.min((historyPage+1)*pageSize,all.length)} sur ${all.length}`;$('history-prev').disabled=historyPage===0;$('history-next').disabled=historyPage>=pages-1;
}
function renderTeam(){
 const query=$('team-search').value.trim().toLocaleLowerCase('fr'),status=$('team-status').value;
 const visible=people.filter(p=>`${p.name} ${p.email||''} ${p.place||''}`.toLocaleLowerCase('fr').includes(query)&&(status==='all'||(status==='active')===(p.active!==false)));
 $('team-total').textContent=`${visible.length} sur ${people.length} comptes`;
 $('doctor-rows').innerHTML=visible.length?visible.map(p=>{const sent=submissions.filter(s=>s.person.initials===p.initials).length;return `<tr><td><div class="person-cell">${avatar(p)}<span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.email||'Compte médecin')}</small></span></div></td><td>${escapeHtml(p.place||'—')}</td><td>${sent}</td><td><span class="status ${p.active?'approved':'rejected'}">${p.active?'Actif':'Suspendu'}</span></td><td><button class="review-btn account-toggle" data-id="${escapeHtml(p.initials)}">${p.active?'Suspendre':'Réactiver'}</button></td></tr>`}).join(''):'<tr><td colspan="5" class="empty-state">Aucun compte ne correspond à cette recherche.</td></tr>';
 $('doctor-rows').querySelectorAll('.account-toggle').forEach(button=>button.addEventListener('click',()=>{const person=people.find(p=>p.initials===button.dataset.id);person.active=!person.active;renderTeam();}));
}
function renderNotifications(){
 const relevant=isDoctor?submissions.filter(s=>s.person.initials==='AK'):submissions;
 const recent=relevant.slice(0,8);$('notification-list').innerHTML=recent.length?recent.map(s=>`<button class="notification-item" data-id="${s.id}"><span class="notification-icon ${s.status==='Refusé'?'rejected':s.pending?'pending':'approved'}">${s.pending?'◷':s.status==='Refusé'?'!':'✓'}</span><span><b>${s.status==='À examiner'?'Nouvel envoi':`Ordonnance ${s.status.toLocaleLowerCase('fr')}`}</b><small>${escapeHtml(s.person.name)} · ${escapeHtml(s.date)}${s.decisionNote?` · ${escapeHtml(s.decisionNote)}`:''}</small></span></button>`).join(''):'<p class="empty-state">Aucune notification pour le moment.</p>';
 const alerts=isDoctor?relevant.some(s=>!s.pending):submissions.some(s=>s.pending);
 $('notification-dot').classList.toggle('hidden',notificationsRead||!alerts);$('notifications-button').setAttribute('aria-label',alerts?`Notifications non lues`:'Notifications');
}
document.querySelectorAll('#admin-view,#admin-bottom').forEach(el=>el.classList.toggle('hidden',isDoctor));
$('doctor-view').classList.toggle('hidden',!isDoctor);
$('team-section').classList.add('hidden');
if(isDoctor){$('page-title').textContent='Bonjour, Dr. Awa';$('crumb').textContent='Mon espace';$('page-subtitle').textContent='Retrouvez votre activité et envoyez une ordonnance en quelques instants.';$('profile-name').textContent='Dr. Awa Koné';$('profile-role').textContent='Médecin';$('avatar').textContent='AK';$('top-avatar').textContent='AK';$('eyebrow').textContent='VOTRE ESPACE PERSONNEL';}
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
$('invite-form').addEventListener('submit',event=>{event.preventDefault();const name=$('invite-name').value.trim(),email=$('invite-email').value.trim(),place=$('invite-place').value.trim();const initialsValue=name.split(/\s+/).filter(Boolean).slice(-2).map(word=>word[0]).join('').toUpperCase()||'ME';const person={name:name.startsWith('Dr')?name:`Dr. ${name}`,initials:initialsValue,email,place,count:0,active:true,color:'#e4f2ec',ink:'#27816d'};people.push(person);$('invite-feedback').textContent='Invitation de démonstration créée. Les comptes ne sont pas envoyés en mode démonstration.';$('invite-feedback').classList.remove('error');$('invite-form').reset();renderTeam();renderRanking()});
$('team-search').addEventListener('input',renderTeam);$('team-status').addEventListener('change',renderTeam);
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
 $('upload-title').textContent=selectedFile.name;$('upload-hint').textContent=`${(selectedFile.size/1024/1024).toFixed(1)} Mo · prêt à envoyer`;$('send-button').disabled=false;$('send-feedback').textContent='';$('file-preview-name').textContent=`${selectedFile.name} · ${(selectedFile.size/1024/1024).toFixed(1)} Mo`;
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
 if(!selectedFile)return;
 const label=selectedFile.name;
 const record={id:nextSubmissionId++,person:{...people[0]},date:'À l’instant',createdAt:new Date().toISOString(),amount:'1 ordonnance',status:'À examiner',pending:true,fileName:label,note:$('note').value.trim(),photoUrl:URL.createObjectURL(selectedFile),isDemoLive:true};
 submissions.unshift(record);notificationsRead=false;renderRows();renderHistory();renderStats();renderNavigation();renderNotifications();
 $('send-feedback').textContent='Envoi de démonstration transmis à l’espace administrateur.';
 $('send-button').disabled=true;$('upload-title').textContent='Déposez votre photo ici';$('upload-hint').textContent='ou parcourez vos fichiers';$('file-input').value='';$('note').value='';$('note-count').textContent='0 / 1000';selectFile(null);
});
$('dialog-close').addEventListener('click',()=>$('review-dialog').close());
$('approve-button').addEventListener('click',()=>resolveReview(true));
$('reject-button').addEventListener('click',()=>resolveReview(false));
 $('eyebrow').textContent=formatToday();
renderNavigation();renderStats();renderRanking();renderRows();renderHistory();renderTeam();renderNotifications();
}
