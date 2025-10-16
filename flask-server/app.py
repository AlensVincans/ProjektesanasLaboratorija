from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, pathlib

APP_DIR = pathlib.Path(__file__).resolve().parent
DB_PATH = APP_DIR / 'db' / 'nutri.db'

app = Flask(__name__)
CORS(app)

def get_con():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    return con

@app.get('/health')
def health():
    return {'ok': True}

# Список продуктов с простыми фильтрами: ?q=строка&allergens=a,b,c
@app.get('/api/products')
def list_products():
    q = request.args.get('q')
    allergens_block = request.args.get('allergens')  # comma-separated
    sql = "SELECT * FROM products WHERE 1=1"
    params = []

    if q:
        sql += " AND name LIKE ?"; params.append(f"%{q}%")

    if allergens_block:
        for a in allergens_block.split(','):
            a = a.strip()
            if a:
                # исключаем товары, где в JSON аллергенов встречается a
                sql += " AND allergens_json NOT LIKE ?"
                params.append(f"%\"{a}\"%")

    sql += " ORDER BY price_cents ASC LIMIT 200"

    with get_con() as con:
        rows = con.execute(sql, params).fetchall()

    return jsonify([dict(r) for r in rows])

# Черновик расчёта БЖУ/ккал
AF = {'low': 1.2, 'medium': 1.45, 'high': 1.7}

def tdee(sex, age, weight, height, activity):
    if sex == 'male':
        bmr = 10*weight + 6.25*height - 5*age + 5
    else:
        bmr = 10*weight + 6.25*height - 5*age - 161
    return bmr * AF.get(activity, 1.45)

@app.post('/api/plan')
def make_plan():
    data = request.get_json(force=True)
    kcal = round(tdee(
        data['sex'], int(data['age']),
        float(data['weight']), float(data['height']),
        data['activity']
    ))
    protein = round(1.6 * float(data['weight']))
    fat = round(0.8 * float(data['weight']))
    carbs = max(0, round((kcal - protein*4 - fat*9)/4))

    return jsonify({
        'kcal': kcal,
        'protein_g': protein,
        'fat_g': fat,
        'carbs_g': carbs
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
