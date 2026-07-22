PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS practices (
  ods_code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  postcode TEXT,
  type TEXT NOT NULL DEFAULT 'GP' CHECK (type IN ('GP', 'WALK_IN', 'URGENT_CARE')),
  accepts_out_of_area INTEGER NOT NULL DEFAULT 0,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  phone TEXT,
  opening_hours TEXT,
  source TEXT NOT NULL DEFAULT 'NHS ODS',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pharmacies (
  id TEXT PRIMARY KEY NOT NULL,
  ods_code TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  stock_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ods_code) REFERENCES practices (ods_code)
);

CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY NOT NULL,
  ods_code TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  practitioner_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FREE' CHECK (status IN ('FREE', 'LOCKED', 'BOOKED')),
  source TEXT NOT NULL DEFAULT 'NHS GP Connect',
  external_reference TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ods_code) REFERENCES practices (ods_code)
);

CREATE TABLE IF NOT EXISTS triage_logs (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  ods_code TEXT,
  symptom_text TEXT NOT NULL,
  result_json TEXT NOT NULL,
  report_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ods_code) REFERENCES practices (ods_code)
);

CREATE INDEX IF NOT EXISTS slots_by_practice_and_time
  ON slots (ods_code, status, start_time);
CREATE INDEX IF NOT EXISTS triage_logs_by_patient
  ON triage_logs (patient_id, created_at DESC);

-- GP Practices
INSERT OR IGNORE INTO practices (ods_code, name, address, postcode, type, accepts_out_of_area, latitude, longitude, phone, opening_hours)
VALUES
  ('G82001', 'Riverside Medical Centre', '14 Mill Road, Cambridge', 'CB1 2AA', 'GP', 0, 52.2053, 0.1218, '01223 555 010', '08:00 - 18:30'),
  ('G82002', 'Parker Street Health', '82 Parker Street, Cambridge', 'CB2 1DP', 'GP', 0, 52.1975, 0.1282, '01223 555 011', '08:00 - 17:00'),
  ('G82003', 'Chesterton Family Practice', '6 Green Lane, Cambridge', 'CB4 1LL', 'GP', 0, 52.2220, 0.1410, '01223 555 012', '08:00 - 18:00'),
  ('G82004', 'Trumpington Health Centre', '2 Anstey Way, Cambridge', 'CB2 9JE', 'GP', 1, 52.1760, 0.1155, '01223 555 013', '08:00 - 18:00'),
  ('G82005', 'Milton Surgery', '48 Coles Road, Cambridge', 'CB24 6BL', 'GP', 0, 52.2450, 0.1550, '01223 555 014', '08:00 - 17:30'),
  ('G82006', 'Newnham Walk Practice', '11 Newnham Walk, Cambridge', 'CB3 9LN', 'GP', 1, 52.2000, 0.1100, '01223 555 015', '08:00 - 18:30');

-- Walk-in and Urgent Care (no registration required)
INSERT OR IGNORE INTO practices (ods_code, name, address, postcode, type, accepts_out_of_area, latitude, longitude, phone, opening_hours)
VALUES
  ('WIC001', 'Cambridge Walk-in Centre', '35-37 Brooks Road, Cambridge', 'CB1 3HR', 'WALK_IN', 1, 52.1980, 0.1450, '01223 555 020', '08:00 - 20:00'),
  ('UC001', 'Addenbrooke''s Urgent Treatment Centre', 'Hills Road, Cambridge', 'CB2 0QQ', 'URGENT_CARE', 1, 52.1755, 0.1405, '01223 555 030', '24 hours'),
  ('WIC002', 'North Cambridge Minor Injuries', '100 Arbury Road, Cambridge', 'CB4 2LD', 'WALK_IN', 1, 52.2320, 0.1380, '01223 555 021', '09:00 - 18:00');

