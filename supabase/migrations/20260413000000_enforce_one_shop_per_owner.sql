-- Enforce single-shop-per-owner model used by application code.
DO $$
BEGIN
  IF EXISTS (
    SELECT owner_id
    FROM shops
    GROUP BY owner_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique constraint on shops.owner_id: duplicate owners exist';
  END IF;
END
$$;

ALTER TABLE shops
  ADD CONSTRAINT shops_owner_id_unique UNIQUE (owner_id);
