"""
Buyer Module - Complete Shopping, Orders and Payments
"""

from fastapi import APIRouter, Request, Query, Depends
from fastapi.responses import JSONResponse
from utils.jwt_utils import get_current_user
from models.models import (
    User, Buyer, Product, Order, Payment, Review, Cart, Notification,
    Wallet, Transaction, BaseModel, Message, Conversation
)
from datetime import datetime
import json
try:
    import razorpay
    RAZORPAY_AVAILABLE = True
except ImportError:
    RAZORPAY_AVAILABLE = False
    print("[SKIP] razorpay not installed - payment features disabled")
import os
from dotenv import load_dotenv

load_dotenv()

buyer_router = APIRouter(prefix='/api/buyer', tags=['Buyer'])


# ============================================================================
# HELPER: Resolve buyer from JWT (supports farmers shopping as buyers)
# ============================================================================

async def get_or_create_buyer(user_id):
    """
    Get buyer by JWT identity. Checks multiple lookup paths:
    1. buyers.id = user_id
    2. buyers.buyer_id = user_id
    3. If user is a farmer, auto-create buyer record
    4. If user is an admin, auto-create buyer record
    Also checks JWT claims for role hints.
    """
    uid = int(user_id)
    
    # Try 1: Direct buyer id lookup
    buyer = BaseModel.execute_query(
        "SELECT * FROM buyers WHERE id = %s", (uid,), fetch_one=True
    )
    if buyer:
        return buyer
    
    # Try 2: buyer_id lookup (used by buyer_auth.py login)
    buyer = BaseModel.execute_query(
        "SELECT * FROM buyers WHERE buyer_id = %s", (uid,), fetch_one=True
    )
    if buyer:
        return buyer
    
    # Try 3: Check if user is a farmer — auto-create buyer record
    farmer = BaseModel.execute_query(
        "SELECT * FROM farmers WHERE id = %s", (uid,), fetch_one=True
    )
    if farmer:
        return _create_buyer_from_record(farmer, uid)
    
    # Try 4: Check if user is an admin — auto-create buyer record
    admin = BaseModel.execute_query(
        "SELECT * FROM admins WHERE admin_id = %s", (uid,), fetch_one=True
    )
    if admin:
        return _create_buyer_from_record(admin, uid)
    
    return None


