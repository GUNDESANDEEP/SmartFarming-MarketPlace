"""
Migration script: Add premium subscription columns to users table
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv('DATABASE_URL', '')

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    migrations = [
        # Add premium columns to users table
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
        """,
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS premium_plan VARCHAR(20) DEFAULT NULL;
        """,
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMP DEFAULT NULL;
        """,
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP DEFAULT NULL;
        """,
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS premium_payment_ref VARCHAR(255) DEFAULT NULL;
        """,
        # Create premium_subscriptions tracking table
        """
        CREATE TABLE IF NOT EXISTS premium_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            plan VARCHAR(20) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'upi',
            payment_ref VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
            started_at TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_premium_subs_user ON premium_subscriptions(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_premium_subs_status ON premium_subscriptions(status);",
    ]
    
    print("Running premium subscription migration...")
    for i, sql in enumerate(migrations):
        try:
            cursor.execute(sql)
            conn.commit()
            print(f"  [OK] Migration {i+1} applied")
        except Exception as e:
            conn.rollback()
            err = str(e)
            if 'already exists' in err.lower():
                print(f"  [SKIP] Migration {i+1} already exists")
            else:
                print(f"  [ERR] Migration {i+1}: {err}")
    
    cursor.close()
    conn.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate()
