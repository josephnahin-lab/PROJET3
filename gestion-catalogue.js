(() => {
  const key='ordolio-services-v1';
  const read=()=>{try{const value=JSON.parse(localStorage.getItem(key)||'{}');return{accounts:Array.isArray(value.accounts)?value.accounts:[],products:Array.isArray(value.products)?value.products:[],orders:Array.isArray(value.orders)?value.orders:[],appointments:Array.isArray(value.appointments)?value.appointments:[],messages:Array.isArray(value.messages)?value.messages:[]}}catch{return{accounts:[],products:[],orders:[],appointments:[],messages:[]}}};
  const save=data=>{try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const id=()=>window.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const $=selector=>document.querySelector(selector);
  const data=read();
  const money=value=>`${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
  const feedback=(message,error=false)=>{const node=$('#catalog-feedback');node.textContent=message;node.classList.toggle('error',error)};
  function renderCatalog(){
    $('#catalog-count').textContent=String(data.products.filter(item=>item.published!==false).length);
    $('#admin-catalog-list').innerHTML=data.products.length?data.products.map(item=>`<div class="catalog-admin-row"><span><b>${esc(item.name)}</b><small>${esc(item.category)} · ${money(item.price)} · ${item.published?'Publié':'Masqué'}</small></span><span class="catalog-row-actions"><button type="button" data-toggle-product="${esc(item.id)}">${item.published?'Masquer':'Publier'}</button><button type="button" data-delete-product="${esc(item.id)}">Retirer</button></span></div>`).join(''):'<p class="empty-state">Aucun produit. Ajoutez les informations validées par votre établissement.</p>';
    $('#admin-catalog-list').querySelectorAll('[data-toggle-product]').forEach(button=>button.addEventListener('click',()=>{const item=data.products.find(row=>row.id===button.dataset.toggleProduct);item.published=!item.published;save(data);renderCatalog()}));
    $('#admin-catalog-list').querySelectorAll('[data-delete-product]').forEach(button=>button.addEventListener('click',()=>{const item=data.products.find(row=>row.id===button.dataset.deleteProduct);if(!item)return;if(!window.confirm(`Retirer « ${item.name} » du catalogue ?`))return;data.products=data.products.filter(row=>row.id!==item.id);save(data);renderCatalog()}));
  }
  $('#catalog-form').addEventListener('submit',event=>{event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget).entries());data.products.unshift({id:id(),name:form.name.trim(),category:form.category.trim(),price:Number(form.price),availability:form.availability.trim(),description:form.description.trim(),published:event.currentTarget.elements.published.checked,createdAt:new Date().toISOString()});if(!save(data)){feedback('Produit non enregistré. Vérifiez le stockage local.',true);return;}event.currentTarget.reset();event.currentTarget.elements.published.checked=true;feedback('Produit ajouté au catalogue local.');renderCatalog()});
  function renderRequests(kind){
    const isOrder=kind==='order',list=data[isOrder?'orders':'appointments'];
    const search=$(isOrder?'#order-admin-search':'#appointment-admin-search').value.trim().toLocaleLowerCase('fr');
    const status=$(isOrder?'#order-admin-status':'#appointment-admin-status').value;
    const container=$(isOrder?'#admin-order-list':'#admin-appointment-list');
    const rows=list.filter(item=>`${item.name} ${item.contact} ${isOrder?item.items.map(product=>product.name).join(' '):item.service}`.toLocaleLowerCase('fr').includes(search)&&(status==='all'||item.status===status));
    if(!rows.length){container.innerHTML=`<p class="empty-state">${list.length?'Aucune demande ne correspond à ces filtres.':isOrder?'Aucune demande de commande.':'Aucune demande de rendez-vous.'}</p>`;return;}
    const options=isOrder?['Reçue','À confirmer','Prête','Remise','Annulée']:['Reçue','À confirmer','Confirmée','Terminée','Annulée'];
    container.innerHTML=rows.map(item=>`<article class="request-row request-row-full"><span><b>${esc(item.name)} · ${esc(item.contact)}</b><small>${isOrder?`${esc(item.items.map(product=>`${product.name} × ${product.quantity||1}`).join(', '))} · ${money(item.total)} · ${esc(item.fulfillment)}`:`${esc(item.service)} · souhaité le ${esc(item.date)}${item.note?` · ${esc(item.note)}`:''}`}</small><small>Reçue le ${new Date(item.createdAt).toLocaleString('fr-FR')}</small></span><label class="request-status-label">Statut<select data-status-kind="${kind}" data-status-id="${esc(item.id)}">${options.map(option=>`<option ${item.status===option?'selected':''}>${option}</option>`).join('')}</select></label></article>`).join('');
    container.querySelectorAll('[data-status-id]').forEach(select=>select.addEventListener('change',()=>{const source=select.dataset.statusKind==='order'?data.orders:data.appointments;const item=source.find(row=>row.id===select.dataset.statusId);if(item){item.status=select.value;item.updatedAt=new Date().toISOString();save(data);renderRequests(select.dataset.statusKind)}}));
  }
  $('#order-admin-search').addEventListener('input',()=>renderRequests('order'));$('#order-admin-status').addEventListener('change',()=>renderRequests('order'));
  $('#appointment-admin-search').addEventListener('input',()=>renderRequests('appointment'));$('#appointment-admin-status').addEventListener('change',()=>renderRequests('appointment'));
  function renderClients(){
    $('#admin-client-list').innerHTML=data.accounts.length?data.accounts.map(account=>`<div class="catalog-admin-row"><span><b>${esc(account.name)}</b><small>${esc(account.email)} · ${esc(account.phone||'')} · ${esc(account.city||'')}</small></span></div>`).join(''):'<p class="empty-state">Aucun compte standard.</p>';
    $('#admin-message-list').innerHTML=data.messages.length?data.messages.map(item=>`<div class="request-row request-row-full"><span><b>${esc(item.name)} · ${esc(item.contact)}</b><small>${esc(item.message)}</small><small>${new Date(item.createdAt).toLocaleString('fr-FR')}</small></span><label class="request-status-label">Statut<select data-message-id="${esc(item.id)}"><option ${item.status==='Reçue'?'selected':''}>Reçue</option><option ${item.status==='Traitée'?'selected':''}>Traitée</option></select></label></div>`).join(''):'<p class="empty-state">Aucun message reçu.</p>';
    $('#admin-message-list').querySelectorAll('[data-message-id]').forEach(select=>select.addEventListener('change',()=>{const message=data.messages.find(item=>item.id===select.dataset.messageId);if(message){message.status=select.value;save(data);renderClients()}}));
  }
  renderCatalog();renderRequests('order');renderRequests('appointment');renderClients();
})();
