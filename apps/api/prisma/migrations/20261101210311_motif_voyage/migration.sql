-- AlterTable
ALTER TABLE `voyage` ADD COLUMN `motif` VARCHAR(10) NOT NULL DEFAULT 'vacances';

-- CreateTable
CREATE TABLE `catalogue_evolution` (
    `id` VARCHAR(60) NOT NULL,
    `appliqueeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- « Travail » était une activité ; c'est désormais le motif du voyage (un voyage de travail se fait seul).
UPDATE `voyage` SET `motif` = 'travail'
WHERE JSON_CONTAINS(`activites`, '"travail"') AND JSON_LENGTH(`participants`) = 1;

UPDATE `voyage` SET `activites` = JSON_REMOVE(`activites`, JSON_UNQUOTE(JSON_SEARCH(`activites`, 'one', 'travail')))
WHERE JSON_CONTAINS(`activites`, '"travail"');
