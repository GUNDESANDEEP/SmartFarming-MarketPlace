"""
Buyer Settings API - Preferences, Subscription, Permissions
Stores all settings in buyer_settings table in PostgreSQL
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from utils.jwt_utils import get_current_user
from models.models import BaseModel
from datetime import datetime
import json

settings_router = APIRouter(prefix='/api/buyer', tags=['Buyer Settings'])


def get_db():
    """Get database connection from pool"""
    bm = BaseModel()
    return bm.get_db()


def ensure_settings_table():
    """Create buyer_settings table if not exists"""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS buyer_settings (
                id SERIAL PRIMARY KEY,
                buyer_id INT NOT NULL,
                setting_key VARCHAR(100) NOT NULL,
                setting_value TEXT DEFAULT '',
                setting_type VARCHAR(20) DEFAULT 'boolean',
                category VARCHAR(50) DEFAULT 'general',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(buyer_id, setting_key)
            );
            CREATE INDEX IF NOT EXISTS idx_buyer_settings_buyer ON buyer_settings(buyer_id);
        """)
        conn.commit()
        cur.close()
    except Exception as e:
        conn.rollback()
        print(f"[Settings] Table creation error: {e}")
    finally:
        try:
            from models.models import db_pool
            if db_pool:
                db_pool.putconn(conn)
        except:
            pass


# Default settings for new buyers
DEFAULT_SETTINGS = {
    # Communication
    'chat_with_farmers': {'value': 'true', 'type': 'boolean', 'category': 'communication'},
    'notifications_enabled': {'value': 'true', 'type': 'boolean', 'category': 'communication'},
    'price_drop_alerts': {'value': 'true', 'type': 'boolean', 'category': 'communication'},
    'order_updates': {'value': 'true', 'type': 'boolean', 'category': 'communication'},
    'promotional_emails': {'value': 'false', 'type': 'boolean', 'category': 'communication'},

    # Features
    'early_product_access': {'value': 'false', 'type': 'boolean', 'category': 'features'},
    'personalized_recommendations': {'value': 'true', 'type': 'boolean', 'category': 'features'},
    'ai_shopping_assistant': {'value': 'true', 'type': 'boolean', 'category': 'features'},
    'exclusive_deals': {'value': 'false', 'type': 'boolean', 'category': 'features'},

    # VIP / Premium
    'vip_offers': {'value': 'false', 'type': 'boolean', 'category': 'premium'},
    'first_access_products': {'value': 'false', 'type': 'boolean', 'category': 'premium'},
    'highest_support_priority': {'value': 'false', 'type': 'boolean', 'category': 'premium'},
    'future_ai_features': {'value': 'false', 'type': 'boolean', 'category': 'premium'},

    # Permissions
    'location_access': {'value': 'false', 'type': 'boolean', 'category': 'permissions'},
    'camera_access': {'value': 'false', 'type': 'boolean', 'category': 'permissions'},
    'contact_sharing': {'value': 'false', 'type': 'boolean', 'category': 'permissions'},
    'data_analytics_consent': {'value': 'false', 'type': 'boolean', 'category': 'permissions'},

    # Subscription
    'subscription_plan': {'value': 'free', 'type': 'string', 'category': 'subscription'},
    'auto_renew': {'value': 'false', 'type': 'boolean', 'category': 'subscription'},
}


@settings_router.get('/settings')
async def get_settings(request: Request):
    """Get all buyer settings"""
    try:
        user = await get_current_user(request)
        if not user:
            return JSONResponse({'success': False, 'error': 'Unauthorized'}, 401)

        buyer_id = user.get('sub') or user.get('user_id') or user.get('id')
        ensure_settings_table()

        conn = get_db()
        try:
            cur = conn.cursor()

            # Get existing settings
            cur.execute(
                "SELECT setting_key, setting_value, setting_type, category FROM buyer_settings WHERE buyer_id = %s",
                (buyer_id,)
            )
            rows = cur.fetchall()

            settings = {}
            found_keys = set()
            for row in rows:
                key, value, stype, category = row
                found_keys.add(key)
                settings[key] = {
                    'value': value,
                    'type': stype,
                    'category': category,
                }

            # Fill missing with defaults and insert them
            for key, default in DEFAULT_SETTINGS.items():
                if key not in found_keys:
                    settings[key] = default
                    try:
                        cur.execute(
                            """INSERT INTO buyer_settings (buyer_id, setting_key, setting_value, setting_type, category)
                               VALUES (%s, %s, %s, %s, %s) ON CONFLICT (buyer_id, setting_key) DO NOTHING""",
                            (buyer_id, key, default['value'], default['type'], default['category'])
                        )
                    except:
                        pass

            conn.commit()
            cur.close()

            return JSONResponse({
                'success': True,
                'settings': settings,
                'buyer_id': buyer_id,
            })
        finally:
            try:
                from models.models import db_pool
                if db_pool:
                    db_pool.putconn(conn)
            except:
                pass

    except Exception as e:
        return JSONResponse({'success': False, 'error': str(e)}, 500)


@settings_router.put('/settings')
async def update_settings(request: Request):
    """Update one or more buyer settings"""
    try:
        user = await get_current_user(request)
        if not user:
            return JSONResponse({'success': False, 'error': 'Unauthorized'}, 401)

        buyer_id = user.get('sub') or user.get('user_id') or user.get('id')
        body = await request.json()
        updates = body.get('settings', {})

        if not updates:
            return JSONResponse({'success': False, 'error': 'No settings provided'}, 400)

        ensure_settings_table()

        conn = get_db()
        try:
            cur = conn.cursor()
            updated_count = 0

            for key, value in updates.items():
                stype = DEFAULT_SETTINGS.get(key, {}).get('type', 'boolean')
                category = DEFAULT_SETTINGS.get(key, {}).get('category', 'general')
                str_value = str(value) if not isinstance(value, str) else value

                cur.execute(
                    """INSERT INTO buyer_settings (buyer_id, setting_key, setting_value, setting_type, category, updated_at)
                       VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                       ON CONFLICT (buyer_id, setting_key)
                       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP""",
                    (buyer_id, key, str_value, stype, category)
                )
                updated_count += 1

            conn.commit()
            cur.close()

            return JSONResponse({
                'success': True,
                'message': f'{updated_count} setting(s) updated',
                'updated': updated_count,
            })
        finally:
            try:
                from models.models import db_pool
                if db_pool:
                    db_pool.putconn(conn)
            except:
                pass

    except Exception as e:
        return JSONResponse({'success': False, 'error': str(e)}, 500)


@settings_router.delete('/settings/{key}')
async def delete_setting(key: str, request: Request):
    """Delete a specific setting (resets to default)"""
    try:
        user = await get_current_user(request)
        if not user:
            return JSONResponse({'success': False, 'error': 'Unauthorized'}, 401)

        buyer_id = user.get('sub') or user.get('user_id') or user.get('id')

        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM buyer_settings WHERE buyer_id = %s AND setting_key = %s",
                (buyer_id, key)
            )
            conn.commit()
            cur.close()

            return JSONResponse({
                'success': True,
                'message': f'Setting "{key}" removed (will use default)',
            })
        finally:
            try:
                from models.models import db_pool
                if db_pool:
                    db_pool.putconn(conn)
            except:
                pass

    except Exception as e:
        return JSONResponse({'success': False, 'error': str(e)}, 500)
