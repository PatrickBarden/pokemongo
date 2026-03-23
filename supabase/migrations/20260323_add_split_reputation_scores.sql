ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS seller_reputation_score INTEGER NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS buyer_reputation_score INTEGER NOT NULL DEFAULT 100;

UPDATE public.users
SET seller_reputation_score = COALESCE(reputation_score, 100),
    buyer_reputation_score = COALESCE(reputation_score, 100)
WHERE seller_reputation_score IS NULL
   OR buyer_reputation_score IS NULL;
