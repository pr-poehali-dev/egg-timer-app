CREATE TABLE IF NOT EXISTS marketplace_orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    eggs_amount DECIMAL(10, 2) NOT NULL,
    price_per_egg DECIMAL(10, 6) NOT NULL,
    total_price DECIMAL(10, 4) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_status ON marketplace_orders(status);
CREATE INDEX idx_marketplace_user ON marketplace_orders(user_id);

CREATE TABLE IF NOT EXISTS user_balances (
    user_id VARCHAR(255) PRIMARY KEY,
    chickens INTEGER DEFAULT 0,
    eggs DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 4) DEFAULT 0,
    last_collect BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);