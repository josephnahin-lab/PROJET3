if (!(window.ORDOLIO_SUPABASE&&(window.ORDOLIO_SUPABASE.url||window.ORDOLIO_SUPABASE.anonKey))) {
const demoStorageKey='ordolio-demo-v4';
let localPersistence=true;try{localStorage.setItem(`${demoStorageKey}-check`,'1');localStorage.removeItem(`${demoStorageKey}-check`)}catch{localPersistence=false}
function readDemoData(){try{const value=JSON.parse(localStorage.getItem(demoStorageKey)||'{}'),people=Array.isArray(value.people)?value.people.map(person=>({...person,profession:person.profession||'Médecin'})):[];return{people,submissions:Array.isArray(value.submissions)?value.submissions.map(item=>({...item,person:{...item.person,profession:item.person?.profession||people.find(person=>person.id===item.person?.id)?.profession||'Médecin'}})):[],payments:Array.isArray(value.payments)?value.payments:[],contacts:Array.isArray(value.contacts)?value.contacts:[]}}catch{return{people:[],submissions:[],payments:[],contacts:[]}}}
const savedDemoData=readDemoData();
const people=savedDemoData.people;
const submissions=savedDemoData.submissions;
const payments=savedDemoData.payments;
const professionalContacts=savedDemoData.contacts;
function persistDemoData(){try{localStorage.setItem(demoStorageKey,JSON.stringify({people,submissions:submissions.map(({photoUrl,...item})=>item),payments,contacts:professionalContacts}));return true}catch{localPersistence=false;return false}}
function createId(){return window.crypto?.randomUUID?.()||`doctor-${Date.now()}-${Math.random().toString(36).slice(2)}`}
let isDoctor=document.body.dataset.role==='doctor';
const currentProfession=document.body.dataset.profession||'Médecin';
const activeDoctorStorageKey=`${demoStorageKey}-active-${currentProfession.toLocaleLowerCase('fr').replace(/[^a-z]+/g,'-')}`;
let selectedFile=null;
let nextSubmissionId=Math.max(0,...submissions.map(s=>Number(s.id)||0))+1;
let reviewingId=null;
let submissionPage=0,historyPage=0,notificationsRead=false,previewUrl='';
let activeDoctorId='';try{activeDoctorId=localStorage.getItem(activeDoctorStorageKey)||(currentProfession==='Médecin'?localStorage.getItem(`${demoStorageKey}-active-doctor`):'')||''}catch{}
const pageSize=5;

const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const getActiveDoctor=()=>people.find(person=>person.id===activeDoctorId&&person.active!==false&&person.profession===currentProfession)||null;
function addProfessionField(form,id,locked=false){if(!form)return;const label=document.createElement('label');label.className='profession-field'+(locked?' hidden':'');label.innerHTML='<span>Profession</span><select id="'+id+'" required><option>Médecin</option><option>Infirmier / infirmière</option><option>Sage-femme / maïeuticien</option><option>Pharmacien / pharmacienne</option></select>';form.querySelector('button[type="submit"]')?.before(label);if(locked)form.querySelector(`#${id}`).value=currentProfession}
function addProfessionalField(form,id,labelText,type='text'){if(!form)return;const label=document.createElement('label');label.className='professional-extra-field';label.innerHTML=`<span>${labelText}</span><input id="${id}" type="${type}" ${type==='tel'?'autocomplete="tel"':''} maxlength="120"/>`;form.querySelector('button[type="submit"]')?.before(label)}
addProfessionField($('invite-form'),'invite-profession');addProfessionField($('doctor-profile-form'),'doctor-profession',true);
addProfessionalField($('invite-form'),'invite-phone','Téléphone professionnel','tel');addProfessionalField($('invite-form'),'invite-license','N° professionnel');
addProfessionalField($('doctor-profile-form'),'doctor-phone','Téléphone professionnel','tel');addProfessionalField($('doctor-profile-form'),'doctor-license','N° professionnel');
function updateDoctorIdentity(){
 const person=getActiveDoctor();
 $('active-doctor-card').classList.toggle('hidden',!person);$('doctor-profile-picker').classList.toggle('hidden',Boolean(person));$('doctor-profile-divider').classList.toggle('hidden',Boolean(person));$('doctor-profile-form').classList.toggle('hidden',Boolean(person));
 $('active-doctor-name').textContent=person?`${person.name}${person.place?` · ${person.place}`:''}`:'';
 if(person&&isDoctor){$('page-title').textContent=`Bonjour, ${person.name}`;$('profile-name').textContent=person.name;$('profile-role').textContent=person.profession||'Professionnel de santé';$('avatar').textContent=person.initials;$('top-avatar').textContent=person.initials;$('page-subtitle').textContent='Envoyez une ordonnance et suivez vos validations et votre solde estimé.';}
 $('send-button').disabled=!person||!selectedFile;
 document.querySelector('.personal-summary .good-note').textContent=person?'Vos envois et leurs statuts sont visibles dans votre historique.':'Choisissez ou créez votre profil médecin pour commencer.';
}
function renderDoctorProfiles(){
 const select=$('doctor-profile-select'),available=people.filter(person=>person.active!==false&&person.profession===currentProfession);
 if(activeDoctorId&&!getActiveDoctor())activeDoctorId='';
 select.innerHTML=available.length?'<option value="">Choisissez votre profil</option>'+available.map(person=>`<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} · ${escapeHtml(person.profession||'Professionnel de santé')}${person.place?` · ${escapeHtml(person.place)}`:''}</option>`).join(''):'<option value="">Aucun profil professionnel</option>';
 $('use-doctor-profile').disabled=!select.value;
 updateDoctorIdentity();
}
function activateDoctor(id){
 const person=people.find(item=>item.id===id&&item.active!==false&&item.profession===currentProfession);if(!person)return;
 if(person.profession!==currentProfession)return;activeDoctorId=person.id;try{localStorage.setItem(activeDoctorStorageKey,activeDoctorId)}catch{}
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
  const paid=payments.filter(payment=>payment.professionalId===activeDoctorId).reduce((sum,payment)=>sum+Number(payment.amount||0),0),earned=own.length*rate,balance=Math.max(0,earned-paid);
  const earnedToday=own.filter(item=>{const d=stamp(item);return d.toDateString()===today.toDateString()}).length*rate;
  const byDay=Object.groupBy?Object.groupBy(own,item=>stamp(item).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})):own.reduce((groups,item)=>{const key=stamp(item).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});(groups[key]??=[]).push(item);return groups},{});
  let panel=$('professional-earnings');if(!panel){panel=document.createElement('article');panel.id='professional-earnings';panel.className='panel earnings-panel';document.querySelector('.doctor-side')?.insertBefore(panel,document.querySelector('.history-panel'));}
  const paidRows=payments.filter(payment=>payment.professionalId===activeDoctorId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  panel.innerHTML=`<div class="panel-heading"><div><span class="eyebrow">RÉMUNÉRATION</span><h2>Mon solde</h2><p>${money(rate)} par ordonnance validée</p></div><span class="summary-icon">₣</span></div><div class="earnings-total">${money(balance)}</div><div class="earnings-caption">Solde estimé restant · ${own.length} ordonnance${own.length===1?'':'s'} validée${own.length===1?'':'s'}</div><div class="earnings-breakdown"><div><span>Acquis</span><b>${money(earned)}</b></div><div><span>Déjà réglé</span><b>${money(paid)}</b></div></div><div class="earnings-today"><span>Gain validé aujourd’hui</span><b>${money(earnedToday)}</b></div><h3 class="earnings-subtitle">Historique quotidien des gains</h3><div class="earnings-list">${Object.entries(byDay).length?Object.entries(byDay).sort((a,b)=>stamp(b[1][0])-stamp(a[1][0])).slice(0,6).map(([day,items])=>`<div><span>${escapeHtml(day)}</span><b>+ ${money(items.length*rate)}</b></div>`).join(''):'<p class="empty-state">Les gains apparaîtront après la validation de vos premiers envois.</p>'}</div><h3 class="earnings-subtitle">Versements enregistrés</h3><div class="earnings-list">${paidRows.length?paidRows.map(payment=>`<div><span>${new Date(payment.createdAt).toLocaleDateString('fr-FR')} · ${escapeHtml(payment.method)}</span><b>− ${money(payment.amount)}</b></div>`).join(''):'<p class="empty-state">Aucun versement enregistré.</p>'}</div><p class="earnings-note">Démonstration locale : un versement n’est noté qu’après saisie par l’administrateur. Aucun transfert bancaire n’est lancé depuis ce site.</p>`;
 }else{
  let panel=$('admin-payouts');if(!panel){panel=document.createElement('article');panel.id='admin-payouts';panel.className='panel payout-panel';panel.innerHTML='<div class="panel-heading"><div><span class="eyebrow">SUIVI DES VERSEMENTS</span><h2>Soldes par professionnel</h2><p>200 FCFA par ordonnance validée · paiement manuel tracé</p></div><span class="summary-icon">₣</span></div><div class="payout-total" id="payout-total"></div><div class="finance-chart-block"><b>Gains validés — 7 derniers jours</b><div class="finance-chart" id="finance-chart"></div></div><div class="payout-table-wrap"><table><thead><tr><th>Professionnel</th><th>Validées</th><th>Acquis</th><th>Versé</th><th>Solde</th><th>État</th><th></th></tr></thead><tbody id="payout-rows"></tbody></table></div><p class="earnings-note">Mode local : l’enregistrement confirme seulement qu’un paiement a été effectué hors du site. Aucun transfert bancaire n’est lancé. Avant l’usage réel, sécurisez le registre de paiement et vérifiez le cadre de rémunération.</p>';document.querySelector('#admin-bottom')?.appendChild(panel);ensurePaymentDialog();}
  const allProfessionals=new Map(people.map(person=>[person.id,{person,count:0}]));approved.forEach(item=>{const id=item.person.id,entry=allProfessionals.get(id)||{person:item.person,count:0};entry.count++;allProfessionals.set(id,entry)});
  const paidToday=approved.filter(item=>stamp(item).toDateString()===today.toDateString()).length;
  const dueTotal=[...allProfessionals.values()].reduce((sum,entry)=>sum+Math.max(0,entry.count*rate-payments.filter(payment=>payment.professionalId===entry.person.id).reduce((paid,payment)=>paid+Number(payment.amount||0),0)),0);
  $('payout-total').textContent=`${money(dueTotal)} restant à régler · ${money(paidToday*rate)} acquis aujourd’hui`;
  renderFinanceChart(approved,stamp,rate);
  $('payout-rows').innerHTML=allProfessionals.size?[...allProfessionals.values()].sort((a,b)=>a.person.name.localeCompare(b.person.name,'fr')).map(entry=>{const earned=entry.count*rate,paid=payments.filter(payment=>payment.professionalId===entry.person.id).reduce((sum,payment)=>sum+Number(payment.amount||0),0),due=Math.max(0,earned-paid);return `<tr><td><button type="button" class="payout-person" data-person-detail="${escapeHtml(entry.person.id)}">${escapeHtml(entry.person.name)}<small>${escapeHtml(entry.person.profession||'Professionnel de santé')}</small></button></td><td>${entry.count}</td><td>${money(earned)}</td><td>${money(paid)}</td><td><b>${money(due)}</b></td><td><span class="status ${due?'pending':'approved'}">${due?'À régler':'Soldé'}</span></td><td><button class="review-btn payout-pay" type="button" data-pay-person="${escapeHtml(entry.person.id)}" ${due?'':'disabled'}>${due?'Enregistrer paiement':'—'}</button></td></tr>`}).join(''):'<tr><td colspan="7" class="empty-state">Aucun professionnel inscrit.</td></tr>';
  $('payout-rows').querySelectorAll('[data-pay-person]').forEach(button=>button.addEventListener('click',()=>openPayment(button.dataset.payPerson)));
  $('payout-rows').querySelectorAll('[data-person-detail]').forEach(button=>button.addEventListener('click',()=>showProfessionalDetails(button.dataset.personDetail)));
 }
 if(isDoctor)renderProfessionalContacts();
}
function renderFinanceChart(approved,stamp,rate){const days=Array.from({length:7},(_,index)=>{const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()-(6-index));return day});const counts=days.map(day=>approved.filter(item=>stamp(item).toDateString()===day.toDateString()).length),max=Math.max(1,...counts);$('finance-chart').innerHTML=days.map((day,index)=>{const amount=counts[index]*rate,height=counts[index]?Math.max(10,counts[index]/max*100):4;return `<div class="finance-bar-item" title="${counts[index]} validée(s) · ${amount} FCFA"><span class="finance-bar-amount">${amount.toLocaleString('fr-FR')}</span><i style="height:${height}%"></i><small>${day.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')}<br/>${day.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</small></div>`}).join('')}
function renderProfessionalContacts(){
 let panel=$('professional-contacts');if(!panel){panel=document.createElement('article');panel.id='professional-contacts';panel.className='panel professional-contacts-panel';panel.innerHTML='<div class="panel-heading"><div><span class="eyebrow">SUIVI DE CLIENTÈLE</span><h2>Contacts enregistrés</h2><p>Coordonnées et date de passage, sans notes médicales.</p></div><span class="summary-icon">♙</span></div><form id="professional-contact-form" class="service-form contact-entry-form"><label>Nom du client<input name="name" maxlength="100" required autocomplete="off"/></label><label>Téléphone ou e-mail<input name="contact" maxlength="120" required autocomplete="off"/></label><label>Date de passage<input name="visitDate" type="date" required/></label><button class="secondary-button" type="submit">Ajouter le contact</button></form><p class="earnings-note">Démonstration locale uniquement. Ne saisissez pas de coordonnées réelles tant qu’un stockage sécurisé et des règles de confidentialité ne sont pas en place.</p><div id="professional-contact-list" class="professional-contact-list"></div>';document.querySelector('.doctor-side')?.insertBefore(panel,document.querySelector('.history-panel'));$('professional-contact-form').addEventListener('submit',event=>{event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget).entries());professionalContacts.unshift({id:createId(),professionalId:activeDoctorId,name:form.name.trim(),contact:form.contact.trim(),visitDate:form.visitDate,createdAt:new Date().toISOString()});const saved=persistDemoData();if(!saved){professionalContacts.shift();window.alert('Impossible de conserver ce contact dans le navigateur.');return;}event.currentTarget.reset();renderProfessionalContacts()});}
 const own=professionalContacts.filter(item=>item.professionalId===activeDoctorId).sort((a,b)=>new Date(b.visitDate)-new Date(a.visitDate));$('professional-contact-list').innerHTML=own.length?own.map(item=>`<div class="professional-contact-row"><span><b>${escapeHtml(item.name)}</b><small>Passage le ${escapeHtml(item.visitDate)}</small></span><a href="tel:${encodeURIComponent(item.contact)}">${escapeHtml(item.contact)}</a><button type="button" data-remove-contact="${escapeHtml(item.id)}" aria-label="Retirer ce contact">×</button></div>`).join(''):'<p class="empty-state">Aucun contact saisi.</p>';
 $('professional-contact-list').querySelectorAll('[data-remove-contact]').forEach(button=>button.addEventListener('click',()=>{const index=professionalContacts.findIndex(item=>item.id===button.dataset.removeContact&&item.professionalId===activeDoctorId);if(index>=0){professionalContacts.splice(index,1);persistDemoData();renderProfessionalContacts()}}));
}
function ensurePaymentDialog(){
 if($('payment-dialog'))return;
 const dialog=document.createElement('dialog');dialog.id='payment-dialog';dialog.className='review-dialog payment-dialog';dialog.innerHTML='<form id="payment-form"><div class="dialog-head"><div><small>REGISTRE DE PAIEMENT LOCAL</small><h2 id="payment-person-name">Enregistrer un paiement</h2><p id="payment-balance-copy"></p></div><button class="dialog-close" id="payment-dialog-close" type="button" aria-label="Fermer">×</button></div><label class="decision-label" for="payment-amount">Montant versé (FCFA)</label><input class="payment-input" id="payment-amount" type="number" min="1" step="1" required/><label class="decision-label" for="payment-method">Moyen de paiement</label><select class="payment-input" id="payment-method"><option>Espèces</option><option>Mobile Money</option><option>Virement bancaire</option><option>Autre</option></select><label class="decision-label" for="payment-reference">Référence ou note (facultatif)</label><input class="payment-input" id="payment-reference" maxlength="100"/><div class="dialog-actions"><button class="secondary-button" id="payment-cancel" type="button">Annuler</button><button class="primary-button" type="submit">Confirmer le paiement enregistré</button></div><p class="earnings-note">Cette action met à jour le registre local; elle n’effectue pas le transfert.</p></form>';
 document.body.appendChild(dialog);$('payment-dialog-close').addEventListener('click',()=>dialog.close());$('payment-cancel').addEventListener('click',()=>dialog.close());
 $('payment-form').addEventListener('submit',event=>{event.preventDefault();const personId=dialog.dataset.personId,person=people.find(item=>item.id===personId),earned=submissions.filter(item=>item.person.id===personId&&item.status==='Validé').length*200,paid=payments.filter(item=>item.professionalId===personId).reduce((sum,item)=>sum+Number(item.amount||0),0),amount=Number($('payment-amount').value);if(!person||amount<1||amount>earned-paid){$('payment-amount').setCustomValidity('Le montant doit être positif et ne pas dépasser le solde.');$('payment-amount').reportValidity();return;}$('payment-amount').setCustomValidity('');payments.push({id:createId(),professionalId:personId,amount,method:$('payment-method').value,reference:$('payment-reference').value.trim(),createdAt:new Date().toISOString()});persistDemoData();dialog.close();renderEarnings()});
}
function openPayment(personId){
 ensurePaymentDialog();const person=people.find(item=>item.id===personId);if(!person)return;const earned=submissions.filter(item=>item.person.id===personId&&item.status==='Validé').length*200,paid=payments.filter(item=>item.professionalId===personId).reduce((sum,item)=>sum+Number(item.amount||0),0),due=Math.max(0,earned-paid);if(!due)return;const dialog=$('payment-dialog');dialog.dataset.personId=personId;$('payment-person-name').textContent=person.name;$('payment-balance-copy').textContent=`Solde restant : ${new Intl.NumberFormat('fr-FR').format(due)} FCFA`;$('payment-amount').max=String(due);$('payment-amount').value=String(due);$('payment-reference').value='';dialog.showModal();
}
function openPrintableReport(title,subtitle,headers,rows,mail=null){
 const popup=window.open('','_blank');if(!popup){window.alert('Autorisez la fenêtre d’impression pour préparer le rapport PDF.');return;}
 const tableRows=rows.map(row=>`<tr>${row.map(value=>`<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
 const mailLink=mail?`<a class="mail-report" href="mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}">Préparer l’envoi de ce relevé par e-mail</a>`:'';
 popup.document.write(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:14px Arial,sans-serif;color:#203b35;margin:36px}h1{font-size:24px}p{color:#647770}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border:1px solid #dbe5df;text-align:left}th{background:#eff5f1}.mail-report{display:inline-block;margin-left:12px;color:#167966}@media print{button,.mail-report{display:none}}</style><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><button onclick="window.print()">Imprimer ou enregistrer en PDF</button>${mailLink}<table><thead><tr>${headers.map(value=>`<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table><p>Rapport préparé par YNNOVIX. Vérifiez les totaux et le registre de paiements avant tout règlement.</p></html>`);popup.document.close();popup.focus();
}
function openProfessionalReport(personId){
 const person=people.find(item=>item.id===personId);if(!person)return;const rows=submissions.filter(item=>item.person.id===personId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(item=>[item.date,item.status,item.status==='Validé'?'200 FCFA':'0 FCFA',item.decisionNote||'']);const paid=payments.filter(payment=>payment.professionalId===personId).reduce((sum,payment)=>sum+Number(payment.amount||0),0),earned=submissions.filter(item=>item.person.id===personId&&item.status==='Validé').length*200;const body=`Bonjour ${person.name},\n\nVotre relevé YNNOVIX est prêt. Acquis : ${earned} FCFA. Versé : ${paid} FCFA. Solde estimé : ${Math.max(0,earned-paid)} FCFA.\n\nVeuillez joindre le rapport PDF exporté depuis YNNOVIX.`;openPrintableReport(`Historique — ${person.name}`,`${person.profession||'Professionnel'} · ${person.email||''} · ${person.place||''} · Acquis ${earned} FCFA · Versé ${paid} FCFA · Solde ${Math.max(0,earned-paid)} FCFA`,['Date','Décision','Montant acquis','Commentaire'],rows,person.email?{to:person.email,subject:'Votre relevé YNNOVIX',body}:null);
}
function showProfessionalDetails(personId){
 const person=people.find(item=>item.id===personId);if(!person)return;let dialog=$('professional-detail-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='professional-detail-dialog';dialog.className='review-dialog professional-detail-dialog';dialog.innerHTML='<div class="dialog-head"><div><small>FICHE PROFESSIONNELLE</small><h2 id="detail-person-name"></h2><p id="detail-person-role"></p></div><button class="dialog-close" id="detail-dialog-close" type="button" aria-label="Fermer">×</button></div><div id="detail-profile-fields" class="detail-profile-grid"></div><div class="detail-metrics" id="detail-metrics"></div><h3 class="earnings-subtitle">Historique des ordonnances</h3><div class="detail-history" id="detail-history"></div><div class="dialog-actions"><button class="secondary-button" id="detail-email">Préparer un e-mail</button><button class="primary-button" id="detail-pdf">Exporter le rapport PDF</button></div>';document.body.appendChild(dialog);$('detail-dialog-close').addEventListener('click',()=>dialog.close());$('detail-pdf').addEventListener('click',()=>openProfessionalReport(dialog.dataset.personId));$('detail-email').addEventListener('click',()=>{const target=people.find(item=>item.id===dialog.dataset.personId);if(!target?.email){window.alert('Aucune adresse e-mail saisie pour ce professionnel.');return;}const subject=encodeURIComponent('Suivi YNNOVIX');const body=encodeURIComponent(`Bonjour ${target.name},\n\nConsultez votre relevé de validations et de règlements dans votre espace professionnel YNNOVIX.`);window.location.href=`mailto:${encodeURIComponent(target.email)}?subject=${subject}&body=${body}`})}
 dialog.dataset.personId=personId;const history=submissions.filter(item=>item.person.id===personId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)),approved=history.filter(item=>item.status==='Validé').length,earned=approved*200,paid=payments.filter(payment=>payment.professionalId===personId).reduce((sum,payment)=>sum+Number(payment.amount||0),0);$('detail-person-name').textContent=person.name;$('detail-person-role').textContent=person.profession||'Professionnel de santé';$('detail-profile-fields').innerHTML=[['E-mail',person.email],['Téléphone',person.phone],['Lieu',person.place],['N° professionnel',person.license],['Compte créé',person.createdAt?new Date(person.createdAt).toLocaleDateString('fr-FR'):'Donnée non renseignée']].map(([label,value])=>`<div><small>${label}</small><b>${escapeHtml(value||'Non renseigné')}</b></div>`).join('');$('detail-metrics').innerHTML=`<div><b>${history.length}</b><small>ordonnances reçues</small></div><div><b>${approved}</b><small>validées</small></div><div><b>${new Intl.NumberFormat('fr-FR').format(earned)} FCFA</b><small>acquis</small></div><div><b>${new Intl.NumberFormat('fr-FR').format(paid)} FCFA</b><small>versé</small></div><div><b>${new Intl.NumberFormat('fr-FR').format(Math.max(0,earned-paid))} FCFA</b><small>solde</small></div>`;$('detail-history').innerHTML=history.length?history.slice(0,8).map(item=>`<div class="detail-history-row"><span>${escapeHtml(item.date)}</span><span>${escapeHtml(item.status)}</span><b>${item.status==='Validé'?'200 FCFA':'0 FCFA'}</b></div>`).join(''):'<p class="empty-state">Aucun envoi transmis.</p>';dialog.showModal();
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
 const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));link.download='YNNOVIX-envois.csv';link.click();URL.revokeObjectURL(link.href);
}
function exportAdminPdf(){const rows=visibleSubmissions().map(item=>[item.person.name,item.person.profession||'Professionnel',item.date,item.status,item.status==='Validé'?'200 FCFA':'0 FCFA',item.decisionNote||'']);openPrintableReport('Historique des ordonnances YNNOVIX',`Filtré pour la période et le statut sélectionnés · ${rows.length} ligne(s)`,['Professionnel','Rôle','Date','Décision','Montant','Commentaire'],rows)}
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
 if(!$('doctor-history-pdf')){const toolbar=document.createElement('div');toolbar.className='history-export-toolbar';toolbar.innerHTML='<button id="doctor-history-pdf" type="button" class="secondary-button">Exporter mon historique en PDF</button><button id="doctor-history-share" type="button" class="text-link">Préparer un e-mail</button>';document.querySelector('.history-filters')?.after(toolbar);$('doctor-history-pdf').addEventListener('click',exportDoctorPdf);$('doctor-history-share').addEventListener('click',shareDoctorHistory)}
 $('history-page-info').textContent=`${all.length?historyPage*pageSize+1:0}–${Math.min((historyPage+1)*pageSize,all.length)} sur ${all.length}`;$('history-prev').disabled=historyPage===0;$('history-next').disabled=historyPage>=pages-1;
}
function exportDoctorPdf(){const person=getActiveDoctor();if(!person)return;const from=$('history-from').value?new Date(`${$('history-from').value}T00:00:00`):null,to=$('history-to').value?new Date(`${$('history-to').value}T23:59:59`):null,status=$('history-status').value;const filtered=submissions.filter(item=>item.person.id===person.id&&(!from||new Date(item.createdAt)>=from)&&(!to||new Date(item.createdAt)<=to)&&(status==='all'||status===(item.pending?'pending':item.status==='Refusé'?'rejected':'approved'))).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));const rows=filtered.map(item=>[item.date,item.status,item.status==='Validé'?'200 FCFA':'0 FCFA',item.decisionNote||'']);openPrintableReport(`Historique YNNOVIX — ${person.name}`,`${person.profession||'Professionnel'} · ${filtered.length} entrée(s) · seuls les envois validés sont rémunérés`,['Date','Décision','Montant acquis','Commentaire'],rows)}
function shareDoctorHistory(){const person=getActiveDoctor();if(!person)return;const recipient=window.prompt('Adresse e-mail du destinataire du relevé :');if(!recipient?.includes('@'))return;const filtered=submissions.filter(item=>item.person.id===person.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)),earned=filtered.filter(item=>item.status==='Validé').length*200;const body=`Bonjour,\n\nJe partage mon relevé YNNOVIX. ${filtered.length} ordonnance(s), ${earned} FCFA acquis selon les validations.\n\nJe joins le rapport PDF exporté depuis mon espace.`;window.location.href=`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent('Relevé professionnel YNNOVIX')}&body=${encodeURIComponent(body)}`}
function renderTeam(){
 const query=$('team-search').value.trim().toLocaleLowerCase('fr'),status=$('team-status').value;
 const visible=people.filter(p=>`${p.name} ${p.email||''} ${p.place||''} ${p.profession||''} ${p.phone||''} ${p.license||''}`.toLocaleLowerCase('fr').includes(query)&&(status==='all'||(status==='active')===(p.active!==false)));
 $('team-total').textContent=`${visible.length} sur ${people.length} comptes`;
 $('doctor-rows').innerHTML=visible.length?visible.map(p=>{const sent=submissions.filter(s=>s.person.id===p.id).length;return `<tr><td><div class="person-cell">${avatar(p)}<span><button class="person-detail-link" type="button" data-person-detail="${escapeHtml(p.id)}"><b>${escapeHtml(p.name)}</b></button><small>${escapeHtml(p.profession||'Professionnel de santé')} · ${escapeHtml(p.email||'')}</small></span></div></td><td>${escapeHtml(p.place||'—')}</td><td>${sent}</td><td><span class="status ${p.active?'approved':'rejected'}">${p.active?'Actif':'Suspendu'}</span></td><td><button class="review-btn account-toggle" data-id="${escapeHtml(p.id)}">${p.active?'Suspendre':'Réactiver'}</button></td></tr>`}).join(''):'<tr><td colspan="5" class="empty-state">Aucun compte ne correspond à cette recherche.</td></tr>';
 $('doctor-rows').querySelectorAll('[data-person-detail]').forEach(button=>button.addEventListener('click',()=>showProfessionalDetails(button.dataset.personDetail)));
 $('doctor-rows').querySelectorAll('.account-toggle').forEach(button=>button.addEventListener('click',()=>{const person=people.find(p=>p.id===button.dataset.id);person.active=!person.active;if(activeDoctorId===person.id&&!person.active){activeDoctorId='';try{localStorage.removeItem(activeDoctorStorageKey)}catch{}renderDoctorProfiles()}persistDemoData();renderTeam();renderStats();}));
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
if(isDoctor){$('page-title').textContent=`Espace ${currentProfession.toLocaleLowerCase('fr')}`;$('crumb').textContent='Mon espace';$('page-subtitle').textContent='Créez votre profil ou choisissez le vôtre pour commencer.';$('profile-name').textContent=currentProfession;$('profile-role').textContent='Compte professionnel';$('avatar').textContent='PS';$('top-avatar').textContent='PS';$('eyebrow').textContent='VOTRE ESPACE PERSONNEL';document.title=`YNNOVIX — Espace ${currentProfession.toLocaleLowerCase('fr')}`;}
$('all-doctors-button').addEventListener('click',()=>document.querySelector('.nav-item[data-label="Équipe"]')?.click());
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());
$('help-close').addEventListener('click',()=>$('help-dialog').close());
$('help-done').addEventListener('click',()=>$('help-dialog').close());
$('submission-search').addEventListener('input',()=>{submissionPage=0;renderRows()});
['submission-status','submission-from','submission-to'].forEach(id=>$(id).addEventListener('change',()=>{submissionPage=0;renderRows()}));
$('export-submissions').addEventListener('click',exportSubmissions);
const pdfExportButton=document.createElement('button');pdfExportButton.type='button';pdfExportButton.className='text-link pdf-export-button';pdfExportButton.textContent='Exporter PDF ↓';$('export-submissions').after(pdfExportButton);pdfExportButton.addEventListener('click',exportAdminPdf);
$('submission-prev').addEventListener('click',()=>{submissionPage=Math.max(0,submissionPage-1);renderRows()});
$('submission-next').addEventListener('click',()=>{submissionPage++;renderRows()});
['history-status','history-from','history-to'].forEach(id=>$(id).addEventListener('change',()=>{historyPage=0;renderHistory()}));
$('history-prev').addEventListener('click',()=>{historyPage=Math.max(0,historyPage-1);renderHistory()});
$('history-next').addEventListener('click',()=>{historyPage++;renderHistory()});
$('doctor-month-label').textContent=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 $('invite-form').addEventListener('submit',event=>{event.preventDefault();const name=$('invite-name').value.trim(),email=$('invite-email').value.trim().toLowerCase(),place=$('invite-place').value.trim(),profession=$('invite-profession').value,phone=$('invite-phone').value.trim(),license=$('invite-license').value.trim();if(people.some(person=>person.email?.toLowerCase()===email)){$('invite-feedback').textContent='Cette adresse e-mail est déjà enregistrée.';$('invite-feedback').classList.add('error');return;}const initialsValue=name.split(/\s+/).filter(Boolean).slice(-2).map(word=>word[0]).join('').toUpperCase()||'PS';const person={id:createId(),name,initials:initialsValue,email,place,profession,phone,license,active:true,color:'#e4f2ec',ink:'#27816d'};people.push(person);const saved=persistDemoData();$('invite-feedback').textContent=saved?'Profil professionnel ajouté sur cet appareil. Aucun e-mail ne sera envoyé en mode démonstration.':'Le navigateur ne peut pas conserver ces données. Ouvrez le site sur localhost pour les partager entre pages.';$('invite-feedback').classList.toggle('error',!saved);$('invite-form').reset();renderTeam();renderRanking();renderDoctorProfiles()});
$('team-search').addEventListener('input',renderTeam);$('team-status').addEventListener('change',renderTeam);
$('doctor-profile-select').addEventListener('change',()=>{$('use-doctor-profile').disabled=!$('doctor-profile-select').value});
$('use-doctor-profile').addEventListener('click',()=>activateDoctor($('doctor-profile-select').value));
$('change-doctor-profile').addEventListener('click',()=>{activeDoctorId='';try{localStorage.removeItem(activeDoctorStorageKey)}catch{}renderDoctorProfiles()});
 $('doctor-profile-form').addEventListener('submit',event=>{event.preventDefault();const name=$('doctor-name').value.trim(),email=$('doctor-email').value.trim().toLowerCase(),place=$('doctor-place').value.trim(),profession=currentProfession,phone=$('doctor-phone').value.trim(),license=$('doctor-license').value.trim();if(people.some(person=>person.email?.toLowerCase()===email)){$('doctor-profile-feedback').textContent='Cette adresse e-mail est déjà enregistrée. Choisissez le profil existant dans la liste.';$('doctor-profile-feedback').classList.add('error');return;}const initialsValue=name.split(/\s+/).filter(Boolean).slice(-2).map(word=>word[0]).join('').toUpperCase()||'PS';const person={id:createId(),name,initials:initialsValue,email,place,profession,phone,license,active:true,color:'#e4f2ec',ink:'#27816d'};people.push(person);const saved=persistDemoData();$('doctor-profile-feedback').textContent=saved?'Profil créé sur cet appareil.':'Le navigateur ne peut pas conserver ces données. Ouvrez le site sur localhost pour garder le profil.';$('doctor-profile-feedback').classList.toggle('error',!saved);$('doctor-profile-form').reset();$('doctor-profession').value=currentProfession;activateDoctor(person.id);renderTeam()});
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
window.addEventListener('storage',event=>{if(event.key===demoStorageKey){const next=readDemoData();people.splice(0,people.length,...next.people);submissions.splice(0,submissions.length,...next.submissions);payments.splice(0,payments.length,...next.payments);professionalContacts.splice(0,professionalContacts.length,...next.contacts);renderDoctorProfiles();renderNavigation();renderStats();renderRanking();renderRows();renderHistory();renderTeam();renderNotifications()}if(event.key===activeDoctorStorageKey){try{activeDoctorId=localStorage.getItem(activeDoctorStorageKey)||''}catch{}renderDoctorProfiles();renderHistory();renderStats();renderNotifications()}});
renderDoctorProfiles();renderNavigation();renderStats();renderRanking();renderRows();renderHistory();renderTeam();renderNotifications();
}
