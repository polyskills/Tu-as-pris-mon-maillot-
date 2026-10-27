# Tri de la base d'articles

Décisions prises catégorie par catégorie, à appliquer dans `src/domain/catalogue.ts` une fois le tri terminé.

## Changements de fond (validés)

1. **Zone du voyage** : remplacer « À l'étranger oui/non » par **France / Europe / Hors Europe**.
2. **Suggestions** : des articles proposés en bas de liste, ajoutés d'un tap, au lieu d'être mis d'office.

## Papiers (validé)

| Article | Décision |
|---|---|
| Carte d'identité | Adultes toujours ; enfants si avion ou hors France |
| Passeport | Hors Europe |
| Carte Vitale | Adultes seulement |
| Carte européenne d'assurance maladie | Europe |
| Carte d'embarquement / billet de train | Inchangé |
| Carte bancaire | Adultes seulement |
| Permis, carnet de santé, ordonnance, réservations, clés, forfaits de ski | Inchangé |
| Assurance voyage | Hors France |
| Carte grise + attestation | Renommer « Carte grise » ; ajouter « Carte internationale d'assurance auto » hors Europe + voiture |
| Espèces + devises | Fusionner en « Espèces / devises » |
| Autorisation de sortie du territoire | Supprimer (inutile si l'enfant voyage avec un parent) |
| Badge télépéage | Supprimer (→ suggestion) |

## Vêtements (validé)

| Article | Décision |
|---|---|
| Sous-vêtements | Adultes : 1 par jour. Enfants : 1 par jour + 2 |
| Chaussettes | Au chaud : 1 pour 2 jours. Sinon 1 par jour |
| T-shirts / hauts | Adultes : 1 par jour. Enfants : 1,5 par jour |
| Pyjama | 2 (1 si 3 nuits ou moins) |
| Pull / sweat | Chaud : 1. Tempéré : 2. Froid : 3 |
| Ceinture | Suggestion |
| Bottes de pluie enfants | Nouvelle suggestion (campagne ou montagne, tempéré) |
| Tenue de rechange enfant pour le trajet | À voir dans la catégorie Trajet |
| Autres vêtements | Inchangés |

## Bébé (validé)

Changement de fond : les besoins des petits passent par les **habitudes** plutôt que par l'âge.
- Nouvelles habitudes : « Biberon », « Repas bébé (petits pots) », « Allaitement ».
- À la création d'un profil de moins de 3 ans : « Couches » et « Biberon » pré-cochées.

| Article | Décision |
|---|---|
| Bodies | 1,5 par jour, 12 au maximum |
| Tenues de jour | 1 par jour |
| Chaussettes bébé | Au chaud : 1 pour 2 jours |
| Couches, lingettes, crème pour le change, tapis à langer, sacs à couches | Liés à l'habitude « Couches » |
| Biberons, lait | Liés à l'habitude « Biberon » |
| Chauffe-biberon | Suggestion (habitude « Biberon ») |
| Goupillon + liquide vaisselle biberons | Nouveau (habitude « Biberon ») |
| Petits pots, bavoirs | Liés à l'habitude « Repas bébé » |
| Doudou de secours | Nouvelle suggestion (habitude « Doudou ») |
| Dosettes de sérum physiologique | Supprimer (doublon avec Santé) |
| Thermomètre de bain, chaise haute nomade, babyphone, veilleuse | Suggestions |
| Drap pour lit parapluie | Nouveau, avec le lit parapluie |
| Siège auto / rehausseur | Suggestion « si location de voiture sur place » (bébé/enfant + avion ou train) |
| Pyjamas, couches ×6/jour, tétine, doudou, mouche-bébé, porte-bébé, poussette, lit parapluie | Inchangés |

## Liste de courses sur place (validé, dès la V1)

Les articles faciles à trouver sur place (couches, lait, lingettes, crème solaire, gel douche…) sont marqués « achetable sur place ». Ils forment une liste de courses à l'arrivée au lieu d'aller dans la valise.

Règle retenue : un article « achetable sur place » va dans la liste de courses **seulement si le trajet se fait en avion ou en train**. En voiture, il reste dans la valise. Un tap permet de basculer un article d'une liste à l'autre (« Je l'emporte » / « J'achète sur place »).

## Toilette (validé)

| Article | Décision |
|---|---|
| Brosse à dents | Tout le monde (bébés compris) |
| Brosse / peigne | Une commune ; une perso si « Cheveux longs » |
| Rasoir + mousse / après-rasage | Fusionner en une ligne |
| Trousse de maquillage + démaquillant | Fusionner |
| Lentilles + étui | Fusionner |
| Protections périodiques | Inchangé ; achetable sur place |
| Crème hydratante | Suggestion |
| Baume à lèvres | Froid, ski, montagne seulement |
| Dentifrice, après-shampoing, mouchoirs | Achetables sur place |
| Gel douche, shampoing | Achetables sur place ; pas à l'hôtel |
| Sèche-cheveux, cotons-tiges, pince à épiler | Suggestions |
| Élastiques, déodorant, appareil dentaire, coupe-ongles, pochette 1 L, serviettes de toilette | Inchangés |

## Santé (validé)

Nouvelle habitude : « Mal des transports » (par personne).

| Article | Décision |
|---|---|
| Lunettes de vue + étui | Fusionner |
| Lunettes de rechange | Suggestion |
| Masque de ski | Déplacer dans Montagne |
| Paracétamol | Séparer : « Paracétamol adulte » et « Paracétamol enfant (sirop + pipette) » si bébé ou enfant |
| Thermomètre | Si bébé ou enfant ; suggestion sinon |
| Crème solaire | Renommer « Crème solaire (indice 50 pour les enfants) » ; achetable sur place |
| Après-soleil | Plage seulement ; achetable sur place |
| Anti-moustiques, sérum physiologique | Achetables sur place |
| Médicaments mal des transports | Habitude « Mal des transports » (par personne) ; commun si bateau |
| Anti-diarrhéique / réhydratation | Hors Europe |
| Crème apaisante piqûres, gel hydroalcoolique, bouchons d'oreilles, arnica | Suggestions |
| Pansements ampoules | Nouvelle suggestion (randonnée) |
| Traitement, antihistaminique, lunettes de soleil, trousse de secours, tire-tiques | Inchangés |

## Électronique (validé)

Habitude renommée : « Jeux vidéo » → « Jeux vidéo / tablette ».

| Article | Décision |
|---|---|
| Téléphone | Supprimer (on l'a toujours sur soi) |
| Écouteurs / casque | Si avion ou train ; suggestion sinon |
| Tablette + chargeur | Habitude « Jeux vidéo / tablette » |
| Batterie externe | Si avion, train ou randonnée ; suggestion sinon |
| Adaptateur de prise | Hors Europe ; suggestion en Europe (Royaume-Uni, Irlande, Malte, Chypre, Suisse) |
| Chargeur allume-cigare / CarPlay, enceinte Bluetooth | Suggestions |
| Lampe frontale / torche | Camping ou randonnée ; suggestion sinon |
| Chargeur de téléphone, console, liseuse, appareil photo, ordinateur, multiprise | Inchangés |

## Trajet (validé)

| Article | Décision |
|---|---|
| Coussin de voyage, cadenas, pèse-bagage, sacs plastique | Suggestions |
| Gourde | Chaud, plage ou randonnée ; suggestion sinon |
| Sac à dos de journée | Un pour la famille ; un par personne en randonnée |
| Tenue de rechange dans le sac du trajet | Nouveau : bébé et enfant |
| Sacs (mal des transports) | Habitude « Mal des transports » ; commun si bateau |
| Gilets jaunes + triangle | Sortent de la liste → check-list voiture |
| Occupations, encas, étiquettes bagages, glacière, sac à linge sale | Inchangés |

## Check-list voiture (validé)

Section à part, affichée quand le trajet se fait en voiture : ce qu'on **vérifie** avant de partir, pas ce qu'on met dans la valise. Elle accueille les éléments sortis des autres catégories (gilets + triangle, chargeur allume-cigare, sièges auto, badge télépéage). Contenu validé :
- Gilets jaunes + triangle
- Sièges auto / rehausseurs installés
- Chargeur allume-cigare / câble CarPlay
- Badge télépéage
- Vignette Crit'Air (si la route traverse une zone à faibles émissions)
- Vignette autoroute (Suisse, Autriche…), en Europe
- Pression des pneus et niveaux

La carte grise reste dans les Papiers.

## Sur place (validé)

Changements de fond :
- Hébergement « Camping » séparé en **« Camping (tente) »** et **« Mobil-home »** (proche d'une location).
- Nouvelle quantité pour les articles communs : **1 par participant**.

| Article | Décision |
|---|---|
| Draps et housses de couette, torchons / éponge | Location et mobil-home |
| Liquide vaisselle / pastilles | Achetable sur place |
| Lessive | Renommer « Lessive (quelques dosettes) » ; achetable sur place |
| Sel, poivre, huile, café, épices | Inchangé, pas achetable |
| Couteau, tire-bouchon / décapsuleur | Camping (tente) ; suggestions en location |
| Pinces à linge / corde | Camping (tente) ; suggestion à la plage |
| Tente, réchaud, vaisselle, table et chaises, rallonge | Camping (tente) |
| Sacs de couchage, matelas + gonfleur, oreillers | Camping (tente), 1 par participant |
| Sacs poubelle, papier toilette | Nouvelles suggestions (location) |
| Sacs de courses, cadeau pour les hôtes | Inchangés |

## Plage (validé)

Nouvelle habitude : « Ne sait pas encore nager », pré-cochée à la création d'un profil de moins de 6 ans.

| Article | Décision |
|---|---|
| Chaussures d'eau, pochette étanche | Suggestions |
| Brassards / gilet de natation | Habitude « Ne sait pas encore nager » |
| Couches de bain | Habitude « Couches » ; achetables sur place |
| Masque + tuba + palmes | Fusionner |
| Raquettes / ballon de plage | Suggestion, fusionnée avec « Ballon » des Loisirs |
| Bouée, natte de plage | Nouvelles suggestions |
| Maillot ×2, serviette, t-shirt anti-UV, parasol, seau/pelle/râteau, sac de plage | Inchangés |
