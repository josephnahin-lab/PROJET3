(() => {
  const spaces={
    medecin:{name:'Espace médecin',profession:'Médecin',page:'medecin.html'},
    infirmier:{name:'Espace infirmier',profession:'Infirmier / infirmière',page:'infirmier.html'},
    'sage-femme':{name:'Espace sage-femme',profession:'Sage-femme / maïeuticien',page:'sage-femme.html'},
    pharmacie:{name:'Espace pharmacie',profession:'Pharmacien / pharmacienne',page:'pharmacie.html'},
    administrateur:{name:'Espace administrateur',page:'administrateur.html'},
    client:{name:'Compte client standard',page:'espace-standard.html'}
  };
  const key=new URLSearchParams(location.search).get('espace')||'client';
  const space=spaces[key]||spaces.client;
  document.title=`YNNOVIX — ${space.name}`;
  document.querySelector('#space-kicker').textContent=space.name.toLocaleUpperCase('fr');
  document.querySelector('#space-title').innerHTML=`${space.name}<br/><em>YNNOVIX.</em>`;
  document.querySelector('#space-copy').textContent=key==='client'?'Pour acheter, prendre rendez-vous ou demander un renseignement, connectez-vous ou créez votre compte client.':'Ouvrez votre espace ou créez votre profil professionnel.';
  const connect=document.querySelector('#sign-in-link'),signup=document.querySelector('#sign-up-link'),note=document.querySelector('#auth-choice-note');
  connect.href=key==='client'?'compte-standard.html#connexion':space.page;
  signup.href=key==='client'?'compte-standard.html#inscription':`${space.page}#doctor-profile-setup`;
  if(key==='administrateur'){
    signup.classList.add('hidden');
    document.querySelector('.auth-choice-grid').classList.add('admin-only-choice');
    note.innerHTML='<span>◈</span> L’accès administrateur est réservé aux comptes créés par l’organisation.';
  }else if(key==='client'){
    note.innerHTML='<span>◈</span> Le compte standard donne accès au catalogue, aux commandes, aux rendez-vous, aux informations et au contact d’un professionnel.';
  }else{
    note.innerHTML=`<span>◈</span> En démonstration, le profil ${space.profession} est local et n’est pas sécurisé. L’authentification et la vérification professionnelle seront raccordées au back-end.`;
  }
})();
