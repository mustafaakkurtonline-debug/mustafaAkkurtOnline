-- Günlük belirli saat aralıklarını kapatmak için
CREATE TABLE blocked_slots (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date date        NOT NULL,
  start_time   time        NOT NULL,
  end_time     time        NOT NULL,
  reason       text        DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Anon okuyabilir (slot müsaitlik kontrolü için)
CREATE POLICY "blocked_slots_public_read"
  ON blocked_slots FOR SELECT TO anon, authenticated USING (true);

-- Sadece admin ekleyip silebilir
CREATE POLICY "blocked_slots_auth_write"
  ON blocked_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
