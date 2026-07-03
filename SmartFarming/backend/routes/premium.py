"""
Premium Subscription Routes
Handles premium plan activation, status checking, and subscription management.
Supports both UPI (manual) and Stripe (automated) payment methods.
"""

from fastapi import APIRouter, Request, Query, Depends
from fastapi.responses import JSONResponse
from utils.jwt_utils import get_current_user
from datetime import datetime, timedelta, timezone
from models.models import BaseModel
from dotenv import load_dotenv
import os
import json

load_dotenv()

premium_router = APIRouter(prefix='/api/premium', tags=['Premium'])

# ── Admin UPI Details (hidden from frontend, only used for QR generation) ──
ADMIN_UPI_ID = "9347538630@ybl"  # Admin's UPI linked to phone 9347538630
ADMIN_UPI_NAME = "SmartFarm Admin"
ADMIN_PHONE = "9347538630"

# ── Stripe ──
stripe_client = None
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET', '')
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_KEY', os.getenv('STRIPE_PUBLISHABLE_KEY', ''))
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
try:
    import stripe
    if STRIPE_SECRET_KEY:
        stripe.api_key = STRIPE_SECRET_KEY
        stripe_client = stripe
        print("[OK] Premium: Stripe configured")
    else:
        print("[SKIP] Premium: Stripe keys not set")
except ImportError:
    print("[SKIP] Premium: stripe not installed")

# ── Plan Pricing (INR) ──
PLANS = {
    'free':    {'months': 0,  'price': 0,    'label': 'Free',       'stripe_price_inr': 0},
    'pro':     {'months': 1,  'price': 99,   'label': 'Pro',        'stripe_price_inr': 9900},
    'vip':     {'months': 1,  'price': 249,  'label': 'VIP',        'stripe_price_inr': 24900},
    'monthly':     {'months': 1,  'price': 59,  'label': '1 Month',  'stripe_price_inr': 5900},
    'halfYearly':  {'months': 6,  'price': 299, 'label': '6 Months', 'stripe_price_inr': 29900},
    'yearly':      {'months': 12, 'price': 549, 'label': '1 Year',   'stripe_price_inr': 54900},
}


@premium_router.get('/status')
async def get_premium_status(request: Request, user_id: str = Depends(get_current_user)):
    """Check if user has active premium subscription"""
    try:
        user = BaseModel.execute_query(
            "SELECT is_premium, premium_plan, premium_started_at, premium_expires_at FROM users WHERE id = %s",
            (user_id,), fetch_one=True
        )
        
        if not user:
            return JSONResponse(status_code=404, content={'error': 'User not found'})
        
        is_premium = user.get('is_premium', False)
        expires_at = user.get('premium_expires_at')
        
        # Check if premium has expired
        if is_premium and expires_at:
            if datetime.now() > expires_at:
                # Premium expired — deactivate
                BaseModel.execute_query(
                    "UPDATE users SET is_premium = FALSE WHERE id = %s",
                    (user_id,)
                )
                is_premium = False
        
        return {
            'is_premium': is_premium,
            'plan': user.get('premium_plan'),
            'started_at': user['premium_started_at'].isoformat() if user.get('premium_started_at') else None,
            'expires_at': expires_at.isoformat() if expires_at else None,
            'days_remaining': (expires_at - datetime.now()).days if is_premium and expires_at else 0,
        }
        
    except Exception as e:
        print(f"[PREMIUM] Error checking status: {e}")
        return JSONResponse(status_code=500, content={'error': 'Failed to check premium status'})


