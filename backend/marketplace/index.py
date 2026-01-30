import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from decimal import Decimal

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def handler(event: dict, context) -> dict:
    '''API для торговой площадки яиц'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            path = event.get('queryStringParameters', {})
            action = path.get('action', 'list')
            
            if action == 'list':
                cur.execute("""
                    SELECT id, user_id, eggs_amount, price_per_egg, total_price, created_at 
                    FROM marketplace_orders 
                    WHERE status = 'active' 
                    ORDER BY created_at DESC 
                    LIMIT 50
                """)
                orders = cur.fetchall()
                
                result = []
                for order in orders:
                    result.append({
                        'id': order['id'],
                        'userId': order['user_id'],
                        'eggsAmount': float(order['eggs_amount']),
                        'pricePerEgg': float(order['price_per_egg']),
                        'totalPrice': float(order['total_price']),
                        'createdAt': order['created_at'].isoformat()
                    })
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'orders': result}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create':
                user_id = body.get('userId')
                eggs_amount = Decimal(str(body.get('eggsAmount', 0)))
                price_per_egg = Decimal(str(body.get('pricePerEgg', 0.01)))
                total_price = eggs_amount * price_per_egg
                
                cur.execute("""
                    INSERT INTO marketplace_orders (user_id, eggs_amount, price_per_egg, total_price, status)
                    VALUES (%s, %s, %s, %s, 'active')
                    RETURNING id
                """, (user_id, eggs_amount, price_per_egg, total_price))
                
                order_id = cur.fetchone()['id']
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'orderId': order_id, 'message': 'Order created'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'buy':
                order_id = body.get('orderId')
                buyer_id = body.get('buyerId')
                
                cur.execute("""
                    SELECT user_id, eggs_amount, total_price 
                    FROM marketplace_orders 
                    WHERE id = %s AND status = 'active'
                """, (order_id,))
                
                order = cur.fetchone()
                if not order:
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Order not found'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    UPDATE marketplace_orders 
                    SET status = 'sold', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = %s
                """, (order_id,))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'message': 'Order purchased',
                        'eggs': float(order['eggs_amount']),
                        'price': float(order['total_price'])
                    }),
                    'isBase64Encoded': False
                }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
