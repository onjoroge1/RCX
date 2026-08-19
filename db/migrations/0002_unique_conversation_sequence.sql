DROP INDEX IF EXISTS "conversation_messages_thread_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_messages_thread_unique"
  ON "conversation_messages" USING btree ("conversation_id", "sequence");
