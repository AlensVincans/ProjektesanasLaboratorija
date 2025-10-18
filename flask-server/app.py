from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "food.db"

app = Flask(__name__)
CORS(app)

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS products(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        price REAL NOT NULL DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS recipes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        ingredients TEXT NOT NULL -- через запятую
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS profile(
        id INTEGER PRIMARY KEY CHECK (id=1),
        gender TEXT, age INTEGER, weight REAL, height REAL,
        activity TEXT,
        allergens TEXT, dislikes TEXT
    )""")
    # начальные данные
    c.executemany("INSERT OR IGNORE INTO products(name, price) VALUES(?,?)",
                  [("Яблоко",0.8),("Курица",5.2),("Рис",1.4),("Молоко",1.1)])
    c.executemany("INSERT OR IGNORE INTO recipes(title, ingredients) VALUES(?,?)",[
        ("Курица с рисом","Курица,Рис,Соль"),
        ("Рис с яблоком","Рис,Яблоко,Корица")
    ])
    c.execute("INSERT OR IGNORE INTO profile(id) VALUES(1)")
    conn.commit(); conn.close()

@app.get("/api/products")
def get_products():
    rows = db().execute("SELECT * FROM products ORDER BY name").fetchall()
    return jsonify([dict(r) for r in rows])

@app.put("/api/products/<int:pid>")
def update_product(pid):
    data = request.json or {}
    price = float(data.get("price", 0))
    conn = db(); cur = conn.cursor()
    cur.execute("UPDATE products SET price=? WHERE id=?", (price, pid))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.post("/api/profile")
def save_profile():
    data = request.json or {}
    conn = db(); cur = conn.cursor()
    cur.execute("""UPDATE profile SET gender=?, age=?, weight=?, height=?,
                   activity=?, allergens=?, dislikes=? WHERE id=1""",
                (data.get("gender"), data.get("age"), data.get("weight"),
                 data.get("height"), data.get("activity"),
                 ",".join(data.get("allergens",[])),
                 ",".join(data.get("dislikes",[]))))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.get("/api/recipes")
def get_recipes():
    # фильтрация по аллергенам/нежелательным
    allergens = set((request.args.get("allergens") or "").split(",")) - {""}
    dislikes  = set((request.args.get("dislikes")  or "").split(",")) - {""}
    rows = db().execute("SELECT * FROM recipes ORDER BY title").fetchall()
    out = []
    for r in rows:
        ings = set([s.strip() for s in r["ingredients"].split(",")])
        if ings & allergens:   # пропускаем с аллергенами
            continue
        if ings & dislikes:    # пропускаем нелюбимые
            continue
        out.append(dict(r))
    return jsonify(out)

@app.get("/api/stats/prices")
def stats_prices():
    rows = db().execute("SELECT name, price FROM products").fetchall()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)