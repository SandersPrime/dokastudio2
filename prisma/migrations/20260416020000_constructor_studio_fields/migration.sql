ALTER TABLE "QuizRound" ADD COLUMN "round_type" TEXT;
ALTER TABLE "QuizRound" ADD COLUMN "config_json" TEXT;

ALTER TABLE "Question" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "Question" ADD COLUMN "layout_type" TEXT NOT NULL DEFAULT 'QUESTION';
ALTER TABLE "Question" ADD COLUMN "game_mode" TEXT;
ALTER TABLE "Question" ADD COLUMN "background_color" TEXT;
ALTER TABLE "Question" ADD COLUMN "background_image_url" TEXT;
ALTER TABLE "Question" ADD COLUMN "config_json" TEXT;