@premium_router.post('/upi-details')
async def get_upi_payment_details(request: Request, user_id: str = Depends(get_current_user)):
    """Generate UPI payment link for the selected plan"""
    data = (await request.json()) or {}
    plan_key = data.get('plan', 'monthly')
    
    if plan_key not in PLANS or PLANS[plan_key]['price'] == 0:
        return JSONResponse(status_code=400, content={'error': 'Invalid plan'})
    
    plan = PLANS[plan_key]
    amount = plan['price']
    
    # Generate UPI deep link
    upi_link = f"upi://pay?pa={ADMIN_UPI_ID}&pn={ADMIN_UPI_NAME}&am={amount}&cu=INR&tn=SmartFarm-Premium-{plan_key}-User{user_id}"
    
    # QR code URL (using Google Charts API — no external lib needed)
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={upi_link}"
    
    return {
        'upi_link': upi_link,
        'qr_url': qr_url,
        'amount': amount,
        'plan': plan_key,
        'plan_label': plan['label'],
        'upi_id': ADMIN_UPI_ID,
    }


@premium_router.post('/activate')
async def activate_premium(request: Request, user_id: str = Depends(get_current_user)):
    """Activate premium after user confirms payment"""
    data = (await request.json()) or {}
    plan_key = data.get('plan', 'monthly')
    payment_ref = data.get('payment_ref', '')  # UPI transaction ID (optional)
    
    if plan_key not in PLANS or PLANS[plan_key]['price'] == 0:
        return JSONResponse(status_code=400, content={'error': 'Invalid plan'})
    
    plan = PLANS[plan_key]
    months = plan['months']
    amount = plan['price']
    
    now = datetime.now()
    expires_at = now + timedelta(days=months * 30)
    
    try:
        # Update user premium status
        BaseModel.execute_query(
            """UPDATE users 
               SET is_premium = TRUE, 
                   premium_plan = %s,
                   premium_started_at = %s, 
                   premium_expires_at = %s,
                   premium_payment_ref = %s
               WHERE id = %s""",
            (plan_key, now, expires_at, payment_ref, user_id)
        )
        
        # Log subscription
        BaseModel.execute_query(
            """INSERT INTO premium_subscriptions 
               (user_id, plan, amount, payment_method, payment_ref, status, started_at, expires_at)
               VALUES (%s, %s, %s, 'upi', %s, 'active', %s, %s)""",
            (user_id, plan_key, amount, payment_ref, now, expires_at)
        )
        
        return {
            'success': True,
            'message': 'Premium activated successfully!',
            'is_premium': True,
            'plan': plan_key,
            'expires_at': expires_at.isoformat(),
            'days_remaining': (expires_at - now).days,
        }
        
    except Exception as e:
        print(f"[PREMIUM] Activation error: {e}")
        return JSONResponse(status_code=500, content={'error': 'Failed to activate premium'})


# ============================================================================
# STRIPE SUBSCRIPTION — Automated card-based subscriptions
# ============================================================================

@premium_router.post('/create-stripe-subscription')
async def create_stripe_subscription(request: Request, user_id: str = Depends(get_current_user)):
    """Create a Stripe Checkout Session for a premium subscription"""
    if not stripe_client:
        return JSONResponse(status_code=503, content={
            'success': False, 'error': 'Stripe is not configured. Please use UPI payment.'
        })

    data = (await request.json()) or {}
    plan_key = data.get('plan', 'pro')

    if plan_key not in PLANS or PLANS[plan_key]['price'] == 0:
        return JSONResponse(status_code=400, content={'success': False, 'error': 'Invalid plan'})

    plan = PLANS[plan_key]
    amount_paise = plan['stripe_price_inr']

    # Get user email
    user = BaseModel.execute_query(
        "SELECT email, first_name FROM users WHERE id = %s",
        (user_id,), fetch_one=True
    )
    customer_email = user.get('email', '') if user else ''

    try:
        session = stripe_client.checkout.Session.create(
            payment_method_types=['card'],
            mode='payment',  # One-time payment for subscription period
            currency='inr',
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'unit_amount': amount_paise,
                    'product_data': {
                        'name': f'SmartFarm {plan["label"]} Plan',
                        'description': f'Premium subscription — {plan["label"]} ({plan["months"]} month{"s" if plan["months"] != 1 else ""})',
                    },
                },
                'quantity': 1,
            }],
            metadata={
                'user_id': str(user_id),
                'plan': plan_key,
                'type': 'premium_subscription',
            },
            customer_email=customer_email,
            success_url=f'{FRONTEND_URL}/buyer/settings?subscription=success&session_id={{CHECKOUT_SESSION_ID}}&plan={plan_key}',
            cancel_url=f'{FRONTEND_URL}/buyer/settings?subscription=cancelled',
        )

        return {
            'success': True,
            'session_id': session.id,
            'session_url': session.url,
        }

    except Exception as e:
        print(f"[PREMIUM Stripe] Session creation error: {e}")
        return JSONResponse(status_code=500, content={'success': False, 'error': 'Failed to create payment session'})


