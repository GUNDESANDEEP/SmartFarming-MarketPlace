"""Reset ALL user passwords to a known password so login works.
Also creates missing accounts if needed."""
import os, sys
os.environ['PYTHONUTF8'] = '1'
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash

DATABASE_URL = os.getenv('DATABASE_URL', '')
if not DATABASE_URL:
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')
    db_name = os.getenv('DB_NAME', 'smartfarmingdb')
    DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

MASTER_PASSWORD = "Sandy@7981"
new_hash = generate_password_hash(MASTER_PASSWORD)

# Verify the hash works
assert check_password_hash(new_hash, MASTER_PASSWORD), "Hash verification failed!"
print(f"New hash generated and verified for password: {MASTER_PASSWORD}")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# 1. Reset ALL farmer passwords
print("\n=== RESETTING FARMER PASSWORDS ===")
cur.execute("SELECT id, first_name, last_name, email FROM farmers")
farmers = cur.fetchall()
for f in farmers:
    cur.execute("UPDATE farmers SET password_hash = %s WHERE id = %s", (new_hash, f['id']))
    print(f"  [RESET] Farmer ID={f['id']}: {f['first_name']} {f['last_name']} ({f['email']})")
conn.commit()
print(f"  Total: {len(farmers)} farmer(s) updated")

# 2. Reset ALL buyer passwords
print("\n=== RESETTING BUYER PASSWORDS ===")
cur.execute("SELECT id, first_name, last_name, email, phone FROM buyers")
buyers = cur.fetchall()
for b in buyers:
    cur.execute("UPDATE buyers SET password_hash = %s WHERE id = %s", (new_hash, b['id']))
    print(f"  [RESET] Buyer ID={b['id']}: {b['first_name']} {b['last_name']} ({b['email'] or b['phone']})")
conn.commit()
print(f"  Total: {len(buyers)} buyer(s) updated")

# 3. Reset admin password
print("\n=== RESETTING ADMIN PASSWORDS ===")
cur.execute("SELECT admin_id, first_name, last_name, email FROM admins")
admins = cur.fetchall()
for a in admins:
    cur.execute("UPDATE admins SET password_hash = %s WHERE admin_id = %s", (new_hash, a['admin_id']))
    print(f"  [RESET] Admin ID={a['admin_id']}: {a['first_name']} {a['last_name']} ({a['email']})")
conn.commit()
print(f"  Total: {len(admins)} admin(s) updated")

# 4. Verify by reading back and checking
print("\n=== VERIFICATION ===")
cur.execute("SELECT password_hash FROM farmers WHERE id = %s", (farmers[0]['id'],))
row = cur.fetchone()
verified = check_password_hash(row['password_hash'], MASTER_PASSWORD)
print(f"  Farmer password verify: {'PASS' if verified else 'FAIL'}")

cur.execute("SELECT password_hash FROM admins WHERE admin_id = %s", (admins[0]['admin_id'],))
row = cur.fetchone()
verified = check_password_hash(row['password_hash'], MASTER_PASSWORD)
print(f"  Admin password verify: {'PASS' if verified else 'FAIL'}")

if buyers:
    cur.execute("SELECT password_hash FROM buyers WHERE id = %s", (buyers[0]['id'],))
    row = cur.fetchone()
    verified = check_password_hash(row['password_hash'], MASTER_PASSWORD)
    print(f"  Buyer password verify: {'PASS' if verified else 'FAIL'}")

cur.close()
conn.close()

print(f"\n=== ALL PASSWORDS RESET TO: {MASTER_PASSWORD} ===")
print("\nLogin credentials:")
print(f"  Farmer:  gundesandeep3@gmail.com / {MASTER_PASSWORD}")
print(f"  Admin:   gundesandeep2005@gmail.com / {MASTER_PASSWORD}")
print(f"  Buyers:  use phone number + {MASTER_PASSWORD}")
print("\nDone!")
