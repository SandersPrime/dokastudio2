-- CreateTable
CREATE TABLE "User" (
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

-- CreateTable
CREATE TABLE "HostProfile" (
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

-- CreateTable
CREATE TABLE "Quiz" (
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
    "marketplace_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "license_type" TEXT,
    "published_at" DATETIME,
    "rejection_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Quiz_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quiz_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    CONSTRAINT "QuizRound_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
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

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pinCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" DATETIME,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Homework_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "homeworkId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "answersJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HomeworkSubmission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "platform_fee" REAL NOT NULL,
    "author_earning" REAL NOT NULL,
    "price_paid" REAL NOT NULL DEFAULT 0.0,
    "author_revenue" REAL NOT NULL DEFAULT 0.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "author_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payout_method" TEXT NOT NULL,
    "payout_details" TEXT NOT NULL,
    "admin_note" TEXT,
    "requested_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "PayoutRequest_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
CREATE TABLE "EquipmentProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "short_description" TEXT,
    "image_url" TEXT,
    "gallery_json" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT,
    "scenario_type" TEXT,
    "price" REAL NOT NULL DEFAULT 0.0,
    "rental_price_day" REAL NOT NULL DEFAULT 0.0,
    "deposit_amount" REAL NOT NULL DEFAULT 0.0,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "available_for_sale" BOOLEAN NOT NULL DEFAULT true,
    "available_for_rent" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EquipmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "product_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "company_name" TEXT,
    "event_date" DATETIME,
    "rental_days" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "admin_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "EquipmentRequest_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "EquipmentProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE TABLE "GameSession" (
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

-- CreateTable
CREATE TABLE "GamePlayer" (
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

-- CreateTable
CREATE TABLE "FlashcardSet" (
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

-- CreateTable
CREATE TABLE "Flashcard" (
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HostProfile_user_id_key" ON "HostProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Homework_pinCode_key" ON "Homework"("pinCode");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_homeworkId_studentName_idx" ON "HomeworkSubmission"("homeworkId", "studentName");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_homeworkId_studentName_attemptNumber_key" ON "HomeworkSubmission"("homeworkId", "studentName", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_user_id_quiz_id_key" ON "Purchase"("user_id", "quiz_id");

-- CreateIndex
CREATE INDEX "PayoutRequest_author_id_status_idx" ON "PayoutRequest"("author_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentProduct_slug_key" ON "EquipmentProduct"("slug");

-- CreateIndex
CREATE INDEX "EquipmentRequest_status_idx" ON "EquipmentRequest"("status");

-- CreateIndex
CREATE INDEX "EquipmentRequest_product_id_idx" ON "EquipmentRequest"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_pin_code_key" ON "GameSession"("pin_code");

