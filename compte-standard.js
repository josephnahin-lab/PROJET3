(() => {
  const key='ordolio-services-v1',sessionKey='ordolio-standard-account';
  const read=()=>{try{const data=JSON.parse(localStorage.getItem(key)||'{}');return{accounts:Array.isArray(data.accounts)?data.accounts:[],products:Array.isArray(data.products)?data.products:[],orders:Array.isArray(data.orders)?data.orders:[],appointments:Array.isArray(data.appointments)?data.appointments:[],messages:Array.isArray(data.messages)?data.messages:[]}}catch{return{accounts:[],products:[],orders:[],appointments:[],messages:[]}}};
  const save=data=>{try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const id=()=>window.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const $=selector=>document.querySelector(selector),readForm=form=>Object.fromEntries(new FormData(form).entries());
  const note=(node,text,error=false)=>{node.textContent=text;node.classList.toggle('error',error)};
  const data=read(),signup=$('#standard-signup'),select=$('#standard-account-select');
  if(!signup||!select)return;
  select.innerHTML=data.accounts.length?'<option value="">Sélectionnez votre profil</option>'+data.accounts.map(account=>`<option value="${esc(account.id)}">${esc(account.name)} · ${esc(account.email)}</option>`).join(''):'<option value="">Aucun profil standard</option>';
  signup.addEventListener('submit',event=>{event.preventDefault();const form=readForm(signup),email=form.email.trim().toLocaleLowerCase('fr');if(data.accounts.some(account=>account.email===email)){note($('#signup-feedback'),'Un profil utilise déjà cet e-mail. Retrouvez-le dans la section « Déjà inscrit ».',true);return;}const account={id:id(),name:form.name.trim(),email,phone:form.phone.trim(),city:form.city.trim(),createdAt:new Date().toISOString()};data.accounts.push(account);if(!save(data)){note($('#signup-feedback'),'Impossible de conserver ce profil dans le navigateur. Ouvrez le site sur localhost.',true);return;}localStorage.setItem(sessionKey,account.id);window.location.href='espace-standard.html'});
  $('#standard-login').addEventListener('submit',event=>{event.preventDefault();const account=data.accounts.find(item=>item.id===select.value);if(!account){note($('#login-feedback'),'Sélectionnez un compte standard déjà enregistré.',true);return;}localStorage.setItem(sessionKey,account.id);window.location.href='espace-standard.html'});
})();
