import psycopg2, os
from dotenv import load_dotenv
load_dotenv()

db_url = os.getenv('DATABASE_URL', '')
if db_url and 'sslmode' not in db_url:
    db_url += '&sslmode=require' if '?' in db_url else '?sslmode=require'
conn = psycopg2.connect(db_url, connect_timeout=10)
cur = conn.cursor()

for table in ['users', 'admins', 'farmers', 'buyers', 'orders', 'products']:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table,))
    cols = [r[0] for r in cur.fetchall()]
    if cols:
        print(f"{table}: {', '.join(cols)}")
    else:
        print(f"{table}: TABLE DOES NOT EXIST")
    print()

cur.close()
conn.close()

