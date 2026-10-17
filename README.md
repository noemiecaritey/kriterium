# kriterium

Un agenda plus complexe, mobile first : des widgets que tu poses où tu veux sur l'accueil, un calendrier,
des listes, des projets, et une œuvre d'art du Met Museum à gagner à chaque tâche terminée.

Le style (typo Lineal, couleurs, dégradés, calendrier sombre) vient de la maquette Figma.

## Lancer l'app

```bash
npm install
npm run dev        # http://localhost:5173 (et l'adresse réseau pour tester sur ton téléphone)
npm run build      # version de production dans dist/
npm run typecheck  # vérification TypeScript
```

L'app fonctionne **sans compte** : tout est gardé sur l'appareil (localStorage), même après fermeture.
Pour retrouver tes données sur plusieurs appareils, connecte-la à PocketBase (ci-dessous).

## La police Lineal

Dépose `Lineal-Regular.woff2` (ou `.otf`) et, si tu l'as, `Lineal-Italic.woff2` dans `public/fonts/`.
Sans ces fichiers, une police système de repli est utilisée.

## Synchronisation avec PocketBase

1. Télécharge PocketBase (https://pocketbase.io) et mets l'exécutable dans le dossier `pocketbase/` de ce projet.
2. Lance `./pocketbase serve` depuis ce dossier : la migration `pb_migrations/…_items.js` crée la collection `items`
   (compatible PocketBase v0.23 et plus récent). Crée ton compte admin quand il te le demande.
3. Dans l'app : ⚙ Réglages → adresse du serveur (par défaut `http://127.0.0.1:8090`) → « Créer le compte » puis « Se connecter ».

Fonctionnement : chaque modification est d'abord enregistrée localement, puis envoyée en arrière-plan.
Hors ligne, rien n'est perdu : la synchro reprend au retour du réseau. En cas de conflit, la modification la plus récente gagne.
Pour utiliser l'app depuis ton téléphone, PocketBase doit être joignable depuis le téléphone (même Wi-Fi, ou serveur en ligne en HTTPS).

## Connexion avec Google

La connexion Google passe par PocketBase, qui doit être configuré une fois :

1. Sur https://console.cloud.google.com : *APIs et services → Identifiants → Créer des identifiants → ID client OAuth* (type « Application Web »).
   Dans **URI de redirection autorisés**, ajoute l'adresse de l'app **telle quelle, avec le `/` final** :
   - en développement : `http://localhost:5173/` (Google accepte `localhost`, pas une adresse IP du réseau local) ;
   - en ligne : `https://ton-domaine.fr/` (https obligatoire).
2. Dans l'admin de PocketBase : *Collections → users → ⚙ → Options → OAuth2 → Google*, colle l'ID client et le secret.
3. Dans l'app : Réglages → « Continuer avec Google ». Pour se déconnecter : Réglages → « Se déconnecter » (les données restent sur l'appareil).

## Fonctionnalités

- **Accueil à widgets** : au départ le haut est vide. `+` ouvre le catalogue (Aujourd'hui, Transformer en liste, Tâches à reprogrammer,
  Galerie, Projets, Liens et notes, Humeur, Courses, Évènements, Liste épinglée, Météo, Série, Œuvre du jour). « modifier » (ou appui long)
  permet de déplacer, redimensionner (coin), régler (toucher) ou retirer. Une case vide touchée en mode édition y pose un widget.
  Un bouton propose de reprendre la disposition exacte de la maquette.
- **Calendrier** sous chaque page : pastilles pleines = évènements, pastilles creuses = tâches à faire, trait de couleur = humeur, jours fériés en rose.
- **Listes, Projets** (Liste / Notes / Liens / Rendez-vous), **Évènements** (formulaire de la maquette, date choisie dans le calendrier),
  **Humeur** (courbe sur 30 jours), **Courses**, **Tâches à reprogrammer**, **Statistiques** (séries, semaine).
- **Récompenses** : terminer une tâche (la première fois) révèle une œuvre du domaine public du Met Museum, rangée dans la Galerie.
  Sans réseau, la carte est « en attente » et se révèle plus tard.
- **Rappels** : notification avant un évènement (à activer dans Réglages). Sans serveur de push, elles partent quand l'app est ouverte ou vivante en arrière-plan.
- **PWA** : installable sur l'écran d'accueil, ouverture hors ligne.

## APIs utilisées (sans clé)

- Met Museum Open Access — https://metmuseum.github.io/ (même données que le dépôt GitHub `metmuseum/openaccess`)
- Open-Meteo (météo) — https://open-meteo.com
- calendrier.api.gouv.fr (jours fériés)

## Structure

```
src/data/       magasin local d'abord + synchro PocketBase
src/lib/        dates, palette Figma, Met Museum, météo, fériés, rappels, routeur
src/components/ calendrier, grille de widgets, widgets, tâches, récompense
src/pages/      une page par écran
pocketbase/     migration de la collection `items`
```
