/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `isCorrect` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `audioUrl` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `setId` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `FlashcardSet` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `FlashcardSet` table. All the data in the column will be lost.
  - You are about to drop the column `isPublished` on the `FlashcardSet` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FlashcardSet` table. All the data in the column will be lost.
  - You are about to drop the column `correctAnswers` on the `GamePlayer` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GamePlayer` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `GamePlayer` table. All the data in the column will be lost.
  - You are about to drop the column `socketId` on the `GamePlayer` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `GamePlayer` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `currentQuestionIndex` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `finishedAt` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `hostId` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `pinCode` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `quizId` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `eventsCount` on the `HostProfile` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `HostProfile` table. All the data in the column will be lost.
  - You are about to drop the column `ratePerHour` on the `HostProfile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `HostProfile` table. All the data in the column will be lost.
  - You are about to drop the column `authorEarning` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `platformFee` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `quizId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `quizId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `roundId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `timeLimit` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `hasTimer` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `isPublished` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `salesCount` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `showLeaderboard` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `timePerQuestion` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `QuizRound` table. All the data in the column will be lost.
  - You are about to drop the column `quizId` on the `QuizRound` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Added the required column `question_id` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `set_id` to the `Flashcard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `author_id` to the `FlashcardSet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `FlashcardSet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `GamePlayer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `host_id` to the `GameSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pin_code` to the `GameSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quiz_id` to the `GameSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `HostProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `author_earning` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_fee` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quiz_id` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_index` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quiz_id` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `author_id` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_index` to the `QuizRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quiz_id` to the `QuizRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price_buy" REAL,
    "price_rent_day" REAL,
    "stock_count" INTEGER NOT NULL DEFAULT 0,
    "available_for_rent" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT
);

-- CreateTable
CREATE TABLE "EquipmentOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_price" REAL NOT NULL,
    "rent_start" DATETIME,
    "rent_end" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "delivery_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentOrder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EquipmentOrder_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "host_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "event_date" DATETIME NOT NULL,
    "duration_hours" INTEGER NOT NULL,
    "total_price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SEARCH',
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "HostProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "player_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer_id" TEXT,
    "answer_text" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "response_time_ms" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerAnswer_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "GamePlayer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captain_id" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Answer" ("id", "order", "text") SELECT "id", "order", "text" FROM "Answer";
DROP TABLE "Answer";
ALTER TABLE "new_Answer" RENAME TO "Answer";
CREATE TABLE "new_Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "set_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "image_url" TEXT,
    "audio_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flashcard_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "FlashcardSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Flashcard" ("definition", "id", "order", "term") SELECT "definition", "id", "order", "term" FROM "Flashcard";
DROP TABLE "Flashcard";
ALTER TABLE "new_Flashcard" RENAME TO "Flashcard";
CREATE TABLE "new_FlashcardSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author_id" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "price" REAL NOT NULL DEFAULT 0.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FlashcardSet_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FlashcardSet" ("description", "id", "price", "title") SELECT "description", "id", "price", "title" FROM "FlashcardSet";
DROP TABLE "FlashcardSet";
ALTER TABLE "new_FlashcardSet" RENAME TO "FlashcardSet";
CREATE TABLE "new_GamePlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "nickname" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "socket_id" TEXT,
    "team_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GamePlayer_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GamePlayer_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GamePlayer" ("connected", "id", "nickname", "score") SELECT "connected", "id", "nickname", "score" FROM "GamePlayer";
DROP TABLE "GamePlayer";
ALTER TABLE "new_GamePlayer" RENAME TO "GamePlayer";
CREATE TABLE "new_GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quiz_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "current_question_index" INTEGER NOT NULL DEFAULT 0,
    "current_round_id" TEXT,
    "started_at" DATETIME,
    "finished_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameSession_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameSession_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameSession" ("id", "status") SELECT "id", "status" FROM "GameSession";
DROP TABLE "GameSession";
ALTER TABLE "new_GameSession" RENAME TO "GameSession";
CREATE UNIQUE INDEX "GameSession_pin_code_key" ON "GameSession"("pin_code");
CREATE TABLE "new_HostProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "rate_per_hour" REAL NOT NULL DEFAULT 1000.0,
    "rating" REAL NOT NULL DEFAULT 5.0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "portfolio_video_url" TEXT,
    "events_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "HostProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_HostProfile" ("bio", "experience", "id", "rating") SELECT "bio", "experience", "id", "rating" FROM "HostProfile";
DROP TABLE "HostProfile";
ALTER TABLE "new_HostProfile" RENAME TO "HostProfile";
CREATE UNIQUE INDEX "HostProfile_user_id_key" ON "HostProfile"("user_id");
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "platform_fee" REAL NOT NULL,
    "author_earning" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("amount", "id") SELECT "amount", "id" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE UNIQUE INDEX "Purchase_user_id_quiz_id_key" ON "Purchase"("user_id", "quiz_id");
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quiz_id" TEXT NOT NULL,
    "round_id" TEXT,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "audio_url" TEXT,
    "video_url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "points" INTEGER NOT NULL DEFAULT 100,
    "order_index" INTEGER NOT NULL,
    "time_limit" INTEGER,
    "points_at_start" INTEGER NOT NULL DEFAULT 100,
    "points_at_end" INTEGER NOT NULL DEFAULT 100,
    "penalty_points" INTEGER NOT NULL DEFAULT 0,
    "penalty_no_answer" INTEGER NOT NULL DEFAULT 0,
    "speed_bonus_1" INTEGER NOT NULL DEFAULT 0,
    "speed_bonus_2" INTEGER NOT NULL DEFAULT 0,
    "speed_bonus_3" INTEGER NOT NULL DEFAULT 0,
    "auto_judge" BOOLEAN NOT NULL DEFAULT true,
    "lockout_on_wrong" BOOLEAN NOT NULL DEFAULT true,
    "show_correct_answer" BOOLEAN NOT NULL DEFAULT true,
    "countdown_mode" TEXT NOT NULL DEFAULT 'auto',
    "text_reveal" TEXT NOT NULL DEFAULT 'none',
    "jokers_enabled" BOOLEAN NOT NULL DEFAULT true,
    "demographic_group" TEXT,
    "slide_routing" TEXT,
    "notes" TEXT,
    CONSTRAINT "Question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "QuizRound" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("id", "points", "text", "type") SELECT "id", "points", "text", "type" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE TABLE "new_Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "author_id" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "has_timer" BOOLEAN NOT NULL DEFAULT true,
    "time_per_question" INTEGER NOT NULL DEFAULT 30,
    "show_leaderboard" BOOLEAN NOT NULL DEFAULT true,
    "allow_reconnect" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "price" REAL NOT NULL DEFAULT 0.0,
    "discount" REAL DEFAULT 0.0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "age_group" TEXT,
    "format" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Quiz_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quiz" ("description", "id", "price", "title") SELECT "description", "id", "price", "title" FROM "Quiz";
DROP TABLE "Quiz";
ALTER TABLE "new_Quiz" RENAME TO "Quiz";
CREATE TABLE "new_QuizRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quiz_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    CONSTRAINT "QuizRound_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuizRound" ("id", "title") SELECT "id", "title" FROM "QuizRound";
DROP TABLE "QuizRound";
ALTER TABLE "new_QuizRound" RENAME TO "QuizRound";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "avatar_url" TEXT,
    "balance" REAL NOT NULL DEFAULT 0.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_User" ("balance", "email", "id", "name", "role") SELECT "balance", "email", "id", "name", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
