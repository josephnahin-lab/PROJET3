# YNNOVIX — site de suivi des ordonnances

YNNOVIX est un site web en français avec une page d’accueil, un choix d’espace, des pages séparées pour les professionnels de santé et l’administration, et un espace client standard.

**Le projet démarre sans médecin, sans compte et sans ordonnance préchargés.** Les personnes qui utiliseront le site saisissent elles-mêmes leurs informations.

## Parcours

1. Ouvrez `index.html` pour découvrir le site.
2. Cliquez sur « Accéder à mon espace » pour ouvrir `acces.html`.
3. Choisissez un espace dans `acces.html` : administrateur, médecin, infirmier, sage-femme, pharmacie ou client/standard. Chaque espace propose la connexion ou la création de compte selon le rôle.
4. En démonstration, les professionnels créent leur profil depuis leur espace; l’administrateur peut aussi ajouter les professionnels et leurs coordonnées dans **Gestion de l’équipe**.
5. Depuis `compte-standard.html`, le client crée ou retrouve son profil local. `espace-standard.html` rassemble le catalogue, les demandes de commande, les rendez-vous, les conseils généraux, les informations et le contact d’un professionnel.
6. `gestion-catalogue.html` permet à l’administrateur d’ajouter des produits et leurs images, puis de suivre les demandes de commande, de rendez-vous et de renseignements.
7. Les espaces médecin, infirmier, sage-femme et pharmacie permettent de transmettre une photo d’ordonnance. L’administrateur examine les envois, valide ou refuse avec un motif, puis suit les historiques et les comptes.
8. Avec Supabase, le parcours actuel est prévu pour l’administration et le médecin. Le raccordement des autres rôles, des services clients, des paiements et de la comptabilité partagée reste à développer côté back-end.

L’espace client reprend une organisation de services inspirée de cefonaf.com : accès aux produits, informations et conseils, contact et inscription. Il est adapté à YNNOVIX et ne reprend pas les affirmations médicales ni les services financiers du site de référence. L’accueil utilise un bandeau d’information, une navigation par rubriques, des appels à l’action, des sections de présentation, des repères chiffrés, une FAQ, un pied de page organisé et une aide flottante. Il comporte aussi un symbole médical illustré en SVG, des animations discrètes et des transitions; les animations se désactivent si le navigateur demande une réduction des mouvements.

## Espaces

### Administrateur

- Vue d’ensemble qui reste vide tant qu’aucun envoi n’a été saisi.
- Annuaire des professionnels (médecins, infirmiers, sages-femmes et pharmacie) avec création de profil, recherche, coordonnées et suspension/réactivation.
- Soumissions avec recherche, filtres de statut et de dates, pagination et export CSV.
- Examen des images, validation ou refus avec motif destiné au médecin.
- Notifications des nouveaux envois et des décisions.
- Suivi local des rémunérations : 200 FCFA par ordonnance validée, gains du jour, historique quotidien, paiements enregistrés par l’administrateur (montant, moyen et référence), solde à régler par professionnel et indicateurs mensuels.
- Fiche détaillée par professionnel, historique imprimable/enregistrable en PDF et préparation d’un e-mail de partage.
- Accès à la gestion du catalogue, des commandes et des rendez-vous.

### Espaces professionnels

- Un parcours séparé pour le médecin, l’infirmier, la sage-femme et la pharmacie; création ou sélection du profil correspondant.
- Envoi JPEG, PNG ou HEIC jusqu’à 10 Mo, aperçu et retrait avant envoi.
- Note facultative avec compteur et rappel de confidentialité.
- Historique avec filtres par dates et statut, pagination et motifs de refus.
- Notifications de décision.
- Solde estimé à 200 FCFA par validation, avec gains du jour, paiements enregistrés, historique quotidien, contacts saisis par le professionnel, export imprimable/PDF et préparation d’un e-mail.

### Compte standard

- Création ou reprise d’un profil client de démonstration.
- Consultation du catalogue publié par l’administrateur et demandes de commande.
- Demande de rendez-vous et suivi du statut.
- Envoi de renseignements et lecture d’informations générales de service.
- Conseils et informations générales d’orientation, sans diagnostic ni prescription automatisés.

## Mode local et mode Supabase

Le mode local commence avec des tableaux vides : aucun professionnel, client, produit, paiement, historique, commande ou rendez-vous n’est préchargé. Les profils, produits et demandes sont ajoutés par les utilisateurs et mémorisés dans le navigateur. Les photos de prescription ne sont pas partagées entre les pages en mode local. Le solde est calculé selon les validations; l’administrateur peut inscrire un paiement dans le registre local, mais aucun transfert d’argent n’est réalisé. Les formulaires client sont des demandes à confirmer : aucun paiement en ligne, stock synchronisé ou rendez-vous confirmé n’est fourni. Utilisez uniquement des données fictives; ne saisissez aucune donnée médicale ou coordonnée réelle dans cette démonstration.

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

Le prototype n’est pas certifié pour traiter des ordonnances réelles. Les paiements sont seulement consignés dans le navigateur local et ne sont ni vérifiés ni transférés. Le schéma Supabase prépare certaines règles d’accès, un horodatage de décision et un stockage privé, mais l’application complète des rôles, la synchronisation financière et la purge automatique des images restent à concevoir. Faites valider le cadre de rémunération des professionnels, l’hébergement, les politiques d’accès, l’authentification, les moyens de paiement et les durées de conservation avant tout usage réel. Toute rémunération doit être encadrée pour ne jamais influencer une décision clinique ni le choix d’un médicament.
