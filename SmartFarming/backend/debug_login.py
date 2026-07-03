"""Debug farmer login - check database and password hash"""
import os, sys
os.environ['PYTHONUTF8'] = '1'
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import check_password_hash, generate_password_hash

DATABASE_URL = os.getenv('DATABASE_URL', '')
if not DATABASE_URL:
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')
    db_name = os.getenv('DB_NAME', 'smartfarmingdb')
    DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# 1. List all farmers
print("\n=== ALL FARMERS ===")
cur.execute("SELECT id, first_name, last_name, email, phone, password_hash FROM farmers")
farmers = cur.fetchall()
if not farmers:
    print("NO FARMERS FOUND IN DATABASE!")
else:
    for f in farmers:
        print(f"  ID={f['id']}, Name={f['first_name']} {f['last_name']}, Email={f['email']}, Phone={f['phone']}")
        pw_hash = f['password_hash']
        print(f"  Hash: {pw_hash[:80]}")
        
        test_passwords = ["Sandy@7981", "test123", "123456", "password", "Aruna", "aruna"]
        for pwd in test_passwords:
            try:
                result = check_password_hash(pw_hash, pwd)
                status = "MATCH!" if result else "no"
                print(f"    '{pwd}' -> {status}")
            except Exception as e:
                print(f"    '{pwd}' -> ERROR: {e}")

# 2. List all buyers
print("\n=== ALL BUYERS ===")
cur.execute("SELECT id, first_name, last_name, email, phone, password_hash FROM buyers")
buyers = cur.fetchall()
if not buyers:
    print("NO BUYERS FOUND!")
else:
    for b in buyers:
        print(f"  ID={b['id']}, Name={b['first_name']} {b['last_name']}, Email={b['email']}, Phone={b['phone']}")
        pw_hash = b['password_hash']
        test_passwords = ["Sandy@7981", "test123", "123456"]
        for pwd in test_passwords:
            try:
                result = check_password_hash(pw_hash, pwd)
                status = "MATCH!" if result else "no"
                print(f"    '{pwd}' -> {status}")
            except Exception as e:
                print(f"    '{pwd}' -> ERROR: {e}")

# 3. List admins
print("\n=== ALL ADMINS ===")
cur.execute("SELECT admin_id, first_name, last_name, email, password_hash FROM admins")
admins = cur.fetchall()
if not admins:
    print("NO ADMINS FOUND!")
else:
    for a in admins:
        print(f"  ID={a['admin_id']}, Name={a['first_name']} {a['last_name']}, Email={a['email']}")
        pw_hash = a['password_hash']
        test_passwords = ["Sandy@7981", "test123", "admin123"]
        for pwd in test_passwords:
            try:
                result = check_password_hash(pw_hash, pwd)
                status = "MATCH!" if result else "no"
                print(f"    '{pwd}' -> {status}")
            except Exception as e:
                print(f"    '{pwd}' -> ERROR: {e}")

cur.close()
conn.close()
print("\nDone!")
