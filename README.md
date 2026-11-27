# Ordolio — site de suivi des ordonnances

Ordolio est un site web en français avec une page d’accueil, un choix d’espace, des pages séparées pour les professionnels de santé et l’administration, et un espace client standard.

**Le projet démarre sans médecin, sans compte et sans ordonnance préchargés.** Les personnes qui utiliseront le site saisissent elles-mêmes leurs informations.

## Parcours

1. Ouvrez `index.html` pour découvrir le site.
2. Cliquez sur « Accéder à mon espace » pour ouvrir `acces.html`.
3. Choisissez `medecin.html` ou `administrateur.html`.
4. En démonstration, l’administrateur ajoute les profils dans **Gestion de l’équipe**. Le médecin choisit un profil existant ou crée le sien avant son premier envoi.
5. Les médecins, infirmiers et sages-femmes disposent du parcours professionnel. L’administrateur choisit leur profession lors de la saisie d’un compte.
6. Le grand public ouvre `compte-standard.html` pour créer ou retrouver un profil local, puis utilise `espace-standard.html` pour consulter le catalogue, demander un rendez-vous, commander ou contacter l’équipe.
7. `gestion-catalogue.html` permet à l’administrateur d’ajouter et publier des produits, puis de traiter les demandes de commande, de rendez-vous et de renseignements.
8. Avec Supabase, l’administrateur invite les comptes professionnels et chaque personne se connecte avec son compte. Le raccordement des nouveaux rôles (infirmier, sage-femme, compte standard), du catalogue, des demandes et des paiements doit être ajouté au back-end.

La page d’accueil reprend des codes de présentation observés sur cefonaf.com : bandeau d’information, navigation par rubriques, appels à l’action, sections de présentation, repères chiffrés, FAQ, pied de page organisé et aide flottante. Ils ont été réinterprétés pour le suivi des ordonnances; les rubriques commerciales et de conseil santé du site de référence ne sont pas reprises. L’accueil comporte aussi un symbole médical illustré en SVG, des animations discrètes, une transition entre les pages et une aide d’orientation. Les animations se désactivent lorsque le navigateur préfère la réduction des mouvements.

## Espaces

### Administrateur

- Vue d’ensemble qui reste vide tant qu’aucun envoi n’a été saisi.
- Annuaire de médecins avec invitation/création de profil, recherche et suspension/réactivation.
- Soumissions avec recherche, filtres de statut et de dates, pagination et export CSV.
- Examen des images, validation ou refus avec motif destiné au médecin.
- Notifications des nouveaux envois et des décisions.
- Estimation des rémunérations : 200 FCFA par ordonnance validée, total par professionnel et montant à régler.
- Accès à la gestion du catalogue, des commandes et des rendez-vous.

### Médecin

- Création ou sélection du profil médecin.
- Envoi JPEG, PNG ou HEIC jusqu’à 10 Mo, aperçu et retrait avant envoi.
- Note facultative avec compteur et rappel de confidentialité.
- Historique avec filtres par dates et statut, pagination et motifs de refus.
- Notifications de décision.
- Solde estimé d’après les validations, avec le gain du jour et l’historique quotidien.

### Compte standard

- Création ou reprise d’un profil client de démonstration.
- Consultation du catalogue publié par l’administrateur et demandes de commande.
- Demande de rendez-vous et suivi du statut.
- Envoi de renseignements et lecture d’informations générales de service.

## Mode local et mode Supabase

Le mode local commence avec des tableaux vides. Les profils, produits et demandes sont ajoutés par les utilisateurs et mémorisés dans le navigateur, sur cet appareil. Les photos ne sont pas conservées ou partagées entre les pages en mode local. Le solde affiche uniquement une estimation à verser selon les ordonnances validées; aucun paiement n’est initié ou enregistré. Les formulaires client sont des demandes à confirmer : aucun paiement en ligne, stock synchronisé ou rendez-vous confirmé n’est fourni. Utilisez des données fictives; ne saisissez pas d’informations réelles de patient.

Pour les comptes réels, les invitations, le partage des photos et la synchronisation entre appareils, suivez `SUPABASE_SETUP.md`, configurez `supabase-config.js` et hébergez le site en HTTPS ou sur `localhost`.

## Fichiers principaux

- `index.html` : page d’accueil.
- `acces.html` : choix du rôle.
- `connexion.html` et `compte-standard.html` : accès et profil client standard de démonstration.
- `espace-standard.html` : catalogue, commandes, rendez-vous, informations et contact client.
- `gestion-catalogue.html` : gestion locale des produits et des demandes.
- `administrateur.html` et `medecin.html` : pages dédiées.
- `styles.css` et `site.js` : présentation responsive, transitions et animations.
- `app.js` : démonstration locale sans données initiales.
- `standard-app.js`, `compte-standard.js` et `gestion-catalogue.js` : fonctionnalités client et services en mode local.
- `supabase-app.js` : authentification et synchronisation.
- `supabase-schema.sql` : schéma, règles d’accès et notifications.
- `supabase/functions/invite-doctor/index.ts` : invitations de compte côté serveur.
- `SUPABASE_SETUP.md` : configuration et vérifications de mise en service.

## Sécurité et conservation

Le prototype n’est pas certifié pour traiter des ordonnances réelles. Le schéma prépare des règles d’accès, un horodatage de décision et un stockage privé, mais aucune purge automatique des images n’est configurée. Le tarif de 200 FCFA est un paramètre de démonstration; aucun versement n’est effectué ni suivi comme payé. Faites valider le cadre de rémunération des professionnels, l’hébergement, les politiques d’accès, l’authentification, les moyens de paiement et les durées de conservation avant tout usage réel. Évitez toute rémunération qui pourrait influencer une décision clinique ou le choix d’un médicament.
