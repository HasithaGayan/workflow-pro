CREATE TABLE "auth_rate_limits" (
    "rate_key" VARCHAR(128) NOT NULL,
    "hits" INTEGER NOT NULL CHECK ("hits" > 0),
    "reset_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey"
        PRIMARY KEY ("rate_key")
);

CREATE INDEX "idx_auth_rate_limits_reset"
    ON "auth_rate_limits" ("reset_at");
