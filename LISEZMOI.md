# Étude de cas « Tout est prioritaire » – version en ligne

Quatre pages web autonomes (aucun service tiers, aucune donnée envoyée) :

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil : mission, déroulé de la séance, accès aux trois supports |
| `dossier.html` | Plaquette Orvane et Doc. 1 à 7, avec suivi de lecture |
| `fiche.html` | Fiche de travail à remplir en ligne (enregistrement automatique, export, import, impression) |
| `aide-memoire.html` | Aide-mémoire d'une page, imprimable |

`assets/` contient la feuille de style, le script et les polices (Barlow) ; `sw.js` permet de rouvrir les pages sans réseau.

## Mise en ligne sur GitHub Pages

1. Copiez le dossier `gestion-priorites` tel quel dans le dépôt de votre portail (gardez l'arborescence : `assets/` et `sw.js` doivent rester à côté des pages).
2. Validez (commit) et publiez. Les pages sont alors accessibles à l'adresse `https://<compte>.github.io/<dépôt>/gestion-priorites/`.
3. Ouvrez la page une première fois avec du réseau : c'est ce qui permet ensuite de la rouvrir hors ligne.
4. Distribuez l'adresse (ou un QR code) aux participants.

## Ce qu'il ne faut pas publier

Le **corrigé formateur** et la **grille d'évaluation** ne sont pas dans ce dossier, volontairement. Un site GitHub Pages est lisible par toute personne qui connaît l'adresse : gardez le corrigé sur OneDrive, en accès privé. Les pages portent une balise « noindex » (les moteurs de recherche sont invités à ne pas les référencer), mais cela ne remplace pas un accès protégé.

## Où vont les réponses

Dans le navigateur de l'appareil du participant (stockage local), et nulle part ailleurs. Conséquences :

- Une coupure de connexion ne fait rien perdre : la page continue de fonctionner et d'enregistrer.
- Les réponses disparaissent si le participant vide les données du navigateur, utilise la navigation privée ou change d'appareil. Le bouton **Exporter** crée un fichier de secours (`.json` pour reprendre le travail, `.txt` pour le lire ou l'envoyer). La fiche rappelle d'exporter après 15 minutes.
- L'étape 5 est personnelle : à l'export, la case « Inclure l'étape 5 » est décochée par défaut pour le texte.
- Pour récupérer les productions, demandez aux groupes de déposer leur fichier exporté dans un dossier OneDrive de collecte.
- Plusieurs personnes ne peuvent pas éditer la même fiche en direct. Pour un travail de groupe simultané, utilisez la fiche Word (`.docx`) en ligne sur OneDrive, une copie par groupe.

## Après une modification

Si vous modifiez une page ou le style, ouvrez `sw.js` et changez le numéro de version sur la ligne `var CACHE = 'orvane-priorites-v1';` (par exemple `v2`). Les appareils déjà connectés récupèrent alors la nouvelle version.

## Plan B si le site est bloqué

Certains réseaux d'entreprise bloquent `github.io`. Gardez sous la main les versions Word ou PDF du dossier et de la fiche.
