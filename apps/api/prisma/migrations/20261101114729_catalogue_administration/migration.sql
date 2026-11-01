-- CreateTable
CREATE TABLE `catalogue_article` (
    `id` VARCHAR(60) NOT NULL,
    `nom` VARCHAR(200) NOT NULL,
    `categorie` VARCHAR(20) NOT NULL,
    `portee` VARCHAR(10) NOT NULL,
    `mode` VARCHAR(12) NULL,
    `achetable` BOOLEAN NOT NULL DEFAULT false,
    `si` JSON NULL,
    `quantite` JSON NULL,
    `ordre` INTEGER NOT NULL,
    `archive` BOOLEAN NOT NULL DEFAULT false,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `majLe` DATETIME(3) NOT NULL,
    `majPar` VARCHAR(255) NULL,

    INDEX `catalogue_article_ordre_idx`(`ordre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalogue_historique` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `articleId` VARCHAR(60) NOT NULL,
    `action` VARCHAR(14) NOT NULL,
    `avant` JSON NULL,
    `apres` JSON NULL,
    `auteur` VARCHAR(255) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalogue_historique_articleId_date_idx`(`articleId`, `date`),
    INDEX `catalogue_historique_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipier` (
    `email` VARCHAR(255) NOT NULL,
    `role` VARCHAR(10) NOT NULL,
    `ajoutePar` VARCHAR(255) NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
