-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(64) NOT NULL,
    `name` TEXT NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` TEXT NULL,
    `userAgent` TEXT NULL,
    `userId` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `session_token_key`(`token`),
    INDEX `session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(64) NOT NULL,
    `accountId` TEXT NOT NULL,
    `providerId` TEXT NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` TEXT NULL,
    `password` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `account_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification` (
    `id` VARCHAR(64) NOT NULL,
    `identifier` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `verification_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `famille` (
    `id` VARCHAR(32) NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membre` (
    `userId` VARCHAR(64) NOT NULL,
    `familleId` VARCHAR(32) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'proprietaire',
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `membre_familleId_idx`(`familleId`),
    PRIMARY KEY (`userId`, `familleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profil` (
    `id` VARCHAR(32) NOT NULL,
    `familleId` VARCHAR(32) NOT NULL,
    `prenom` VARCHAR(80) NOT NULL,
    `couleur` VARCHAR(9) NULL,
    `anneeNaissance` INTEGER NOT NULL,
    `sexe` VARCHAR(1) NULL,
    `habitudes` JSON NOT NULL,
    `responsabilites` JSON NOT NULL,
    `articlesPerso` JSON NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `majLe` DATETIME(3) NOT NULL,

    INDEX `profil_familleId_idx`(`familleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voyage` (
    `id` VARCHAR(32) NOT NULL,
    `familleId` VARCHAR(32) NOT NULL,
    `nom` VARCHAR(120) NOT NULL,
    `depart` CHAR(10) NOT NULL,
    `nuits` INTEGER NOT NULL,
    `destinations` JSON NOT NULL,
    `climat` VARCHAR(10) NOT NULL,
    `zone` VARCHAR(12) NOT NULL,
    `transports` JSON NOT NULL,
    `hebergement` VARCHAR(12) NOT NULL,
    `machineALaver` BOOLEAN NOT NULL,
    `activites` JSON NOT NULL,
    `participants` JSON NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `majLe` DATETIME(3) NOT NULL,

    INDEX `voyage_familleId_idx`(`familleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_voyage` (
    `voyageId` VARCHAR(32) NOT NULL,
    `id` VARCHAR(120) NOT NULL,
    `nom` VARCHAR(200) NOT NULL,
    `categorie` VARCHAR(20) NOT NULL,
    `proprietaire` VARCHAR(32) NOT NULL,
    `quantite` INTEGER NOT NULL,
    `statut` VARCHAR(12) NOT NULL,
    `liste` VARCHAR(10) NOT NULL,
    `origine` VARCHAR(12) NOT NULL,
    `ajuste` BOOLEAN NOT NULL DEFAULT false,
    `listeChoisie` BOOLEAN NOT NULL DEFAULT false,
    `achetable` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`voyageId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membre` ADD CONSTRAINT `membre_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membre` ADD CONSTRAINT `membre_familleId_fkey` FOREIGN KEY (`familleId`) REFERENCES `famille`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profil` ADD CONSTRAINT `profil_familleId_fkey` FOREIGN KEY (`familleId`) REFERENCES `famille`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voyage` ADD CONSTRAINT `voyage_familleId_fkey` FOREIGN KEY (`familleId`) REFERENCES `famille`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_voyage` ADD CONSTRAINT `article_voyage_voyageId_fkey` FOREIGN KEY (`voyageId`) REFERENCES `voyage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
