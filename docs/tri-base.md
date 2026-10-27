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
