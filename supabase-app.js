if (window.ORDOLIO_SUPABASE&&(window.ORDOLIO_SUPABASE.url||window.ORDOLIO_SUPABASE.anonKey)) {
  const config=window.ORDOLIO_SUPABASE;
  const $=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fullName=person=>person?.full_name||'Médecin';
  const initials=name=>name.split(/\s+/).filter(Boolean).slice(-2).map(part=>part[0]).join('').toUpperCase()||'ME';
  const colors=['#e4f2ec|#27816d','#eeeafa|#7661ad','#fbeee5|#b37545','#e8effa|#6482b3','#f8e9ed|#a55d75'];
  let client=null;
  let profile=null;
  let submissions=[];
  let doctors=[];
  let notifications=[];
  let selectedFile=null;
  let reviewingId=null;
  let channel=null;
  let sessionQueue=Promise.resolve();
  let authMode='sign-in';
  let submissionPage=0,historyPage=0,previewUrl='';
  const pageSize=5;

  function setSyncStatus(message,error=false){
    const status=$('sync-status');
    status.textContent=message;
    status.classList.remove('hidden','error');
    if(error)status.classList.add('error');
  }

  function showAuth(message=''){
    profile=null;
    $('auth-panel').classList.remove('hidden');
    ['.welcome-row','.demo-banner','#stats','#admin-view','#admin-bottom','#doctor-view','#team-section','footer'].forEach(selector=>document.querySelector(selector)?.classList.add('hidden'));
    $('notification-panel').classList.add('hidden');$('notifications-button').classList.add('hidden');
    $('logout-button').classList.add('hidden');
    $('auth-message').textContent=message;
    setSyncStatus('Connexion requise');
  }

  function setAuthMode(mode){
    authMode=mode;
    const signup=mode==='sign-up';
    $('auth-name').classList.toggle('hidden',!signup);
    $('auth-name').previousElementSibling.classList.toggle('hidden',!signup);
    $('auth-name').required=signup;
    $('auth-password').autocomplete=signup?'new-password':'current-password';
    $('auth-password').minLength=signup?8:0;
    $('auth-message').textContent=signup?'Les nouveaux comptes sont créés avec le rôle médecin.':''; 
  }

  function showApp(){
    $('auth-panel').classList.add('hidden');
    ['.welcome-row','#stats','footer'].forEach(selector=>document.querySelector(selector)?.classList.remove('hidden'));
    document.querySelector('.demo-banner').classList.add('hidden');
    $('logout-button').classList.remove('hidden');
    const isAdmin=profile.role==='admin';
    $('admin-view').classList.toggle('hidden',!isAdmin);
    $('admin-bottom').classList.toggle('hidden',!isAdmin);
    $('doctor-view').classList.toggle('hidden',isAdmin);
    $('page-title').textContent=isAdmin?'Vue d’ensemble':`Bonjour, ${fullName(profile)}`;
    $('crumb').textContent=isAdmin?'Vue d’ensemble':'Mon espace';
    $('page-subtitle').textContent=isAdmin?'Données synchronisées de votre espace.':'Votre activité et les ordonnances de votre compte.';
    $('profile-name').textContent=fullName(profile);
    $('profile-role').textContent=isAdmin?'Administrateur':'Médecin';
    $('avatar').textContent=initials(fullName(profile));
    $('top-avatar').textContent=initials(fullName(profile));
    $('eyebrow').textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toLocaleUpperCase('fr-FR');
    $('sync-status').textContent='Connexion établie…';
    $('period-label').textContent=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    $('doctor-month-label').textContent=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    $('invite-form').classList.toggle('hidden',!isAdmin);
    $('notifications-button').classList.remove('hidden');
    renderNavigation();
  }

  function renderNavigation(){
    const isAdmin=profile.role==='admin';
    const items=isAdmin?[['▦','Vue d’ensemble'],['♙','Équipe'],['▤','Ordonnances'],['⌁','Statistiques']]:[['⌂','Mon espace'],['↑','Envoyer une ordonnance'],['▤','Historique']];
    $('navigation').innerHTML=items.map((item,index)=>`<button class="nav-item ${index===0?'active':''}" type="button" aria-label="${escapeHtml(item[1])}" data-label="${escapeHtml(item[1])}"><span class="nav-icon">${item[0]}</span><span>${escapeHtml(item[1])}</span></button>`).join('');
    $('navigation').querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>{
      $('navigation').querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
      const destinations={'Vue d’ensemble':'.welcome-row','Mon espace':'.welcome-row','Statistiques':'.chart-panel','Ordonnances':'.table-panel','Historique':'.history-panel'};
      if(button.dataset.label==='Envoyer une ordonnance')$('file-input').click();
      else if(button.dataset.label==='Équipe'){
        $('team-section').classList.remove('hidden');
        document.querySelectorAll('#admin-view,#admin-bottom').forEach(element=>element.classList.add('hidden'));
        $('team-section').scrollIntoView({behavior:'smooth',block:'start'});
      }
      else if(button.dataset.label==='Vue d’ensemble'){
        $('team-section').classList.add('hidden');
        document.querySelectorAll('#admin-view,#admin-bottom').forEach(element=>element.classList.remove('hidden'));
        document.querySelector(destinations[button.dataset.label])?.scrollIntoView({behavior:'smooth',block:'start'});
      }
      else if(destinations[button.dataset.label]){
        if(isAdmin){$('team-section').classList.add('hidden');document.querySelectorAll('#admin-view,#admin-bottom').forEach(element=>element.classList.remove('hidden'));}
        document.querySelector(destinations[button.dataset.label])?.scrollIntoView({behavior:'smooth',block:'center'});
      }
    }));
  }

  function monthItems(){
    const now=new Date();
    return submissions.filter(item=>{
      const date=new Date(item.created_at);
      return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth();
    });
  }

  function renderStats(){
    const month=monthItems();
    const todayStart=new Date();todayStart.setHours(0,0,0,0);
    const today=month.filter(item=>new Date(item.created_at)>=todayStart).length;
    const pending=month.filter(item=>item.status==='pending').length;
    const approved=month.filter(item=>item.status==='approved').length;
    const rejected=month.filter(item=>item.status==='rejected').length;
    const cards=profile.role==='admin'?[
      ['Ordonnances reçues',month.length,'Ce mois-ci','▤'],
      ['À examiner',pending,`${today} reçues aujourd’hui`,'◷'],
      ['Médecins inscrits',doctors.length,'Comptes médecin','♙'],
      ['Taux de validation',`${month.length?Math.round(approved/month.length*100):0}%`,`${approved} validées · ${rejected} refusées`,'✓']
    ]:[
      ['Ordonnances envoyées',month.length,'Ce mois-ci','▤'],
      ['En cours d’examen',pending,'En attente de validation','◷'],
      ['Ordonnances validées',approved,'Ce mois-ci','✓'],
      ['Ordonnances refusées',rejected,'Ce mois-ci','!']
    ];
    $('stats').innerHTML=cards.map(card=>`<article class="stat-card"><div class="stat-top"><span class="stat-label">${escapeHtml(card[0])}</span><span class="stat-icon">${card[3]}</span></div><div class="stat-number">${escapeHtml(card[1])}</div><div class="stat-bottom">${escapeHtml(card[2])}</div></article>`).join('');
  }

  function renderChart(){
    const now=new Date();
    const days=Math.max(1,now.getDate());
    const counts=Array(days).fill(0);
    monthItems().forEach(item=>counts[new Date(item.created_at).getDate()-1]++);
    const max=Math.max(1,...counts);
    const axisMax=Math.max(4,Math.ceil(max/4)*4);
    const points=counts.map((count,index)=>[days===1?0:index*680/(days-1),155-count/axisMax*135]);
    const line=points.map((point,index)=>`${index?'L':'M'}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(' ');
    document.querySelector('.chart .line').setAttribute('d',line);
    document.querySelector('.chart .area').setAttribute('d',`${line} V190 H0Z`);
    const last=points[points.length-1];
    document.querySelector('.chart circle').setAttribute('cx',last[0]);
    document.querySelector('.chart circle').setAttribute('cy',last[1]);
    const labels=[0,Math.floor((days-1)/5),Math.floor((days-1)/4),Math.floor((days-1)/2),Math.floor((days-1)*3/4),Math.floor((days-1)*5/6),days-1];
    document.querySelector('.x-labels').innerHTML=[...new Set(labels)].map(day=>`<span>${String(day+1).padStart(2,'0')} ${now.toLocaleDateString('fr-FR',{month:'short'})}</span>`).join('');
    const axis=document.querySelectorAll('.y-labels span');
    axis.forEach((label,index)=>label.textContent=String(Math.round(axisMax*(4-index)/4)));
    $('chart-total').firstChild.textContent=String(monthItems().length);
    document.querySelector('.chart-legend>span').lastChild.textContent=' Ordonnances reçues ce mois';
    document.querySelector('.chart-panel .panel-heading p').textContent='Envois synchronisés au cours du mois';
  }

  function renderRanking(){
    const counts=new Map();
    monthItems().filter(item=>item.status==='approved').forEach(item=>counts.set(item.doctor_id,(counts.get(item.doctor_id)||0)+1));
    const ranked=doctors.map(doctor=>({...doctor,count:counts.get(doctor.id)||0})).sort((a,b)=>b.count-a.count).slice(0,5);
    $('ranking').innerHTML=ranked.length?ranked.map((doctor,index)=>{
      const [background,ink]=colors[index%colors.length].split('|');
      return `<div class="rank-row"><span class="rank-num">${String(index+1).padStart(2,'0')}</span><span class="rank-avatar" style="background:${background};color:${ink}">${escapeHtml(initials(fullName(doctor)))}</span><span><span class="rank-name">${escapeHtml(fullName(doctor))}</span><span class="rank-sub">${escapeHtml(doctor.place||'')}</span></span><span class="rank-value">${doctor.count}<small>ordonnances</small></span></div>`;
    }).join(''):'<p class="empty-state">Aucun médecin inscrit.</p>';
  }

  function renderTeam(){
    const query=$('team-search').value.trim().toLocaleLowerCase('fr');
    const status=$('team-status').value;
    const visible=doctors.filter(doctor=>`${fullName(doctor)} ${doctor.email||''} ${doctor.place||''}`.toLocaleLowerCase('fr').includes(query)&&(status==='all'||(status==='active')===(doctor.is_active!==false)));
    $('team-total').textContent=`${visible.length} sur ${doctors.length} médecins`;
    $('doctor-rows').innerHTML=visible.length?visible.map(doctor=>{
      const count=submissions.filter(item=>item.doctor_id===doctor.id).length;
      return `<tr><td><div class="person-cell"><span class="table-avatar">${escapeHtml(initials(fullName(doctor)))}</span><span><b>${escapeHtml(fullName(doctor))}</b><small>${escapeHtml(doctor.email||'Adresse e-mail non disponible')}</small></span></div></td><td>${escapeHtml(doctor.place||'—')}</td><td>${count}</td><td><span class="status ${doctor.is_active?'approved':'rejected'}">${doctor.is_active?'Actif':'Suspendu'}</span></td><td><button type="button" class="review-btn account-toggle" data-id="${escapeHtml(doctor.id)}" data-active="${doctor.is_active?'true':'false'}">${doctor.is_active?'Suspendre':'Réactiver'}</button></td></tr>`;
    }).join(''):'<tr><td colspan="5" class="empty-state">Aucun compte médecin ne correspond à cette recherche.</td></tr>';
    $('doctor-rows').querySelectorAll('.account-toggle').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;
      const {error}=await client.from('profiles').update({is_active:button.dataset.active!=='true'}).eq('id',button.dataset.id);
      if(error){showError(error);button.disabled=false;return;}
      try{await refreshData()}catch(refreshError){showError(refreshError)}
    }));
  }

  function renderNotifications(){
    const unread=notifications.filter(item=>!item.read_at).length;
    $('notification-dot').classList.toggle('hidden',unread===0);
    $('notifications-button').setAttribute('aria-label',unread?`${unread} notifications non lues`:'Notifications');
    $('notification-list').innerHTML=notifications.length?notifications.slice(0,12).map(item=>`<button class="notification-item ${item.read_at?'read':''}" type="button" data-submission="${escapeHtml(item.submission_id||'')}"><span class="notification-icon ${item.event_type==='decision'?'approved':'pending'}">${item.event_type==='decision'?'✓':'◷'}</span><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.body)} · ${escapeHtml(new Date(item.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}))}</small></span></button>`).join(''):'<p class="empty-state">Aucune notification pour le moment.</p>';
  }

  async function markNotificationsRead(){
    const unread=notifications.filter(item=>!item.read_at).map(item=>item.id);
    if(!unread.length)return;
    const {error}=await client.from('notifications').update({read_at:new Date().toISOString()}).in('id',unread);
    if(error){showError(error);return;}
    notifications=notifications.map(item=>unread.includes(item.id)?{...item,read_at:new Date().toISOString()}:item);
    renderNotifications();
  }

  async function inviteDoctor(event){
    event.preventDefault();
    const button=$('invite-form').querySelector('button[type="submit"]');
    button.disabled=true;$('invite-feedback').classList.remove('error');$('invite-feedback').textContent='Envoi de l’invitation…';
    const {data,error}=await client.functions.invoke('invite-doctor',{body:{email:$('invite-email').value.trim(),fullName:$('invite-name').value.trim(),place:$('invite-place').value.trim()}});
    button.disabled=false;
    if(error){
      let message=error.message||'Invitation impossible. Vérifiez la configuration de la fonction sécurisée.';
      try{const detail=await error.context?.json();if(detail?.error)message=detail.error}catch{}
      $('invite-feedback').textContent=message;$('invite-feedback').classList.add('error');return;
    }
    $('invite-feedback').textContent=data?.message||'Invitation envoyée.';$('invite-form').reset();
    try{await refreshData()}catch(refreshError){showError(refreshError)}
  }

  function statusLabel(status){
    return status==='pending'?'À examiner':status==='approved'?'Validé':'Refusé';
  }

  function visibleSubmissions(){
    const query=$('submission-search').value.trim().toLocaleLowerCase('fr');
    const status=$('submission-status').value;
    const from=$('submission-from').value?new Date(`${$('submission-from').value}T00:00:00`):null;
    const to=$('submission-to').value?new Date(`${$('submission-to').value}T23:59:59`):null;
    return submissions.filter(item=>{
      const doctor=item.profiles||{};
      const searchable=`${fullName(doctor)} ${doctor.place||''} ${new Date(item.created_at).toLocaleString('fr-FR')}`.toLocaleLowerCase('fr');
      const date=new Date(item.created_at);
      return searchable.includes(query)&&(status==='all'||item.status===status)&&(!from||date>=from)&&(!to||date<=to);
    });
  }

  function renderRows(){
    const filtered=visibleSubmissions();
    const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
    submissionPage=Math.min(submissionPage,pageCount-1);
    const visible=filtered.slice(submissionPage*pageSize,(submissionPage+1)*pageSize);
    $('submission-page-info').textContent=`${filtered.length?submissionPage*pageSize+1:0}–${Math.min((submissionPage+1)*pageSize,filtered.length)} sur ${filtered.length}`;
    $('submission-prev').disabled=submissionPage===0;$('submission-next').disabled=submissionPage>=pageCount-1;
    $('submission-rows').innerHTML=visible.length?visible.map(item=>{
      const doctor=item.profiles||{};
      const statusClass=item.status==='pending'?'pending':item.status==='approved'?'approved':'rejected';
      const date=new Date(item.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      return `<tr><td><div class="person-cell"><span class="table-avatar">${escapeHtml(initials(fullName(doctor)))}</span><span><b>${escapeHtml(fullName(doctor))}</b><small>${escapeHtml(doctor.place||'')}</small></span></div></td><td>${escapeHtml(date)}</td><td>1 ordonnance</td><td><span class="status ${statusClass}">${statusLabel(item.status)}</span></td><td>${item.status==='pending'?`<button class="review-btn" data-id="${escapeHtml(item.id)}">Ouvrir</button>`:'<span class="row-more">✓</span>'}</td></tr>`;
    }).join(''):'<tr><td colspan="5" class="empty-state">Aucun envoi ne correspond à votre recherche.</td></tr>';
    $('submission-rows').querySelectorAll('.review-btn').forEach(button=>button.addEventListener('click',()=>openReview(button.dataset.id).catch(showError)));
  }

  function exportSubmissions(){
    const quote=value=>`"${String(value??'').replace(/^[=+@-]/,'\u2019$&').replace(/"/g,'""')}"`;
    const csv=[['Médecin','Lieu','Date','Nombre','Statut'],...visibleSubmissions().map(item=>[
      fullName(item.profiles),item.profiles?.place||'',new Date(item.created_at).toLocaleString('fr-FR'),'1 ordonnance',statusLabel(item.status)
    ])].map(row=>row.map(quote).join(';')).join('\r\n');
    const link=document.createElement('a');
    link.href=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));
    link.download='ordolio-envois.csv';link.click();URL.revokeObjectURL(link.href);
  }

  function renderHistory(){
    const from=$('history-from').value?new Date(`${$('history-from').value}T00:00:00`):null;
    const to=$('history-to').value?new Date(`${$('history-to').value}T23:59:59`):null;
    const status=$('history-status').value;
    const filtered=submissions.filter(item=>{
      const date=new Date(item.created_at);
      return (!from||date>=from)&&(!to||date<=to)&&(status==='all'||item.status===status);
    });
    const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
    historyPage=Math.min(historyPage,pageCount-1);
    const latest=filtered.slice(historyPage*pageSize,(historyPage+1)*pageSize);
    $('history-page-info').textContent=`${filtered.length?historyPage*pageSize+1:0}–${Math.min((historyPage+1)*pageSize,filtered.length)} sur ${filtered.length}`;
    $('history-prev').disabled=historyPage===0;$('history-next').disabled=historyPage>=pageCount-1;
    $('doctor-history').innerHTML=latest.length?latest.map(item=>{
      const date=new Date(item.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      const statusClass=item.status==='pending'?'pending':item.status==='approved'?'approved':'rejected';
      return `<div class="history-row"><span class="history-icon">▤</span><span class="history-copy"><b>1 ordonnance</b><small>${escapeHtml(date)}${item.review_note?` · ${item.status==='rejected'?'Motif':'Commentaire'} : ${escapeHtml(item.review_note)}`:''}</small></span><span class="status ${statusClass}">${statusLabel(item.status)}</span></div>`;
    }).join(''):'<p class="empty-state">Aucun envoi pour le moment.</p>';
    const month=monthItems().length;
    const pending=monthItems().filter(item=>item.status==='pending').length;
    document.querySelector('.personal-summary .big-number').innerHTML=`${month} <small>ordonnances envoyées ce mois</small>`;
    document.querySelector('.personal-summary .progress-copy span').textContent='En cours d’examen';
    document.querySelector('.personal-summary .progress-copy b').textContent=String(pending);
    document.querySelector('.personal-summary .progress-track').classList.add('hidden');
    document.querySelector('.personal-summary .good-note').textContent='Consultez l’état de synchronisation en haut de page.';
    document.querySelector('.personal-summary .panel-heading p').textContent=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  }

  function renderInsight(){
    const approved=monthItems().filter(item=>item.status==='approved').length;
    document.querySelector('.insight-panel h2').textContent='Activité de l’équipe';
    document.querySelector('.insight-panel p').textContent=`${approved} ordonnance${approved===1?'':'s'} validée${approved===1?'':'s'} ce mois-ci.`;
    document.querySelector('.insight-foot span:first-child').textContent='Données synchronisées';
  }

  function renderAll(){
    renderStats();
    renderRows();
    renderHistory();
    if(profile.role==='admin'){
      renderRanking();
      renderChart();
      renderInsight();
    }
  }

  async function refreshData(){
    const {data:records,error:recordsError}=await client.from('submissions')
      .select('id,doctor_id,created_at,status,note,review_note,file_path,profiles!submissions_doctor_id_fkey(id,full_name,place)')
      .order('created_at',{ascending:false});
    if(recordsError)throw recordsError;
    submissions=records||[];
    if(profile.role==='admin'){
      const {data:staff,error:staffError}=await client.from('profiles').select('id,full_name,email,place,is_active,created_at').eq('role','doctor').order('full_name');
      if(staffError)throw staffError;
      doctors=staff||[];
    }else{
      doctors=[profile];
    }
    const {data:alerts,error:alertsError}=await client.from('notifications').select('id,submission_id,event_type,title,body,read_at,created_at').order('created_at',{ascending:false}).limit(30);
    if(alertsError)throw alertsError;
    notifications=alerts||[];
    renderAll();
    renderTeam();
    renderNotifications();
  }

  async function openReview(id){
    const item=submissions.find(record=>record.id===id);
    if(!item||item.status!=='pending')return;
    reviewingId=id;
    $('review-name').textContent=fullName(item.profiles);
    $('review-meta').textContent=`${new Date(item.created_at).toLocaleString('fr-FR')} · 1 ordonnance`;
    $('review-note').textContent=item.note||'';
    $('review-note').classList.toggle('hidden',!item.note);
    $('decision-note').value=item.review_note||'';
    const {data,error}=await client.storage.from('prescriptions').createSignedUrl(item.file_path,60);
    if(error){showError(error);return;}
    $('review-image').src=data.signedUrl;
    $('review-image').classList.remove('hidden');
    $('image-placeholder').classList.add('hidden');
    $('review-dialog').showModal();
  }

  async function resolveReview(status){
    if(!reviewingId)return;
    const reviewNote=$('decision-note').value.trim();
    if(status==='rejected'&&!reviewNote){
      $('decision-note').setCustomValidity('Indiquez le motif du refus pour le médecin.');
      $('decision-note').reportValidity();
      return;
    }
    $('decision-note').setCustomValidity('');
    $('approve-button').disabled=true;
    $('reject-button').disabled=true;
    const {error}=await client.from('submissions').update({status,reviewed_by:profile.id,review_note:reviewNote||null}).eq('id',reviewingId);
    $('approve-button').disabled=false;
    $('reject-button').disabled=false;
    if(error){showError(error);return;}
    $('review-dialog').close();
    reviewingId=null;
    try{await refreshData();}catch(refreshError){showError(refreshError);}
  }

  function showError(error){
    const message=error?.message||String(error);
    $('auth-message').textContent=message;
    $('send-feedback').textContent=message;
    $('send-feedback').classList.add('error');
    setSyncStatus('Erreur de synchronisation',true);
  }

  async function handleSession(session){
    if(!session){
      profile=null;
      submissions=[];
      doctors=[];
      notifications=[];
      if(channel){await client.removeChannel(channel);channel=null;}
      showAuth();
      return;
    }
    if(profile?.id===session.user.id)return;
    profile=null;
    const {data:userProfile,error}=await client.from('profiles').select('id,full_name,email,place,role,is_active').eq('id',session.user.id).single();
    if(error)throw error;
    if(!userProfile||!['admin','doctor'].includes(userProfile.role))throw new Error('Profil Ordolio introuvable ou rôle non autorisé. Vérifiez le déclencheur et le profil dans Supabase.');
    if(userProfile.is_active===false){await client.auth.signOut();throw new Error('Ce compte a été suspendu. Contactez l’administrateur de votre espace.');}
    const requestedRole=document.body.dataset.role;
    if(requestedRole&&requestedRole!==userProfile.role){
      window.location.replace(userProfile.role==='admin'?'administrateur.html':'medecin.html');
      return;
    }
    profile=userProfile;
    showApp();
    await refreshData();
    if(channel)await client.removeChannel(channel);
    channel=client.channel(`ordolio-submissions-${profile.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'submissions'},()=>{
        refreshData().catch(showError);
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`recipient_id=eq.${profile.id}`},()=>{
        refreshData().catch(showError);
      })
      .subscribe((status,error)=>{
        if(status==='SUBSCRIBED')setSyncStatus('Synchronisation active');
        else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')showError(error||new Error(`Canal temps réel : ${status}`));
      });
  }

  function queueSession(session){
    sessionQueue=sessionQueue.then(()=>handleSession(session)).catch(showError);
  }

  async function loadSdk(){
    if(window.supabase)return;
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Impossible de charger le client Supabase. Vérifiez votre connexion réseau.'));
      document.head.appendChild(script);
    });
    if(!window.supabase)throw new Error('Le client Supabase n’a pas été initialisé.');
  }

  function validateFile(file){
    if(!file)return 'Choisissez une image avant l’envoi.';
    if(file.size>10*1024*1024)return 'La photo dépasse la limite de 10 Mo.';
    const extension=file.name.split('.').pop().toLowerCase();
    if(!['jpg','jpeg','png','heic','heif'].includes(extension))return 'Formats acceptés : JPEG, PNG ou HEIC.';
    if(file.type&&!['image/jpeg','image/png','image/heic','image/heif'].includes(file.type))return 'Le type du fichier ne correspond pas à une image prise en charge.';
    return '';
  }

  function setSelectedFile(file){
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}
    if(!file){selectedFile=null;$('send-button').disabled=true;$('file-preview').classList.add('hidden');$('file-input').value='';$('upload-title').textContent='Déposez votre photo ici';$('upload-hint').textContent='ou parcourez vos fichiers';return;}
    const message=validateFile(file);
    if(message){
      selectedFile=null;
      $('send-button').disabled=true;
      $('send-feedback').textContent=message;
      $('send-feedback').classList.add('error');
      $('file-preview').classList.add('hidden');
      $('upload-title').textContent='Déposez votre photo ici';
      $('upload-hint').textContent='ou parcourez vos fichiers';
      return;
    }
    selectedFile=file;
    $('upload-title').textContent=file.name;
    $('upload-hint').textContent=`${(file.size/1024/1024).toFixed(1)} Mo · prêt à envoyer`;
    $('send-button').disabled=false;
    $('send-feedback').textContent='';
    $('send-feedback').classList.remove('error');
    $('file-preview-name').textContent=`${file.name} · ${(file.size/1024/1024).toFixed(1)} Mo`;
    const extension=file.name.split('.').pop().toLowerCase();
    if(file.type.startsWith('image/')&&!['heic','heif'].includes(extension)){
      previewUrl=URL.createObjectURL(file);$('file-preview-image').src=previewUrl;$('file-preview-image').classList.remove('hidden');
    }else $('file-preview-image').classList.add('hidden');
    $('file-preview').classList.remove('hidden');
  }

  async function sendSubmission(){
    const validation=validateFile(selectedFile);
    if(validation){$('send-feedback').textContent=validation;return;}
    $('send-button').disabled=true;
    $('send-feedback').classList.remove('error');
    $('send-feedback').textContent='Envoi et synchronisation en cours…';
    const extension=selectedFile.name.split('.').pop().toLowerCase();
    const path=`${profile.id}/${crypto.randomUUID()}.${extension}`;
    const contentType=selectedFile.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif'}[extension]);
    const {error:uploadError}=await client.storage.from('prescriptions').upload(path,selectedFile,{cacheControl:'3600',upsert:false,contentType});
    if(uploadError){showError(uploadError);$('send-button').disabled=false;return;}
    const {error:insertError}=await client.from('submissions').insert({
      doctor_id:profile.id,
      note:$('note').value.trim()||null,
      file_path:path
    });
    if(insertError){
      const {error:cleanupError}=await client.storage.from('prescriptions').remove([path]);
      showError(cleanupError?new Error(`${insertError.message} Le fichier temporaire n’a pas pu être supprimé : ${cleanupError.message}`):insertError);
      $('send-button').disabled=false;
      return;
    }
    selectedFile=null;
    $('file-input').value='';
    $('note').value='';
    $('note-count').textContent='0 / 1000';
    $('upload-title').textContent='Déposez votre photo ici';
    $('upload-hint').textContent='ou parcourez vos fichiers';
    setSelectedFile(null);
    $('send-feedback').textContent='Ordonnance envoyée et synchronisée.';
    $('send-button').disabled=true;
    try{await refreshData();}catch(error){showError(error);}
  }

  function setAuthMessage(message){
    $('auth-message').textContent=message;
  }

  async function start(){
    $('auth-panel').classList.remove('hidden');
    setAuthMode('sign-in');
    ['.welcome-row','.demo-banner','#stats','#admin-view','#admin-bottom','#doctor-view','footer'].forEach(selector=>document.querySelector(selector)?.classList.add('hidden'));
    if(!config.url||!config.anonKey)throw new Error('Complétez supabase-config.js avec l’URL du projet et la clé publique anon/publishable.');
    await loadSdk();
    client=window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    client.auth.onAuthStateChange((_event,session)=>queueSession(session));
    if(data.session)queueSession(data.session);
    else showAuth();
  }

  $('auth-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if(!client){setAuthMessage('La connexion Supabase n’est pas encore prête.');return;}
    const action=event.submitter?.dataset.authAction||authMode;
    setAuthMode(action);
    const email=$('auth-email').value.trim();
    const password=$('auth-password').value;
    try{
      if(action==='sign-up'){
        const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:$('auth-name').value.trim()}}});
        if(error)throw error;
        if(!data.session)setAuthMessage('Compte créé. Confirmez votre adresse e-mail avant de vous connecter.');
      }else{
        const {error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
      }
    }catch(error){setAuthMessage(error.message||String(error));}
  });
  $('auth-form').querySelector('[data-auth-action="sign-up"]').addEventListener('click',()=>setAuthMode('sign-up'));
  $('auth-form').querySelector('[data-auth-action="sign-in"]').addEventListener('click',()=>setAuthMode('sign-in'));
  $('logout-button').addEventListener('click',async()=>{
    try{
      const {error}=await client.auth.signOut();
      if(error)showError(error);
    }catch(error){showError(error);}
  });
  $('file-input').addEventListener('change',event=>setSelectedFile(event.target.files?.[0]));
  $('all-doctors-button').addEventListener('click',()=>document.querySelector('.nav-item[data-label="Équipe"]')?.click());
  $('help-button').addEventListener('click',()=>$('help-dialog').showModal());
  $('help-close').addEventListener('click',()=>$('help-dialog').close());
  $('help-done').addEventListener('click',()=>$('help-dialog').close());
  $('remove-file').addEventListener('click',()=>setSelectedFile(null));
  $('note').addEventListener('input',()=>$('note-count').textContent=`${$('note').value.length} / 1000`);
  $('submission-search').addEventListener('input',()=>{submissionPage=0;renderRows()});
  ['submission-status','submission-from','submission-to'].forEach(id=>$(id).addEventListener('change',()=>{submissionPage=0;renderRows()}));
  $('export-submissions').addEventListener('click',exportSubmissions);
  $('submission-prev').addEventListener('click',()=>{submissionPage=Math.max(0,submissionPage-1);renderRows()});
  $('submission-next').addEventListener('click',()=>{submissionPage++;renderRows()});
  ['history-status','history-from','history-to'].forEach(id=>$(id).addEventListener('change',()=>{historyPage=0;renderHistory()}));
  $('history-prev').addEventListener('click',()=>{historyPage=Math.max(0,historyPage-1);renderHistory()});
  $('history-next').addEventListener('click',()=>{historyPage++;renderHistory()});
  $('invite-form').addEventListener('submit',event=>inviteDoctor(event).catch(error=>{showError(error);$('invite-form').querySelector('button[type="submit"]').disabled=false}));
  $('team-search').addEventListener('input',renderTeam);
  $('team-status').addEventListener('change',renderTeam);
  $('notifications-button').addEventListener('click',()=>{
    const panel=$('notification-panel');const open=panel.classList.toggle('hidden')===false;
    $('notifications-button').setAttribute('aria-expanded',String(open));
  });
  $('mark-notifications-read').addEventListener('click',()=>markNotificationsRead().catch(showError));
  $('notification-list').addEventListener('click',event=>{
    const button=event.target.closest('.notification-item');if(!button)return;
    const submission=submissions.find(item=>item.id===button.dataset.submission);
    $('notification-panel').classList.add('hidden');$('notifications-button').setAttribute('aria-expanded','false');
    markNotificationsRead().catch(showError);
    if(profile.role==='admin'&&submission?.status==='pending')openReview(submission.id).catch(showError);
    else if(profile.role==='doctor')document.querySelector('.history-panel').scrollIntoView({behavior:'smooth',block:'center'});
  });
  $('dropzone').addEventListener('dragover',event=>{event.preventDefault();event.currentTarget.classList.add('dragging');});
  $('dropzone').addEventListener('dragleave',event=>event.currentTarget.classList.remove('dragging'));
  $('dropzone').addEventListener('drop',event=>{
    event.preventDefault();
    event.currentTarget.classList.remove('dragging');
    setSelectedFile(event.dataTransfer.files?.[0]);
  });
  $('send-button').addEventListener('click',()=>sendSubmission().catch(error=>{showError(error);$('send-button').disabled=false;}));
  $('dialog-close').addEventListener('click',()=>$('review-dialog').close());
  $('approve-button').addEventListener('click',()=>resolveReview('approved').catch(error=>{showError(error);$('approve-button').disabled=false;$('reject-button').disabled=false;}));
  $('reject-button').addEventListener('click',()=>resolveReview('rejected').catch(error=>{showError(error);$('approve-button').disabled=false;$('reject-button').disabled=false;}));
  start().catch(error=>{
    showAuth(error.message||String(error));
    setSyncStatus('Configuration requise',true);
  });
}