INSERT OR IGNORE INTO pharmacies (id, ods_code, name, address, latitude, longitude, stock_json)
VALUES
  ('pharm-01', NULL, 'Boots Cambridge Grand Arcade', '1 Grand Arcade, Cambridge CB2 3QA', 52.2055, 0.1220, '{"paracetamol":{"quantity":42,"lastChecked":"2026-07-22T08:00:00Z"},"ibuprofen":{"quantity":15,"lastChecked":"2026-07-22T08:00:00Z"},"amoxicillin":{"quantity":8,"lastChecked":"2026-07-22T08:00:00Z"},"salbutamol-inhaler":{"quantity":0,"lastChecked":"2026-07-22T08:00:00Z"}}'),
  ('pharm-02', NULL, 'LloydsPharmacy Mill Road', '189 Mill Road, Cambridge CB1 3BA', 52.2020, 0.1400, '{"paracetamol":{"quantity":120,"lastChecked":"2026-07-22T08:00:00Z"},"ibuprofen":{"quantity":67,"lastChecked":"2026-07-22T08:00:00Z"},"amoxicillin":{"quantity":0,"lastChecked":"2026-07-22T08:00:00Z"},"salbutamol-inhaler":{"quantity":12,"lastChecked":"2026-07-22T08:00:00Z"}}'),
  ('pharm-03', NULL, 'Tesco Pharmacy Newmarket Road', 'Newmarket Road, Cambridge CB5 8JJ', 52.2100, 0.1380, '{"paracetamol":{"quantity":250,"lastChecked":"2026-07-22T08:00:00Z"},"ibuprofen":{"quantity":180,"lastChecked":"2026-07-22T08:00:00Z"},"amoxicillin":{"quantity":45,"lastChecked":"2026-07-22T08:00:00Z"},"salbutamol-inhaler":{"quantity":30,"lastChecked":"2026-07-22T08:00:00Z"}}'),
  ('pharm-04', NULL, 'Superdrug Pharmacy Market Street', '46 Market Street, Cambridge CB1 1NU', 52.2050, 0.1190, '{"paracetamol":{"quantity":5,"lastChecked":"2026-07-22T08:00:00Z"},"ibuprofen":{"quantity":3,"lastChecked":"2026-07-22T08:00:00Z"},"amoxicillin":{"quantity":0,"lastChecked":"2026-07-22T08:00:00Z"},"salbutamol-inhaler":{"quantity":2,"lastChecked":"2026-07-22T08:00:00Z"}}'),
  ('pharm-05', NULL, 'Well Pharmacy Arbury', '7 Arbury Court, Cambridge CB4 2QA', 52.2300, 0.1420, '{"paracetamol":{"quantity":89,"lastChecked":"2026-07-22T08:00:00Z"},"ibuprofen":{"quantity":54,"lastChecked":"2026-07-22T08:00:00Z"},"amoxicillin":{"quantity":22,"lastChecked":"2026-07-22T08:00:00Z"},"salbutamol-inhaler":{"quantity":8,"lastChecked":"2026-07-22T08:00:00Z"}}'),
  ('pharm-06', NULL, 'Asda Pharmacy Coldhams Lane', '1 Coldhams Lane, Cambridge CB1 3HP', 52.1950, 0.1450, '{"paracetamol":{"quantity":200,"lastChecked":"2026-07-22T08:00:00Z"},"ibuprofen":{"quantity":140,"lastChecked":"2026-07-22T08:00:00Z"},"amoxicillin":{"quantity":60,"lastChecked":"2026-07-22T08:00:00Z"},"salbutamol-inhaler":{"quantity":25,"lastChecked":"2026-07-22T08:00:00Z"}}');

INSERT OR IGNORE INTO slots (id, ods_code, start_time, end_time, practitioner_role, status, source)
VALUES
  ('slot-101', 'G82001', datetime('now', '+2 hours'), datetime('now', '+2 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed'),
  ('slot-102', 'G82001', datetime('now', '+3 hours'), datetime('now', '+3 hours', '+10 minutes'), 'Advanced Nurse Practitioner', 'FREE', 'Demo seed'),
  ('slot-103', 'G82002', datetime('now', '+4 hours'), datetime('now', '+4 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed'),
  ('slot-104', 'G82003', datetime('now', '+1 day', '+2 hours'), datetime('now', '+1 day', '+2 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed'),
  ('slot-105', 'G82004', datetime('now', '+2 hours'), datetime('now', '+2 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed'),
  ('slot-106', 'G82006', datetime('now', '+3 hours'), datetime('now', '+3 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed'),
  ('slot-wic-01', 'WIC001', datetime('now', '+1 hour'), datetime('now', '+1 hour', '+15 minutes'), 'Nurse Practitioner', 'FREE', 'Demo seed'),
  ('slot-wic-02', 'WIC001', datetime('now', '+2 hours'), datetime('now', '+2 hours', '+15 minutes'), 'Nurse Practitioner', 'FREE', 'Demo seed'),
  ('slot-uc-01', 'UC001', datetime('now', '+30 minutes'), datetime('now', '+1 hour', '+30 minutes'), 'Emergency Nurse', 'FREE', 'Demo seed'),
  ('slot-uc-02', 'UC001', datetime('now', '+2 hours'), datetime('now', '+3 hours'), 'Emergency Nurse', 'FREE', 'Demo seed'),
  ('slot-wic-03', 'WIC002', datetime('now', '+1 hour'), datetime('now', '+1 hour', '+15 minutes'), 'Practice Nurse', 'FREE', 'Demo seed');