async def _create_buyer_from_record(record, uid):
    """Create a buyer record from a farmer/admin record"""
    try:
        buyer_id = BaseModel.execute_insert(
            """INSERT INTO buyers (first_name, last_name, email, phone, password_hash, location, buyer_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (record.get('first_name', ''), record.get('last_name', ''),
             record.get('email', ''), record.get('phone', ''),
             record.get('password_hash', ''), record.get('location', ''),
             uid)
        )
        return BaseModel.execute_query(
            "SELECT * FROM buyers WHERE id = %s", (buyer_id,), fetch_one=True
        )
    except Exception as e:
        # If insert fails (e.g. duplicate phone/email), find by email/phone
        buyer = BaseModel.execute_query(
            "SELECT * FROM buyers WHERE email = %s OR phone = %s",
            (record.get('email', ''), record.get('phone', '')), fetch_one=True
        )
        return buyer


# Initialize Razorpay
razorpay_client = None
if RAZORPAY_AVAILABLE:
    try:
        razorpay_client = razorpay.Client(
            auth=(os.getenv('RAZORPAY_KEY_ID', ''), os.getenv('RAZORPAY_KEY_SECRET', ''))
        )
    except Exception:
        razorpay_client = None

# ============================================================================
# PRODUCT BROWSING & SEARCH
# ============================================================================

@buyer_router.get('/products')
async def browse_products(request: Request):
    """Browse available products"""
    try:
        search_term = request.query_params.get('search', '').strip()
        category = request.query_params.get('category', '').strip()
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        sort_by = request.query_params.get('sort', 'newest')
        offset = (page - 1) * limit
        
        query = """
            SELECT p.*, 
                   CONCAT(f.first_name, ' ', COALESCE(f.last_name, '')) as farmer_name,
                   f.location as farmer_location
            FROM products p 
            LEFT JOIN farmers f ON p.farmer_id = f.id 
            WHERE (p.is_available = TRUE AND p.status = 'approved')
               OR p.status = 'sold_out'
        """
        params = []
        
        if search_term:
            query += " AND (p.name ILIKE %s OR p.description ILIKE %s OR p.category ILIKE %s)"
            like = f"%{search_term}%"
            params.extend([like, like, like])
        
        if category:
            query += " AND p.category = %s"
            params.append(category)
        
        if sort_by == 'rating':
            query += " ORDER BY p.average_rating DESC"
        elif sort_by == 'price_low':
            query += " ORDER BY p.price ASC"
        elif sort_by == 'price_high':
            query += " ORDER BY p.price DESC"
        else:
            query += " ORDER BY p.created_at DESC"
        
        query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        products = BaseModel.execute_query(query, params, fetch_all=True) or []
        
        # Serialize
        result = []
        for p in products:
            result.append({
                'id': p['id'],
                'name': p['name'],
                'description': p.get('description', ''),
                'category': p.get('category', ''),
                'price': float(p['price']),
                'quantity': float(p.get('quantity', 0)),
                'unit': p.get('unit', 'kg'),
                'images': json.loads(p['images']) if p.get('images') else [],
                'location': p.get('location', ''),
                'organic': bool(p.get('organic', False)),
                'average_rating': float(p.get('average_rating', 0)),
                'total_reviews': p.get('total_reviews', 0),
                'farmer_id': p['farmer_id'],
                'farmer_name': p.get('farmer_name', ''),
                'farmer_location': p.get('farmer_location', ''),
                'discount_percent': int(p.get('discount_percent', 0)),
                'status': p.get('status', 'approved'),
                'harvest_date': p['harvest_date'].isoformat() if p.get('harvest_date') else None,
                'created_at': p['created_at'].isoformat() if p.get('created_at') else None,
            })
        
        # Count total for pagination
        count_query = """
            SELECT COUNT(*) as count
            FROM products p 
            LEFT JOIN farmers f ON p.farmer_id = f.id 
            WHERE (p.is_available = TRUE AND p.status = 'approved')
               OR p.status = 'sold_out'
        """
        count_params = []
        if search_term:
            count_query += " AND (p.name ILIKE %s OR p.description ILIKE %s OR p.category ILIKE %s)"
            count_params.extend([f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"])
        if category:
            count_query += " AND p.category = %s"
            count_params.append(category)
            
        count_res = BaseModel.execute_query(count_query, count_params, fetch_one=True)
        total_count = count_res['count'] if count_res else len(products)

        return {
            'success': True,
            'products': result,
            'data': result,
            'total': total_count,
            'page': page,
            'limit': limit,
            'sort': sort_by,
            'pagination': {
                'total': total_count,
                'page': page,
                'limit': limit
            }
        }
    
    except Exception as e:
        print(f"Browse products error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.get('/products/{product_id}')
async def get_product_details(product_id):
    """Get product details"""
    try:
        product = Product.get_by_id(product_id)
        
        if not product:
            return JSONResponse(status_code=404, content={'error': 'Product not found'})
        
        # Increment views
        Product.increment_views(product_id)
        
        # Get reviews
        reviews = Review.get_product_reviews(product_id, limit=10)
        
        return {
            'product': product,
            'reviews': reviews
        }
    
    except Exception as e:
        print(f"Get product details error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.get('/products/search')
async def search_products(request: Request):
    """Search products with filters"""
    try:
        search_term = request.query_params.get('q', '')
        
        category_id_val = request.query_params.get('category_id')
        category_id = int(category_id_val) if category_id_val else None
        
        min_price_val = request.query_params.get('min_price')
        min_price = float(min_price_val) if min_price_val else None
        
        max_price_val = request.query_params.get('max_price')
        max_price = float(max_price_val) if max_price_val else None
        
        min_rating_val = request.query_params.get('min_rating')
        min_rating = float(min_rating_val) if min_rating_val else None
        
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        offset = (page - 1) * limit
        
        if not search_term:
            return JSONResponse(status_code=400, content={'error': 'Search term required'})
        
        products = Product.search(search_term, category_id, limit, offset)
        
        # Apply price and rating filters
        filtered_products = []
        for product in products:
            if min_price and product['price'] < min_price:
                continue
            if max_price and product['price'] > max_price:
                continue
            if min_rating and (product['average_rating'] or 0) < min_rating:
                continue
            filtered_products.append(product)
        
        return {
            'products': filtered_products,
            'data': filtered_products,
            'page': page,
            'limit': limit,
            'total': len(filtered_products),
            'pagination': {
                'total': len(filtered_products),
                'page': page,
                'limit': limit
            }
        }
    
    except Exception as e:
        print(f"Search products error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})


# ============================================================================
# SHOPPING CART
# ============================================================================

@buyer_router.get('/cart')
async def get_cart(request: Request, user_id: str = Depends(get_current_user)):
    """Get shopping cart"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        # Cart uses buyer_id directly
        items = Cart.get_items(buyer['id'])
        
        # Calculate totals
        subtotal = 0
        for item in items:
            subtotal += (item['price'] * item['quantity'])
        
        return {
            'cart_id': buyer['id'],
            'items': items,
            'subtotal': subtotal,
            'item_count': len(items)
        }
    
    except Exception as e:
        print(f"Get cart error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.post('/cart/items')
async def add_to_cart(request: Request, user_id: str = Depends(get_current_user)):
    """Add item to cart"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        data = await request.json()
        
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        if not product_id or quantity <= 0:
            return JSONResponse(status_code=400, content={'error': 'Invalid product or quantity'})
        
        product = Product.get_by_id(product_id)
        if not product:
            return JSONResponse(status_code=404, content={'error': 'Product not found'})
        
        if quantity > product['quantity']:
            return JSONResponse(content={'error': f'Only {product["quantity"]} available'}), 400
        
        # Cart.add_item uses buyer_id directly (no separate cart table)
        Cart.add_item(buyer['id'], product_id, quantity)
        
        return {'message': 'Item added to cart'}
    
    except Exception as e:
        print(f"Add to cart error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.put('/cart/items/{cart_item_id}')
async def update_cart_item(cart_item_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Update cart item quantity"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        data = await request.json()
        quantity = float(data.get('quantity', 1))
        
        if quantity <= 0:
            return JSONResponse(status_code=400, content={'error': 'Invalid quantity'})
        
        BaseModel.execute_query(
            "UPDATE cart SET quantity = %s WHERE id = %s",
            (quantity, cart_item_id)
        )
        
        return {'message': 'Cart item updated'}
    
    except Exception as e:
        import traceback
        print(f"[CART-UPDATE-ERROR] {e}", flush=True)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.delete('/cart/items/{cart_item_id}')
async def remove_from_cart(cart_item_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Remove item from cart"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        Cart.remove_item(cart_item_id)
        
        return {'message': 'Item removed from cart'}
    
    except Exception as e:
        print(f"Remove from cart error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.post('/cart/clear')
async def clear_cart(request: Request, user_id: str = Depends(get_current_user)):
    """Clear entire cart"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        # Cart.clear_cart uses buyer_id directly
        Cart.clear_cart(buyer['id'])
        
        return {'message': 'Cart cleared'}
    
    except Exception as e:
        print(f"Clear cart error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

# ============================================================================
# ORDERS
# ============================================================================

@buyer_router.post('/orders')
async def create_order(request: Request, user_id: str = Depends(get_current_user)):
    """Create order from cart"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        data = await request.json()
        
        # Validation
        if not data.get('product_id') or not data.get('quantity'):
            return JSONResponse(status_code=400, content={'error': 'Product and quantity required'})
        
        product = Product.get_by_id(data['product_id'])
        if not product:
            return JSONResponse(status_code=404, content={'error': 'Product not found'})
        
        if data['quantity'] > product['quantity']:
            return JSONResponse(content={'error': f'Only {product["quantity"]} available'}), 400
        
        if not data.get('delivery_address'):
            return JSONResponse(status_code=400, content={'error': 'Delivery address required'})
        
        # Calculate total
        unit_price = product['price']
        total_price = unit_price * data['quantity']
        final_price = total_price
        
        # Create order
        import uuid
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        
        order_id = Order.create(
            order_number=order_number,
            farmer_id=product['farmer_id'],
            buyer_id=buyer['id'],
            product_id=data['product_id'],
            quantity=data['quantity'],
            unit_price=unit_price,
            total_price=total_price,
            final_price=final_price,
            delivery_address=data['delivery_address']
        )
        
        # Add notes if provided
        if data.get('notes'):
            BaseModel.execute_query(
                "UPDATE orders SET notes = %s WHERE id = %s",
                (data['notes'], order_id)
            )
        
        # Send notifications
        Notification.create(
            user_id=user_id,
            title='Order Created',
            message=f'Your order #{order_number} has been placed',
            notification_type='order'
        )
        
        Notification.create(
            user_id=str(product['farmer_id']),
            title='New Order',
            message=f'You have received a new order #{order_number}',
            notification_type='order'
        )
        
        return JSONResponse(status_code=201, content={
            'message': 'Order created successfully',
            'order_id': order_id,
            'order_number': order_number
        })
    
    except Exception as e:
        print(f"Create order error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.get('/orders')
async def get_orders(request: Request, user_id: str = Depends(get_current_user)):
    """Get buyer's orders"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        status = request.query_params.get('status')
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        offset = (page - 1) * limit
        
        orders = Order.get_buyer_orders(buyer['id'], status=status, limit=limit, offset=offset)
        
        return {
            'orders': orders,
            'page': page,
            'limit': limit
        }
    
    except Exception as e:
        print(f"Get orders error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.get('/orders/{order_id}')
async def get_order(order_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Get order details"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        order = Order.get_by_id(order_id)
        if not order:
            return JSONResponse(status_code=404, content={'error': 'Order not found'})
        
        if order['buyer_id'] != buyer['id']:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        return {'order': order}
    
    except Exception as e:
        print(f"Get order error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.post('/orders/{order_id}/cancel')
async def cancel_order(order_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Cancel order"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        order = Order.get_by_id(order_id)
        if not order:
            return JSONResponse(status_code=404, content={'error': 'Order not found'})
        
        if order['buyer_id'] != buyer['id']:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        if order['status'] not in ['pending', 'confirmed']:
            return JSONResponse(status_code=400, content={'error': 'Cannot cancel order in current status'})
        
        data = await request.json()
        reason = data.get('reason', 'User requested cancellation')
        
        Order.update_status(order_id, 'cancelled')
        BaseModel.execute_query(
            "UPDATE orders SET cancellation_reason = %s WHERE id = %s",
            (reason, order_id)
        )
        
        # Notify farmer
        Notification.create(
            user_id=order['farmer_user_id'],
            title='Order Cancelled',
            message=f'Order #{order["order_number"]} has been cancelled',
            notification_type='order'
        )
        
        return {'message': 'Order cancelled successfully'}
    
    except Exception as e:
        print(f"Cancel order error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

# ============================================================================
# PAYMENTS
# ============================================================================

@buyer_router.post('/payments/create')
async def create_payment(request: Request, user_id: str = Depends(get_current_user)):
    """Create Razorpay payment"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        if not razorpay_client:
            return JSONResponse(status_code=500, content={'error': 'Payment service not configured'})
        
        data = await request.json()
        
        order_id = data.get('order_id')
        order = Order.get_by_id(order_id)
        
        if not order:
            return JSONResponse(status_code=404, content={'error': 'Order not found'})
        
        if order['buyer_id'] != buyer['id']:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create(dict(
            amount=int(order['final_price'] * 100),  # Amount in paise
            currency='INR',
            payment_capture='1'
        ))
        
        # Create payment record
        payment_id = Payment.create(
            order_id=order_id,
            buyer_id=buyer['id'],
            amount=order['final_price'],
            payment_method='razorpay'
        )
        
        # Update payment with Razorpay order ID
        BaseModel.execute_query(
            "UPDATE payments SET razorpay_order_id = %s WHERE id = %s",
            (razorpay_order['id'], payment_id)
        )
        
        return {
            'payment_id': payment_id,
            'razorpay_order_id': razorpay_order['id'],
            'amount': order['final_price'],
            'key_id': os.getenv('RAZORPAY_KEY_ID')
        }
    
    except Exception as e:
        print(f"Create payment error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.post('/payments/verify')
async def verify_payment(request: Request, user_id: str = Depends(get_current_user)):
    """Verify Razorpay payment"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        data = await request.json()
        
        payment_id = data.get('payment_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        
        payment = Payment.get_by_id(payment_id)
        if not payment:
            return JSONResponse(status_code=404, content={'error': 'Payment not found'})
        
        # Verify signature
        import hmac
        import hashlib
        
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected_signature = hmac.new(
            os.getenv('RAZORPAY_KEY_SECRET', '').encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if expected_signature != razorpay_signature:
            Payment.mark_failed(payment_id, 'Invalid signature')
            return JSONResponse(status_code=400, content={'error': 'Payment verification failed'})
        
        # Update payment
        Payment.update_with_razorpay(
            payment_id,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        )
        
        # Update order status
        Order.update_payment_status(payment['order_id'], 'paid')
        
        # Update farmer wallet
        order = Order.get_by_id(payment['order_id'])
        farmer_commission = order['final_price'] * 0.95  # 5% platform fee
        Wallet.add_balance(order['farmer_user_id'], farmer_commission)
        
        # Record transaction
        transaction_record_id = BaseModel.execute_insert(
            """INSERT INTO transactions (user_id, type, amount, order_id, payment_id, status)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (order['farmer_user_id'], 'credit', farmer_commission, order['id'], payment_id, 'completed')
        )
        
        # Send notifications
        Notification.create(
            user_id=order['buyer_user_id'],
            title='Payment Confirmed',
            message=f'Payment for order #{order["order_number"]} has been confirmed',
            notification_type='payment'
        )
        
        Notification.create(
            user_id=order['farmer_user_id'],
            title='Order Paid',
            message=f'Order #{order["order_number"]} has been paid',
            notification_type='payment'
        )
        
        return {'message': 'Payment verified successfully'}
    
    except Exception as e:
        print(f"Verify payment error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

# ============================================================================
# REVIEWS
# ============================================================================

@buyer_router.post('/orders/{order_id}/review')
async def create_review(order_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Create product review"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        order = Order.get_by_id(order_id)
        if not order:
            return JSONResponse(status_code=404, content={'error': 'Order not found'})
        
        if order['buyer_id'] != buyer['id']:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        data = await request.json()
        rating = data.get('rating')
        
        if not rating or rating < 1 or rating > 5:
            return JSONResponse(status_code=400, content={'error': 'Rating must be between 1 and 5'})
        
        review_id = Review.create(
            product_id=order['product_id'],
            buyer_id=buyer['id'],
            rating=rating,
            comment=data.get('comment', ''),
            order_id=order_id
        )
        
        # Update product rating
        query = """
        SELECT AVG(rating) as avg_rating, COUNT(*) as count
        FROM reviews WHERE product_id = %s
        """
        result = BaseModel.execute_query(query, (order['product_id'],), fetch_one=True)
        
        BaseModel.execute_query(
            "UPDATE products SET average_rating = %s, review_count = %s WHERE id = %s",
            (result['avg_rating'], result['count'], order['product_id'])
        )
        
        return JSONResponse(status_code=201, content={
            'message': 'Review created successfully',
            'review_id': review_id
        })
    
    except Exception as e:
        print(f"Create review error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

# ============================================================================
# PROFILE
# ============================================================================

@buyer_router.get('/profile')
async def get_profile(request: Request, user_id: str = Depends(get_current_user)):
    """Get buyer profile"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        
        return {'profile': buyer}
    
    except Exception as e:
        print(f"Get profile error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@buyer_router.put('/profile')
async def update_profile(request: Request, user_id: str = Depends(get_current_user)):
    """Update buyer profile"""
    try:
        # user_id from dependency injection
        buyer = await get_or_create_buyer(user_id)
        if not buyer:
            return JSONResponse(status_code=403, content={'error': 'Buyer access required'})
        data = await request.json()
        
        buyer_fields = {}
        allowed_fields = ['business_name', 'business_type', 'company_registration',
                         'location', 'latitude', 'longitude', 'delivery_address', 'gst_number']
        
        for field in allowed_fields:
            if field in data:
                buyer_fields[field] = data[field]
        
        if buyer_fields:
            Buyer.update(buyer['id'], **buyer_fields)
        
        return {'message': 'Profile updated successfully'}
    
    except Exception as e:
        print(f"Update profile error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})
