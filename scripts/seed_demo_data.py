#!/usr/bin/env python3
"""Seed realistic, synthetic GPNow demo data through Wrangler D1.

The records use fictional demo ODS codes and no patient data. The default target
is remote so the command is explicit about populating the deployed D1 database.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

PRACTICES = [
    ("G82001", "Riverside Medical Centre", "14 Mill Road, Cambridge", "CB1 2AA", "GP", 0, 52.2053, 0.1218, "01223 555 010", "08:00 - 18:30"),
    ("G82002", "Parker Street Health", "82 Parker Street, Cambridge", "CB2 1DP", "GP", 0, 52.1975, 0.1282, "01223 555 011", "08:00 - 17:00"),
    ("G82003", "Chesterton Family Practice", "6 Green Lane, Cambridge", "CB4 1LL", "GP", 0, 52.2220, 0.1410, "01223 555 012", "08:00 - 18:00"),
    ("G82004", "Trumpington Health Centre", "2 Anstey Way, Cambridge", "CB2 9JE", "GP", 1, 52.1760, 0.1155, "01223 555 013", "08:00 - 18:00"),
    ("G82005", "Milton Surgery", "48 Coles Road, Cambridge", "CB24 6BL", "GP", 0, 52.2450, 0.1550, "01223 555 014", "08:00 - 17:30"),
    ("G82006", "Newnham Walk Practice", "11 Newnham Walk, Cambridge", "CB3 9LN", "GP", 1, 52.2000, 0.1100, "01223 555 015", "08:00 - 18:30"),
    ("GPNOW-GP-007", "Fen Ditton Health Hub", "25 High Street, Fen Ditton", "CB5 8ST", "GP", 1, 52.2105, 0.1810, "01223 555 016", "08:00 - 18:00"),
    ("GPNOW-GP-008", "West Cambridge Family Practice", "18 Madingley Road, Cambridge", "CB3 0EZ", "GP", 1, 52.2115, 0.1010, "01223 555 017", "08:00 - 18:30"),
    ("WIC001", "Cambridge Walk-in Centre", "35-37 Brooks Road, Cambridge", "CB1 3HR", "WALK_IN", 1, 52.1980, 0.1450, "01223 555 020", "08:00 - 20:00"),
    ("UC001", "Addenbrooke's Urgent Treatment Centre", "Hills Road, Cambridge", "CB2 0QQ", "URGENT_CARE", 1, 52.1755, 0.1405, "01223 555 030", "24 hours"),
    ("WIC002", "North Cambridge Minor Injuries", "100 Arbury Road, Cambridge", "CB4 2LD", "WALK_IN", 1, 52.2320, 0.1380, "01223 555 021", "09:00 - 18:00"),
    ("GPNOW-WIC-003", "East Cambridge Same Day Centre", "90 Newmarket Road, Cambridge", "CB5 8DZ", "WALK_IN", 1, 52.2110, 0.1450, "01223 555 022", "08:00 - 20:00"),
]

PHARMACIES = [
    ("pharm-01", "Boots Cambridge Grand Arcade", "1 Grand Arcade, Cambridge CB2 3QA", 52.2055, 0.1220, {"paracetamol": 42, "ibuprofen": 15, "amoxicillin": 8, "salbutamol-inhaler": 0, "cetirizine": 32, "oral-rehydration-salts": 18}),
    ("pharm-02", "LloydsPharmacy Mill Road", "189 Mill Road, Cambridge CB1 3BA", 52.2020, 0.1400, {"paracetamol": 120, "ibuprofen": 67, "amoxicillin": 0, "salbutamol-inhaler": 12, "cetirizine": 44, "omeprazole": 20}),
    ("pharm-03", "Tesco Pharmacy Newmarket Road", "Newmarket Road, Cambridge CB5 8JJ", 52.2100, 0.1380, {"paracetamol": 250, "ibuprofen": 180, "amoxicillin": 45, "salbutamol-inhaler": 30, "cetirizine": 90, "hydrocortisone": 24}),
    ("pharm-04", "Superdrug Pharmacy Market Street", "46 Market Street, Cambridge CB1 1NU", 52.2050, 0.1190, {"paracetamol": 5, "ibuprofen": 3, "amoxicillin": 0, "salbutamol-inhaler": 2, "cetirizine": 7, "oral-rehydration-salts": 4}),
    ("pharm-05", "Well Pharmacy Arbury", "7 Arbury Court, Cambridge CB4 2QA", 52.2300, 0.1420, {"paracetamol": 89, "ibuprofen": 54, "amoxicillin": 22, "salbutamol-inhaler": 8, "cetirizine": 30, "omeprazole": 14}),
    ("pharm-06", "Asda Pharmacy Coldhams Lane", "1 Coldhams Lane, Cambridge CB1 3HP", 52.1950, 0.1450, {"paracetamol": 200, "ibuprofen": 140, "amoxicillin": 60, "salbutamol-inhaler": 25, "cetirizine": 75, "hydrocortisone": 11}),
    ("pharm-07", "Cambridge Central Pharmacy", "9 Hills Road, Cambridge CB2 1JP", 52.1970, 0.1280, {"paracetamol": 65, "ibuprofen": 28, "amoxicillin": 6, "salbutamol-inhaler": 4, "cetirizine": 21, "oral-rehydration-salts": 12}),
    ("pharm-08", "Trumpington Community Pharmacy", "4 Marleigh Avenue, Trumpington CB2 9FN", 52.1740, 0.1150, {"paracetamol": 80, "ibuprofen": 45, "amoxicillin": 10, "salbutamol-inhaler": 6, "cetirizine": 26, "omeprazole": 16}),
    ("pharm-09", "Chesterton Pharmacy", "105 Chesterton Road, Cambridge CB4 3AT", 52.2160, 0.1400, {"paracetamol": 72, "ibuprofen": 19, "amoxicillin": 3, "salbutamol-inhaler": 10, "cetirizine": 33, "hydrocortisone": 9}),
    ("pharm-10", "West Cambridge Pharmacy", "22 Storey's Way, Cambridge CB3 0DS", 52.2130, 0.1050, {"paracetamol": 110, "ibuprofen": 60, "amoxicillin": 18, "salbutamol-inhaler": 14, "cetirizine": 50, "oral-rehydration-salts": 20}),
]

SLOT_PLANS = {
    "G82001": [(2, 10, "GP"), (4, 10, "Advanced Nurse Practitioner"), (27, 10, "GP")],
    "G82002": [(3, 10, "GP"), (6, 10, "GP")],
    "G82003": [(5, 10, "GP"), (29, 10, "Practice Nurse")],
    "G82004": [(2, 10, "GP"), (26, 10, "GP")],
    "G82005": [(8, 10, "GP"), (31, 10, "GP")],
    "G82006": [(4, 10, "GP"), (28, 10, "Advanced Nurse Practitioner")],
    "GPNOW-GP-007": [(7, 10, "GP"), (34, 10, "GP")],
    "GPNOW-GP-008": [(9, 10, "GP"), (36, 10, "Practice Nurse")],
    "WIC001": [(1, 15, "Nurse Practitioner"), (3, 15, "Nurse Practitioner"), (22, 15, "Practice Nurse")],
    "UC001": [(1, 60, "Emergency Nurse"), (5, 60, "Emergency Nurse"), (30, 60, "Emergency Nurse")],
    "WIC002": [(2, 15, "Practice Nurse"), (10, 15, "Nurse Practitioner")],
    "GPNOW-WIC-003": [(2, 15, "Nurse Practitioner"), (6, 15, "Practice Nurse")],
}


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def build_sql() -> str:
    statements = ["PRAGMA foreign_keys = ON;"]
    for row in PRACTICES:
        values = ", ".join(sql(value) for value in row)
        statements.append(
            f"INSERT INTO practices (ods_code, name, address, postcode, type, accepts_out_of_area, latitude, longitude, phone, opening_hours) VALUES ({values}) "
            "ON CONFLICT(ods_code) DO UPDATE SET name=excluded.name, address=excluded.address, postcode=excluded.postcode, "
            "type=excluded.type, accepts_out_of_area=excluded.accepts_out_of_area, latitude=excluded.latitude, longitude=excluded.longitude, "
            "phone=excluded.phone, opening_hours=excluded.opening_hours;"
        )

    for pharmacy_id, name, address, lat, lng, stock in PHARMACIES:
        stock_json = {
            medicine: {"quantity": quantity, "lastChecked": "2026-07-22T08:00:00Z"}
            for medicine, quantity in stock.items()
        }
        values = ", ".join(sql(value) for value in (pharmacy_id, None, name, address, lat, lng, json.dumps(stock_json, separators=(",", ":"))))
        statements.append(
            f"INSERT INTO pharmacies (id, ods_code, name, address, latitude, longitude, stock_json) VALUES ({values}) "
            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, address=excluded.address, latitude=excluded.latitude, "
            "longitude=excluded.longitude, stock_json=excluded.stock_json, updated_at=datetime('now');"
        )

    for ods_code, plans in SLOT_PLANS.items():
        for index, (hours_from_now, duration_minutes, role) in enumerate(plans, start=1):
            slot_id = f"demo-{ods_code.lower()}-{index:02d}"
            start = f"datetime('now', '+{hours_from_now} hours')"
            end = f"datetime('now', '+{hours_from_now} hours', '+{duration_minutes} minutes')"
            statements.append(
                "INSERT INTO slots (id, ods_code, start_time, end_time, practitioner_role, status, source) "
                f"VALUES ({sql(slot_id)}, {sql(ods_code)}, {start}, {end}, {sql(role)}, 'FREE', 'GPNow demo seed') "
                "ON CONFLICT(id) DO UPDATE SET ods_code=excluded.ods_code, start_time=excluded.start_time, end_time=excluded.end_time, "
                "practitioner_role=excluded.practitioner_role, status='FREE', source=excluded.source, updated_at=datetime('now');"
            )

    statements.extend([
        "SELECT 'practices' AS table_name, COUNT(*) AS rows FROM practices UNION ALL SELECT 'pharmacies', COUNT(*) FROM pharmacies UNION ALL SELECT 'slots', COUNT(*) FROM slots;",
    ])
    return "\n".join(statements) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", choices=("remote", "local"), default="remote")
    args = parser.parse_args()

    with tempfile.NamedTemporaryFile("w", suffix="-gpnow-demo.sql", delete=False) as sql_file:
        sql_file.write(build_sql())
        sql_path = Path(sql_file.name)

    try:
        command = [
            "pnpm", "--filter", "@gpnow/worker", "exec", "wrangler", "d1", "execute", "gpnow-db",
            f"--{args.target}", f"--file={sql_path}",
        ]
        print(f"Seeding {args.target} D1 with synthetic GPNow demo data...")
        subprocess.run(command, cwd=ROOT, check=True)
    finally:
        sql_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
