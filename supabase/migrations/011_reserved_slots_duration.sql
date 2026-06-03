-- Sabit müşteri slotlarına süre alanı ekle; mevcut kayıtlar 60 dk olarak ayarlanır
ALTER TABLE reserved_slots
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 60;