@premium_router.post('/verify-stripe-subscription')
async def verify_stripe_subscription(request: Request, user_id: str = Depends(get_current_user)):
    """Verify Stripe payment and activate premium after redirect"""
    if not stripe_client:
        return JSONResponse(status_code=503, content={'success': False, 'error': 'Stripe not configured'})

    data = (await request.json()) or {}
    session_id = data.get('session_id')
    plan_key = data.get('plan', 'pro')

    if not session_id:
        return JSONResponse(status_code=400, content={'success': False, 'error': 'session_id is required'})

    try:
        session = stripe_client.checkout.Session.retrieve(session_id)

        if session.payment_status != 'paid':
            return JSONResponse(content={'success': False, 'error': 'Payment not completed'})

        # Verify this is for the right user
        if session.metadata.get('user_id') != str(user_id):
            return JSONResponse(status_code=403, content={'success': False, 'error': 'Payment mismatch'})

        plan = PLANS.get(plan_key, PLANS.get('pro'))
        months = plan['months']
        amount = plan['price']
        now = datetime.now()
        expires_at = now + timedelta(days=months * 30)

        # Activate premium
        BaseModel.execute_query(
            """UPDATE users 
               SET is_premium = TRUE, 
                   premium_plan = %s,
                   premium_started_at = %s, 
                   premium_expires_at = %s,
                   premium_payment_ref = %s
               WHERE id = %s""",
            (plan_key, now, expires_at, session.payment_intent, user_id)
        )

        # Log subscription
        BaseModel.execute_query(
            """INSERT INTO premium_subscriptions 
               (user_id, plan, amount, payment_method, payment_ref, status, started_at, expires_at)
               VALUES (%s, %s, %s, 'stripe', %s, 'active', %s, %s)""",
            (user_id, plan_key, amount, session.payment_intent, now, expires_at)
        )

        return {
            'success': True,
            'message': f'{plan["label"]} plan activated!',
            'is_premium': True,
            'plan': plan_key,
            'expires_at': expires_at.isoformat(),
            'days_remaining': (expires_at - now).days,
        }

    except Exception as e:
        print(f"[PREMIUM Stripe] Verify error: {e}")
        return JSONResponse(status_code=500, content={'success': False, 'error': 'Failed to verify subscription payment'})


@premium_router.post('/cancel')
async def cancel_subscription(request: Request, user_id: str = Depends(get_current_user)):
    """Cancel active premium subscription"""
    try:
        BaseModel.execute_query(
            "UPDATE users SET is_premium = FALSE, premium_plan = NULL WHERE id = %s",
            (user_id,)
        )
        BaseModel.execute_query(
            "UPDATE premium_subscriptions SET status = 'cancelled' WHERE user_id = %s AND status = 'active'",
            (user_id,)
        )
        return {'success': True, 'message': 'Subscription cancelled'}
    except Exception as e:
        print(f"[PREMIUM] Cancel error: {e}")
        return JSONResponse(status_code=500, content={'error': 'Failed to cancel subscription'})


@premium_router.get('/plans')
async def get_plans():
    """Get available premium plans"""
    return JSONResponse(content={
        'plans': {k: {**v, 'key': k} for k, v in PLANS.items() if v['price'] > 0},
        'admin_upi': ADMIN_UPI_ID,
        'stripe_enabled': stripe_client is not None,
    })
