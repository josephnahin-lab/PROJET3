(() => {
  const key='ordolio-services-v1',sessionKey='ordolio-standard-account';
  const read=()=>{try{const data=JSON.parse(localStorage.getItem(key)||'{}');return{accounts:Array.isArray(data.accounts)?data.accounts:[],products:Array.isArray(data.products)?data.products:[],orders:Array.isArray(data.orders)?data.orders:[],appointments:Array.isArray(data.appointments)?data.appointments:[],messages:Array.isArray(data.messages)?data.messages:[]}}catch{return{accounts:[],products:[],orders:[],appointments:[],messages:[]}}};
  const save=data=>{try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const id=()=>window.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const $=selector=>document.querySelector(selector),data=read();
  const formData=form=>Object.fromEntries(new FormData(form).entries());
  const message=(node,text,error=false)=>{node.textContent=text;node.classList.toggle('error',error)};
  const money=value=>`${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
  const accountId=localStorage.getItem(sessionKey)||'';
  const account=data.accounts.find(item=>item.id===accountId);
  if(account){$('#client-greeting').textContent=`Bienvenue, ${account.name.split(' ')[0]}.`;$('#client-account-link').textContent='Mon compte';$('#client-account-link').href='compte-standard.html';$('#order-name').value=account.name;$('#order-contact').value=account.phone||account.email;}
  let cart=[];
  const category=$('#product-category'),search=$('#product-search');
  const categories=[...new Set(data.products.filter(item=>item.published!==false).map(item=>item.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  category.innerHTML='<option value="all">Toutes catégories</option>'+categories.map(item=>`<option value="${esc(item)}">${esc(item)}</option>`).join('');
  function renderProducts(){
    const query=search.value.trim().toLocaleLowerCase('fr'),selected=category.value;
    const all=data.products.filter(item=>item.published!==false);
    const products=all.filter(item=>(!query||`${item.name} ${item.category} ${item.description}`.toLocaleLowerCase('fr').includes(query))&&(selected==='all'||item.category===selected));
    $('#product-grid').innerHTML=products.length?products.map(item=>`<article class="product-card"><span class="product-mark">◈</span><h3>${esc(item.name)}</h3><p>${esc(item.description||item.availability||'Informations et disponibilité à confirmer auprès de l’équipe.')}</p><b class="product-price">${money(Number(item.price)||0)}</b><small class="product-availability">${esc(item.availability||'Disponibilité à confirmer')}</small><button type="button" data-add-product="${esc(item.id)}">Ajouter à ma demande</button></article>`).join(''):`<div class="empty-catalog"><b>${all.length?'Aucun produit ne correspond à votre recherche':'Le catalogue est en préparation'}</b><p>${all.length?'Essayez un autre nom ou une autre catégorie.':'Les produits apparaîtront après leur ajout par l’équipe. Aucun médicament n’est préenregistré dans cette démonstration.'}</p></div>`;
    document.querySelectorAll('[data-add-product]').forEach(button=>button.addEventListener('click',()=>{const item=data.products.find(product=>product.id===button.dataset.addProduct);if(item){cart.push({id:item.id,name:item.name,price:Number(item.price)||0});renderCart()}}));
  }
  function renderCart(){$('#cart-summary').textContent=cart.length?`${cart.length} article${cart.length===1?'':'s'} · ${money(cart.reduce((sum,item)=>sum+item.price,0))} estimés`:'Aucun produit sélectionné.';$('#order-form button').disabled=!cart.length}
  function renderHistory(){
    const belongs=item=>!account||item.accountId===account.id;
    const orders=data.orders.filter(belongs),appointments=data.appointments.filter(belongs);
    $('#client-orders').innerHTML=orders.length?orders.map(item=>`<div class="request-row"><span><b>${esc(item.items.map(product=>product.name).join(', '))}</b><small>${new Date(item.createdAt).toLocaleString('fr-FR')} · ${money(item.total)} · ${esc(item.status)}</small></span></div>`).join(''):'<p class="empty-state">Aucune demande enregistrée.</p>';
    $('#client-appointments').innerHTML=appointments.length?appointments.map(item=>`<div class="request-row"><span><b>${esc(item.service)}</b><small>${esc(item.date)} · ${esc(item.status)}</small></span></div>`).join(''):'<p class="empty-state">Aucune demande enregistrée.</p>';
  }
  search.addEventListener('input',renderProducts);category.addEventListener('change',renderProducts);renderProducts();renderCart();renderHistory();
  $('#order-form').addEventListener('submit',event=>{event.preventDefault();if(!cart.length){message($('#order-feedback'),'Ajoutez d’abord un article au panier.',true);return;}const form=formData(event.currentTarget);data.orders.unshift({id:id(),accountId,name:form.name.trim(),contact:form.contact.trim(),fulfillment:form.fulfillment,items:[...cart],total:cart.reduce((sum,item)=>sum+item.price,0),status:'Reçue',createdAt:new Date().toISOString()});if(!save(data)){message($('#order-feedback'),'Demande non enregistrée. Vérifiez le stockage local.',true);return;}cart=[];event.currentTarget.reset();if(account){$('#order-name').value=account.name;$('#order-contact').value=account.phone||account.email;}renderCart();message($('#order-feedback'),'Demande enregistrée localement. Elle reste à confirmer par l’équipe.');renderHistory()});
  const today=new Date(),dateInput=$('#appointment-form input[name="date"]');dateInput.min=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  $('#appointment-form').addEventListener('submit',event=>{event.preventDefault();const form=formData(event.currentTarget);data.appointments.unshift({id:id(),accountId,name:form.name.trim(),contact:form.contact.trim(),service:form.service,date:form.date,note:form.note.trim(),status:'Reçue',createdAt:new Date().toISOString()});if(!save(data)){message($('#appointment-feedback'),'Demande non enregistrée. Vérifiez le stockage local.',true);return;}event.currentTarget.reset();message($('#appointment-feedback'),'Demande enregistrée. L’équipe devra vous confirmer le créneau.');renderHistory()});
  $('#contact-form').addEventListener('submit',event=>{event.preventDefault();const form=formData(event.currentTarget);data.messages.unshift({id:id(),accountId,name:form.name.trim(),contact:form.contact.trim(),message:form.message.trim(),status:'Reçue',createdAt:new Date().toISOString()});if(!save(data)){message($('#contact-feedback'),'Message non enregistré. Vérifiez le stockage local.',true);return;}event.currentTarget.reset();message($('#contact-feedback'),'Votre demande est enregistrée dans cette démonstration locale.')});
  $('#client-logout').addEventListener('click',()=>{localStorage.removeItem(sessionKey);window.location.href='compte-standard.html'});
})();
