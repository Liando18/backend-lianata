-- Tambah kolom telegram_id ke tabel users
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(50);

-- Tambah index untuk pencarian cepat berdasarkan telegram_id
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON users (telegram_id);
