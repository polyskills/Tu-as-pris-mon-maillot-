-- Un compte = une famille.
-- Avant ce correctif, la première connexion pouvait créer plusieurs familles pour le même compte (requêtes
-- parallèles). On garde la plus ancienne et on y regroupe les profils et voyages des autres : rien n'est perdu.

CREATE TEMPORARY TABLE `famille_gardee` AS
SELECT `m`.`userId`,
       (SELECT `m2`.`familleId` FROM `membre` `m2` WHERE `m2`.`userId` = `m`.`userId`
        ORDER BY `m2`.`creeLe`, `m2`.`familleId` LIMIT 1) AS `familleId`
FROM `membre` `m`
GROUP BY `m`.`userId`
HAVING COUNT(*) > 1;

CREATE TEMPORARY TABLE `famille_doublon` AS
SELECT `m`.`familleId` AS `id`, `g`.`familleId` AS `gardee`
FROM `membre` `m`
JOIN `famille_gardee` `g` ON `g`.`userId` = `m`.`userId` AND `g`.`familleId` <> `m`.`familleId`;

UPDATE `profil` `p` JOIN `famille_doublon` `d` ON `d`.`id` = `p`.`familleId` SET `p`.`familleId` = `d`.`gardee`;
UPDATE `voyage` `v` JOIN `famille_doublon` `d` ON `d`.`id` = `v`.`familleId` SET `v`.`familleId` = `d`.`gardee`;
DELETE `f` FROM `famille` `f` JOIN `famille_doublon` `d` ON `d`.`id` = `f`.`id`;

DROP TEMPORARY TABLE `famille_doublon`;
DROP TEMPORARY TABLE `famille_gardee`;

-- CreateIndex
CREATE UNIQUE INDEX `membre_userId_key` ON `membre`(`userId`);
