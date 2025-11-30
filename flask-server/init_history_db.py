import sqlite3
import os

# Create database path
db_path = os.path.join(os.path.dirname(__file__), 'db', 'food.db')

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create calculation_history table
cursor.execute('''
CREATE TABLE IF NOT EXISTS calculation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gender TEXT,
    weight REAL,
    height REAL,
    age INTEGER,
    activity TEXT,
    period TEXT,
    allergens TEXT,
    vegetarian INTEGER DEFAULT 0,
    total_cost REAL,
    total_kcal REAL,
    total_protein REAL,
    total_fat REAL,
    total_carbs REAL,
    diet_json TEXT
)
''')

# Create index on user_id for faster queries
cursor.execute('''
CREATE INDEX IF NOT EXISTS idx_user_id ON calculation_history(user_id)
''')

# Create index on created_at for sorting
cursor.execute('''
CREATE INDEX IF NOT EXISTS idx_created_at ON calculation_history(created_at DESC)
''')

conn.commit()
conn.close()

print("✓ Таблица calculation_history успешно создана!")
print(f"✓ База данных: {db_path}")
