# Configuration Supabase d’Ordolio

## 1. Projet et base de données

1. Créez un projet Supabase.
2. Dans le SQL Editor, exécutez `supabase-schema.sql`. Le script inclut les colonnes pour les comptes actifs, les motifs de décision, les notifications et l’horodatage des décisions. Il peut aussi ajouter ces éléments à une installation existante.
3. Dans `supabase-config.js`, renseignez l’URL du projet et la clé publique du navigateur (`anon`/publishable). N’y placez jamais une clé secrète ou `service_role`.
4. Hébergez l’application en HTTPS (ou utilisez `localhost` en développement). Le SDK Supabase est chargé depuis jsDelivr.

## 2. Première administratrice

Créez d’abord le compte qui servira d’administrateur, puis attribuez-lui le rôle dans le SQL Editor en remplaçant l’adresse :

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Les espaces médecin et administrateur sont déjà prévus dans cette configuration. Les rôles infirmier et sage-femme, les comptes standard, le catalogue, les demandes de commande et de rendez-vous, ainsi que l’authentification client devront être ajoutés au schéma et aux règles d’accès avant leur synchronisation réelle. En mode front-end local, ces profils et demandes ne sont pas authentifiés.

## 3. Fonction sécurisée d’invitation

La création d’un utilisateur Auth nécessite une clé secrète et ne doit pas être exécutée dans le navigateur. La fonction `supabase/functions/invite-doctor/index.ts` vérifie la session et le rôle administrateur, puis envoie l’invitation depuis le serveur.

Avec la CLI Supabase installée et liée au projet :

```text
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<clé secrète du projet>
supabase functions deploy invite-doctor
```

Définissez la valeur secrète uniquement dans les secrets du projet Supabase. Ne la mettez pas dans `supabase-config.js`, dans l’application web ni dans le dépôt. La plateforme fournit `SUPABASE_URL` et `SUPABASE_ANON_KEY` à la fonction. Configurez aussi le modèle d’e-mail d’invitation et les URL de redirection autorisées dans Supabase Auth.

## 4. Vérifications de mise en service

- Connectez-vous avec un administrateur et un compte médecin distincts.
- Vérifiez l’invitation, la réception de l’e-mail et la création du profil médecin.
- Testez l’envoi d’une image, le refus avec motif, la notification reçue et la suspension/réactivation d’un compte.
- Vérifiez qu’un médecin ne voit que ses soumissions et ses notifications, tandis que l’administrateur voit les données de l’équipe.
- Testez les filtres de dates, les filtres de statut, la pagination et l’export CSV.
- Avant d’afficher un solde réel, vérifiez la date de validation (`reviewed_at`) et le calcul du montant dû. Le front-end estime actuellement 200 FCFA par ordonnance validée; il n’enregistre ni paiement ni preuve de virement.
- Ajoutez au back-end un registre de paiements immuable, les règles de rapprochement et les contrôles d’accès avant d’utiliser l’estimation comme solde officiel.
- Configurez les produits, stocks, demandes client, rendez-vous et notifications côté serveur; les versions actuelles de ces fonctions ne sont stockées que dans le navigateur.

## Données de santé et conservation

Cette application est un prototype et n’est pas certifiée pour traiter des données de santé. Avant tout usage réel, faites vérifier par des spécialistes compétents le cadre réglementaire applicable, l’hébergement requis, les contrats et sous-traitants, le chiffrement, la gestion des clés, les durées de conservation, l’effacement des images, la journalisation des accès et la procédure en cas d’incident. Utilisez des ordonnances fictives pendant les essais.

## Conservation des images

Le prototype ne supprime pas automatiquement les photos après une durée définie. Avant l’ouverture à des données réelles, adoptez une durée de conservation validée, puis ajoutez une tâche serveur de purge qui supprime les lignes et les objets du bucket, consigne son exécution et respecte les exigences de conservation applicables. Vérifiez aussi les sauvegardes, qui peuvent avoir leur propre durée de rétention.

## Pages du site

La page publique d’entrée est `index.html`. `acces.html` propose les trois parcours. Les espaces dédiés sont `administrateur.html`, `medecin.html` et `espace-standard.html`. `compte-standard.html` et `connexion.html` présentent les interfaces de compte. `gestion-catalogue.html` gère les produits et demandes en mode local. Avec Supabase activé, les pages professionnelles redirigent vers l’espace correspondant au rôle actuellement pris en charge. Ajoutez les URL de votre site aux URL de redirection autorisées de Supabase Auth.
