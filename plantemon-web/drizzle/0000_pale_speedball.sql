CREATE TABLE "plant_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"name" text NOT NULL,
	"attack" integer NOT NULL,
	"defense" integer NOT NULL,
	"accuracy" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"speed" integer NOT NULL,
	"sprite_url" text,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"common_names" jsonb,
	"description" text,
	"taxonomy" jsonb,
	"best_light_condition" text,
	"best_soil_type" text,
	"common_uses" text,
	"cultural_significance" text,
	"toxicity" text,
	"best_watering" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprite_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"url" text NOT NULL,
	"prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plant_moves" ADD CONSTRAINT "plant_moves_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plants_user_id_id_idx" ON "plants" USING btree ("user_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sprite_cache_key_idx" ON "sprite_cache" USING btree ("cache_key");