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
