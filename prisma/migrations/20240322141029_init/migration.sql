-- CreateTable
CREATE TABLE "PreservationTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    "priorityLabel" TEXT,
    "category" TEXT,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "BackupExecution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "preservationTargetId" INTEGER NOT NULL,
    "artefactName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    "beforeProcessBytes" TEXT,
    "afterProcessBytes" TEXT,
    CONSTRAINT "BackupExecution_preservationTargetId_fkey" FOREIGN KEY ("preservationTargetId") REFERENCES "PreservationTarget" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueuedBackupExecution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "preservationTargetId" INTEGER NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "intendedBackupCategory" TEXT NOT NULL,
    "intendedUploadDestination" TEXT NOT NULL,
    "intendedUploadPath" TEXT NOT NULL,
    "secondIntendedUploadDestination" TEXT,
    "secondIntendedUploadPath" TEXT,
    "actualBackupExecutionId" INTEGER,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    CONSTRAINT "QueuedBackupExecution_preservationTargetId_fkey" FOREIGN KEY ("preservationTargetId") REFERENCES "PreservationTarget" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupSecret" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "backupExecutionId" INTEGER NOT NULL,
    "encryptionType" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "secretValue" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    CONSTRAINT "BackupSecret_backupExecutionId_fkey" FOREIGN KEY ("backupExecutionId") REFERENCES "BackupExecution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadExecution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "backupExecutionId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    "completedTime" TEXT,
    CONSTRAINT "UploadExecution_backupExecutionId_fkey" FOREIGN KEY ("backupExecutionId") REFERENCES "BackupExecution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestorationExecution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceDir" TEXT NOT NULL,
    "destinationDir" TEXT NOT NULL,
    "preservationTargetRevealed" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT
);

-- CreateTable
CREATE TABLE "RestorationSecret" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "restorationExecutionId" INTEGER NOT NULL,
    "encryptionType" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "secretValue" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    CONSTRAINT "RestorationSecret_restorationExecutionId_fkey" FOREIGN KEY ("restorationExecutionId") REFERENCES "RestorationExecution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicationState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "currentBackupExecutionId" INTEGER,
    "currentUploadExecutionId" INTEGER,
    "currentRestorationExecutionId" INTEGER,
    "errorState" BOOLEAN NOT NULL DEFAULT false,
    "automaticMode" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ApplicationSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rcloneBwLimit" TEXT NOT NULL,
    "defaultUploadDestination" TEXT NOT NULL,
    "defaultUploadPath" TEXT NOT NULL,
    "defaultBackupCategory" TEXT NOT NULL,
    "defaultSecondUploadDestination" TEXT,
    "defaultSecondUploadPath" TEXT,
    "showOldDataPages" BOOLEAN NOT NULL DEFAULT false,
    "uploadToTwoTargets" BOOLEAN NOT NULL DEFAULT false,
    "backupCopyPhaseBwLimit" TEXT
);
