# Ordolio — site de suivi des ordonnances

Ordolio est un site web en français avec une page d’accueil, un choix d’espace et deux pages séparées pour les médecins et l’administration.

> Le mode démonstration utilise des données fictives. Ne saisissez pas d’informations réelles de patient.

## Parcours du site

1. Ouvrez `index.html` pour découvrir Ordolio.
2. Cliquez sur « Accéder à mon espace » pour ouvrir `acces.html`.
3. Choisissez l’espace médecin (`medecin.html`) ou administrateur (`administrateur.html`).
4. Dans la version Supabase, connectez-vous avec le compte attribué. Le rôle du compte ouvre automatiquement la bonne page.

La page d’accueil comporte un symbole médical illustré en SVG, des animations discrètes et une transition entre les pages. Les animations se désactivent lorsque le navigateur est réglé sur la réduction des mouvements.

## Fonctionnalités

### Administrateur

- Tableau de bord et activité mensuelle.
- Annuaire de médecins, invitation sécurisée, recherche et suspension/réactivation de comptes.
- Soumissions avec recherche, filtres de statut et de dates, pagination et export CSV.
- Examen des images, validation ou refus avec motif destiné au médecin.
- Notifications des nouveaux envois et des décisions.

### Médecin

- Envoi JPEG, PNG ou HEIC jusqu’à 10 Mo, aperçu, retrait du fichier avant envoi et validation du type.
- Note facultative avec compteur et rappel de confidentialité.
- Historique avec filtres par dates et statut, pagination et motifs de refus.
- Notifications de décision.

### Fichiers principaux

- `index.html` : page d’accueil.
- `acces.html` : choix du rôle.
- `administrateur.html` et `medecin.html` : pages dédiées.
- `styles.css` et `site.js` : présentation responsive, transitions et animations.
- `app.js` : données fictives et démonstration locale.
- `supabase-app.js` : authentification et synchronisation.
- `supabase-schema.sql` : schéma, règles d’accès et notifications.
- `supabase/functions/invite-doctor/index.ts` : invitations de compte côté serveur.
- `SUPABASE_SETUP.md` : configuration et vérifications de mise en service.

## Démarrage

Ouvrez `index.html` dans un navigateur récent. Le mode démonstration est temporaire : les envois disparaissent au rechargement. Pour activer les comptes, les invitations et la synchronisation, suivez `SUPABASE_SETUP.md`, configurez `supabase-config.js` et hébergez le site en HTTPS ou sur `localhost`.

## Sécurité et conservation

Le prototype n’est pas certifié pour traiter des ordonnances réelles. Le schéma prépare des règles d’accès et un stockage privé, mais aucune purge automatique des images n’est configurée. Faites valider l’hébergement, les politiques d’accès et la durée de conservation, puis configurez une purge conforme avant tout usage réel.
