-- CreateTable
CREATE TABLE `invitation` (
    `id` VARCHAR(32) NOT NULL,
    `familleId` VARCHAR(32) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `invitePar` VARCHAR(255) NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invitation_email_idx`(`email`),
    UNIQUE INDEX `invitation_familleId_email_key`(`familleId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invitation` ADD CONSTRAINT `invitation_familleId_fkey` FOREIGN KEY (`familleId`) REFERENCES `famille`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
