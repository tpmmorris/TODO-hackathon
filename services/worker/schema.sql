PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS practices (
  ods_code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
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

INSERT OR IGNORE INTO practices (ods_code, name, address, latitude, longitude, phone, opening_hours)
VALUES
  ('G82001', 'Riverside Medical Centre', '14 Mill Road, Cambridge', 52.2053, 0.1218, '01223 555 010', '08:00 - 18:30'),
  ('G82002', 'Parker Street Health', '82 Parker Street, Cambridge', 52.1975, 0.1282, '01223 555 011', '08:00 - 17:00'),
  ('G82003', 'Chesterton Family Practice', '6 Green Lane, Cambridge', 52.2220, 0.1410, '01223 555 012', '08:00 - 18:00');

INSERT OR IGNORE INTO slots (id, ods_code, start_time, end_time, practitioner_role, status, source)
VALUES
  ('slot-101', 'G82001', datetime('now', '+2 hours'), datetime('now', '+2 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed'),
  ('slot-102', 'G82001', datetime('now', '+3 hours'), datetime('now', '+3 hours', '+10 minutes'), 'Advanced Nurse Practitioner', 'FREE', 'Demo seed'),
  ('slot-103', 'G82002', datetime('now', '+4 hours'), datetime('now', '+4 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed'),
  ('slot-104', 'G82003', datetime('now', '+1 day', '+2 hours'), datetime('now', '+1 day', '+2 hours', '+10 minutes'), 'GP', 'FREE', 'Demo seed');
