"""
Messaging Module - Real-time Chat Between Farmers and Buyers
"""

from fastapi import APIRouter, Request, Query, Depends
from fastapi.responses import JSONResponse
from utils.jwt_utils import get_current_user
from models.models import User, Message, Conversation, Notification, BaseModel
from datetime import datetime

messages_router = APIRouter(prefix='/api/messages', tags=['Messages'])

# ============================================================================
# NEW CUSTOM CHAT ENDPOINTS FOR FRONTEND COMPATIBILITY
# ============================================================================

@messages_router.get('/farmers/count')
async def get_farmers_count(user_id: str = Depends(get_current_user)):
    """Get the count of registered farmers"""
    try:
        result = BaseModel.execute_query(
            "SELECT COUNT(*) as count FROM farmers", (), fetch_one=True
        )
        return {'count': result['count'] if result else 0}
    except Exception as e:
        print(f"Get farmers count error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@messages_router.get('/conversations')
async def get_conversations(request: Request, user_id: str = Depends(get_current_user)):
    """Get user's conversations"""
    try:
        # user_id from dependency injection
        user = User.get_by_id(user_id)
        
        if not user:
            return JSONResponse(status_code=404, content={'error': 'User not found'})
        
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        offset = (page - 1) * limit
        
        query = """
        SELECT c.id, c.user_1_id as user1_id, c.user_2_id as user2_id, 
               c.created_at, c.updated_at, c.last_message_id,
               CONCAT(COALESCE(f1.first_name, b1.first_name, a1.first_name), ' ', COALESCE(f1.last_name, b1.last_name, a1.last_name)) as user1_name,
               COALESCE(f1.email, b1.email, a1.email) as user1_email,
               CONCAT(COALESCE(f2.first_name, b2.first_name, a2.first_name), ' ', COALESCE(f2.last_name, b2.last_name, a2.last_name)) as user2_name,
               COALESCE(f2.email, b2.email, a2.email) as user2_email,
               m.content as last_message, m.created_at as last_message_time,
               (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND receiver_id = %s AND is_read = FALSE) as unread_count
        FROM conversations c
        LEFT JOIN farmers f1 ON c.user_1_id = f1.id
        LEFT JOIN buyers b1 ON c.user_1_id = b1.id
        LEFT JOIN admins a1 ON c.user_1_id = a1.admin_id
        LEFT JOIN farmers f2 ON c.user_2_id = f2.id
        LEFT JOIN buyers b2 ON c.user_2_id = b2.id
        LEFT JOIN admins a2 ON c.user_2_id = a2.admin_id
        LEFT JOIN messages m ON c.last_message_id = m.id
        WHERE (c.user_1_id = %s OR c.user_2_id = %s)
        ORDER BY c.updated_at DESC
        LIMIT %s OFFSET %s
        """
        
        conversations = BaseModel.execute_query(
            query, 
            (user_id, user_id, user_id, limit, offset), 
            fetch_all=True
        ) or []
        
        result = []
        for c in conversations:
            is_u1 = int(c['user1_id']) == int(user_id)
            other_id = c['user2_id'] if is_u1 else c['user1_id']
            other_name = c['user2_name'] if is_u1 else c['user1_name']
            other_email = c['user2_email'] if is_u1 else c['user1_email']
            unread_count = c.get('unread_count', 0) or 0
            
            result.append({
                'id': c['id'],
                'user1_id': c['user1_id'],
                'user2_id': c['user2_id'],
                'other_user_id': other_id,
                'other_user_name': other_name,
                'other_user_email': other_email,
                'other_user': {
                    'id': other_id,
                    'name': other_name,
                    'email': other_email
                },
                'last_message': c.get('last_message', '') or '',
                'last_message_time': c['last_message_time'].isoformat() if c.get('last_message_time') else None,
                'updated_at': c['updated_at'].isoformat() if c.get('updated_at') else None,
                'created_at': c['created_at'].isoformat() if c.get('created_at') else None,
                'unread_count': unread_count
            })
        
        return {
            'conversations': result,
            'page': page,
            'limit': limit
        }
    except Exception as e:
        print(f"Get conversations error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@messages_router.get('/{other_user_id}')
async def get_chat_messages(other_user_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Get messages in conversation with a specific user (last 24 hours only)"""
    try:
        # Check if conversation exists
        query = """
        SELECT id FROM conversations 
        WHERE (user_1_id = %s AND user_2_id = %s) 
           OR (user_1_id = %s AND user_2_id = %s)
        LIMIT 1
        """
        convo = BaseModel.execute_query(
            query, 
            (user_id, other_user_id, other_user_id, user_id),
            fetch_one=True
        )
        
        if not convo:
            return {'messages': []}
            
        conversation_id = convo['id']
        
        # Get messages
        messages = BaseModel.execute_query(
            """SELECT m.*, u.first_name, u.last_name, u.email
               FROM messages m
               LEFT JOIN users u ON m.sender_id = u.id
               WHERE m.conversation_id = %s
               ORDER BY m.created_at ASC""",
            (conversation_id,),
            fetch_all=True
        )
        
        # Mark messages as read
        BaseModel.execute_query(
            """UPDATE messages SET is_read = TRUE 
               WHERE conversation_id = %s AND receiver_id = %s AND is_read = FALSE""",
            (conversation_id, user_id)
        )
        
        # Format messages for frontend
        result = []
        for m in messages:
            result.append({
                'id': m['id'],
                'conversation_id': m['conversation_id'],
                'sender_id': m['sender_id'],
                'receiver_id': m['receiver_id'],
                'content': m['content'],
                'message': m['content'],
                'is_mine': m['sender_id'] == int(user_id),
                'created_at': m['created_at'].isoformat() if m.get('created_at') else None
            })
            
        return {'messages': result}
        
    except Exception as e:
        print(f"Get chat messages error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@messages_router.post('/send')
async def send_direct_message(request: Request, user_id: str = Depends(get_current_user)):
    """Send message to a specific user (auto-creating conversation if needed)"""
    try:
        data = await request.json()
        receiver_id = data.get('receiver_id')
        message_text = data.get('content', '').strip()
        attachment_url = data.get('attachment_url')
        
        if not receiver_id:
            return JSONResponse(status_code=400, content={'error': 'receiver_id is required'})
        if not message_text and not attachment_url:
            return JSONResponse(status_code=400, content={'error': 'Message content cannot be empty'})
            
        # Get or create conversation
        query = """
        SELECT id FROM conversations 
        WHERE (user_1_id = %s AND user_2_id = %s) 
           OR (user_1_id = %s AND user_2_id = %s)
        LIMIT 1
        """
        convo = BaseModel.execute_query(
            query, 
            (user_id, receiver_id, receiver_id, user_id),
            fetch_one=True
        )
        
        if convo:
            conversation_id = convo['id']
        else:
            conversation_id = BaseModel.execute_insert(
                """INSERT INTO conversations (user_1_id, user_2_id, created_at, updated_at)
                   VALUES (%s, %s, %s, %s)""",
                (user_id, receiver_id, datetime.now(), datetime.now())
            )
            
        # Save message
        message_id = BaseModel.execute_insert(
            """INSERT INTO messages (conversation_id, sender_id, receiver_id, content, attachment_url, is_read, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (conversation_id, user_id, receiver_id, message_text, attachment_url, False, datetime.now())
        )
        
        # Update conversation
        BaseModel.execute_query(
            """UPDATE conversations SET last_message_id = %s, updated_at = %s WHERE id = %s""",
            (message_id, datetime.now(), conversation_id)
        )
        
        # Send notification
        sender = User.get_by_id(user_id)
        Notification.create(
            user_id=receiver_id,
            title=f'New Message from {sender["first_name"]}',
            message=message_text[:50] + '...' if len(message_text) > 50 else message_text,
            notification_type='message'
        )
        
        return JSONResponse(status_code=201, content={
            'message': 'Message sent successfully',
            'message_id': message_id,
            'conversation_id': conversation_id
        })
        
    except Exception as e:
        print(f"Send direct message error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})


# ============================================================================
# CONVERSATIONS
# ============================================================================

# (get_conversations moved to top of router file to ensure correct FastAPI route resolution)

@messages_router.get('/conversations/{other_user_id}')
async def get_or_create_conversation(other_user_id, request: Request, user_id: str = Depends(get_current_user)):
    """Get or create conversation with another user"""
    try:
        # user_id from dependency injection
        
        if user_id == other_user_id:
            return JSONResponse(status_code=400, content={'error': 'Cannot chat with yourself'})
        
        # Check if both users exist
        user = User.get_by_id(user_id)
        other_user = User.get_by_id(other_user_id)
        
        if not user or not other_user:
            return JSONResponse(status_code=404, content={'error': 'User not found'})
        
        # Find or create conversation
        query = """
        SELECT id, user_1_id as user1_id, user_2_id as user2_id, created_at, updated_at FROM conversations 
        WHERE (user_1_id = %s AND user_2_id = %s) 
           OR (user_1_id = %s AND user_2_id = %s)
        LIMIT 1
        """
        
        conversation = BaseModel.execute_query(
            query, 
            (user_id, other_user_id, other_user_id, user_id),
            fetch_one=True
        )
        
        if not conversation:
            # Create new conversation
            conversation_id = BaseModel.execute_insert(
                """INSERT INTO conversations (user_1_id, user_2_id, created_at, updated_at)
                   VALUES (%s, %s, %s, %s)""",
                (user_id, other_user_id, datetime.now(), datetime.now())
            )
            conversation = {
                'id': conversation_id,
                'user1_id': user_id,
                'user2_id': other_user_id,
                'created_at': datetime.now()
            }
        
        return {'conversation': conversation}
    
    except Exception as e:
        print(f"Get/create conversation error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

# ============================================================================
# MESSAGES
# ============================================================================

@messages_router.get('/conversations/{conversation_id}/messages')
async def get_messages(conversation_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Get messages in conversation"""
    try:
        user_id_int = int(user_id)
        
        # Verify user is part of conversation
        conversation = BaseModel.execute_query(
            "SELECT id, user_1_id as user1_id, user_2_id as user2_id FROM conversations WHERE id = %s",
            (conversation_id,),
            fetch_one=True
        )
        
        if not conversation:
            return JSONResponse(status_code=404, content={'error': 'Conversation not found'})
        
        if conversation['user1_id'] != user_id_int and conversation['user2_id'] != user_id_int:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))
        offset = (page - 1) * limit
        
        messages = BaseModel.execute_query(
            """SELECT m.*, u.first_name, u.last_name, u.email
               FROM messages m
               LEFT JOIN users u ON m.sender_id = u.id
               WHERE m.conversation_id = %s
               ORDER BY m.created_at DESC
               LIMIT %s OFFSET %s""",
            (conversation_id, limit, offset),
            fetch_all=True
        )
        
        # Mark messages as read
        BaseModel.execute_query(
            """UPDATE messages SET is_read = TRUE 
               WHERE conversation_id = %s AND receiver_id = %s AND is_read = FALSE""",
            (conversation_id, user_id_int)
        )
        
        # Format messages for frontend
        result = []
        for m in messages:
            result.append({
                'id': m['id'],
                'conversation_id': m['conversation_id'],
                'sender_id': m['sender_id'],
                'receiver_id': m['receiver_id'],
                'content': m['content'],
                'message': m['content'],
                'is_read': m['is_read'],
                'created_at': m['created_at'].isoformat() if m.get('created_at') else None,
                'first_name': m.get('first_name'),
                'last_name': m.get('last_name'),
                'email': m.get('email')
            })
            
        return {
            'messages': result,
            'page': page,
            'limit': limit
        }
    
    except Exception as e:
        print(f"Get messages error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@messages_router.post('/conversations/{conversation_id}/send')
async def send_message(conversation_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Send message in conversation"""
    try:
        user_id_int = int(user_id)
        
        # Verify user is part of conversation
        conversation = BaseModel.execute_query(
            "SELECT id, user_1_id as user1_id, user_2_id as user2_id FROM conversations WHERE id = %s",
            (conversation_id,),
            fetch_one=True
        )
        
        if not conversation:
            return JSONResponse(status_code=404, content={'error': 'Conversation not found'})
        
        if conversation['user1_id'] != user_id_int and conversation['user2_id'] != user_id_int:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        data = await request.json()
        message_text = data.get('message', '').strip()
        attachment_url = data.get('attachment_url')
        
        if not message_text and not attachment_url:
            return JSONResponse(status_code=400, content={'error': 'Message cannot be empty'})
        
        # Determine receiver
        receiver_id = conversation['user2_id'] if conversation['user1_id'] == user_id_int else conversation['user1_id']
        
        # Save message
        message_id = BaseModel.execute_insert(
            """INSERT INTO messages (conversation_id, sender_id, receiver_id, content, attachment_url, is_read, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (conversation_id, user_id_int, receiver_id, message_text, attachment_url, False, datetime.now())
        )
        
        # Update conversation
        BaseModel.execute_query(
            """UPDATE conversations SET last_message_id = %s, updated_at = %s WHERE id = %s""",
            (message_id, datetime.now(), conversation_id)
        )
        
        # Send notification
        sender = User.get_by_id(user_id_int)
        Notification.create(
            user_id=receiver_id,
            title=f'New Message from {sender["first_name"]}',
            message=message_text[:50] + '...' if len(message_text) > 50 else message_text,
            notification_type='message'
        )
        
        return JSONResponse(status_code=201, content={
            'message': 'Message sent successfully',
            'message_id': message_id
        })
    
    except Exception as e:
        print(f"Send message error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@messages_router.delete('/messages/{message_id}')
async def delete_message(message_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Delete message"""
    try:
        user_id_int = int(user_id)
        
        message = BaseModel.execute_query(
            "SELECT * FROM messages WHERE id = %s",
            (message_id,),
            fetch_one=True
        )
        
        if not message:
            return JSONResponse(status_code=404, content={'error': 'Message not found'})
        
        if message['sender_id'] != user_id_int:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        BaseModel.execute_query(
            "DELETE FROM messages WHERE id = %s",
            (message_id,)
        )
        
        return {'message': 'Message deleted successfully'}
    
    except Exception as e:
        print(f"Delete message error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

# ============================================================================
# MESSAGE STATUS
# ============================================================================

@messages_router.post('/messages/{message_id}/read')
async def mark_as_read(message_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Mark message as read"""
    try:
        user_id_int = int(user_id)
        
        message = BaseModel.execute_query(
            "SELECT * FROM messages WHERE id = %s",
            (message_id,),
            fetch_one=True
        )
        
        if not message:
            return JSONResponse(status_code=404, content={'error': 'Message not found'})
        
        if message['receiver_id'] != user_id_int:
            return JSONResponse(status_code=403, content={'error': 'Unauthorized'})
        
        BaseModel.execute_query(
            "UPDATE messages SET is_read = TRUE WHERE id = %s",
            (message_id,)
        )
        
        return {'message': 'Message marked as read'}
    
    except Exception as e:
        print(f"Mark as read error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

@messages_router.get('/conversations/{conversation_id}/unread-count')
async def get_unread_count(conversation_id: int, request: Request, user_id: str = Depends(get_current_user)):
    """Get unread message count"""
    try:
        # user_id from dependency injection
        
        count = BaseModel.execute_query(
            """SELECT COUNT(*) as unread 
               FROM messages 
               WHERE conversation_id = %s AND receiver_id = %s AND is_read = FALSE""",
            (conversation_id, user_id),
            fetch_one=True
        )
        
        return {'unread_count': count['unread']}
    
    except Exception as e:
        print(f"Get unread count error: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})
