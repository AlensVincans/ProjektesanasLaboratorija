# flask-server/app.py
from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
from pulp import LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, value, LpStatus
import sqlite3, logging, os, unicodedata

# ---------- базовая настройка ----------
ROOT = Path(__file__).resolve().parent
BUILD_DIR = ROOT.parent / "react-client" / "build"
DB_PATH = os.environ.get("FOOD_DB_PATH") or str((ROOT / "db" / "food.db").resolve())

app = Flask(__name__, static_folder=str(BUILD_DIR), static_url_path="/")
logging.basicConfig(level=logging.INFO)

# ---------- активность и формулы ----------
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.4,
    "low": 1.6,
    "moderate": 1.8,
    "active": 1.9,
    "very active": 2.0,
}

def mifflin_bmr(gender: str, weight: float, height: float, age: float) -> float:
    """Формула Миффлина–Сан Жеора"""
    if str(gender).lower() == "male":
        return 10 * weight + 6.25 * height - 5 * age + 5
    return 10 * weight + 6.25 * height - 5 * age - 161

@app.post("/tdee")
def tdee():
    """Расчёт суточной нормы калорий (TDEE)"""
    data = request.get_json(silent=True) or request.form.to_dict()
    try:
        gender = str(data.get("gender", "female")).lower()
        age = float(data.get("age"))
        weight = float(data.get("weight"))
        height = float(data.get("height"))
        activity = str(data.get("activity", "moderate")).lower()
    except Exception:
        return jsonify({"error": "invalid payload"}), 400

    if activity not in ACTIVITY_MULTIPLIERS:
        return jsonify({"error": f"activity must be one of {list(ACTIVITY_MULTIPLIERS)}"}), 400

    bmr = mifflin_bmr(gender, weight, height, age)
    kcal = round(bmr * ACTIVITY_MULTIPLIERS[activity])

    return jsonify({
        "method": "mifflin-st-jeor",
        "bmr": round(bmr),
        "activity_factor": ACTIVITY_MULTIPLIERS[activity],
        "kcal": kcal
    })

# ---------- функции расчёта норм и БД ----------
def calculate_bmr(gender, weight, height, age):
    if str(gender).lower() == "male":
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

def calculate_energy_needs(bmr, activity):
    return bmr * ACTIVITY_MULTIPLIERS.get(activity.lower(), 1.4)

def get_efsa_norms(gender, weight, age, eer_kcal, period_days=1):
    mj_per_day = eer_kcal / 238.83
    norms = {
        'protein': 0.83 * weight,
        'fat': (0.20 * eer_kcal) / 9,
        'carbs': (0.45 * eer_kcal) / 4,
        'kj': eer_kcal * 4.184,
        'kcal': eer_kcal,
        'A': 0.750 if gender.lower() == 'male' else 0.650,
        'B1': 0.1 * mj_per_day,
        'B2': 1.6,
        'PP': 1.6 * mj_per_day,
        'C': 110 if gender.lower() == 'male' else 95,
        'Ca': 950,
        'P': 550,
        'Fe': 11 if gender.lower() == 'male' else (16 if age < 50 else 11)
    }
    norms_upper = {
        'protein': 2.0 * weight,
        'fat': (0.35 * eer_kcal) / 9,
        'carbs': (0.60 * eer_kcal) / 4,
        'kcal': eer_kcal * 1.1,
        'kj': eer_kcal * 4.184 * 1.1
    }
    # Масштабируем макро и энергию по периоду
    for nut in ['protein', 'fat', 'carbs', 'kj', 'kcal']:
        norms[nut] *= period_days
        norms_upper[nut] *= period_days
    return norms, norms_upper

NUT_KEYS = ['protein', 'fat', 'carbs', 'kj', 'kcal', 'A', 'B1', 'B2', 'PP', 'C', 'Ca', 'P', 'Fe']

def _norm(s: str) -> str:
    """Безопасное имя для переменных LP"""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    s = "".join(ch if ch.isalnum() else "_" for ch in s)
    if s and s[0].isdigit():
        s = "_" + s
    return s or "var"

def load_products_from_db(db_path: str) -> list[dict]:
    """Загружает продукты из таблицы products в food.db"""
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM products")
        rows = cur.fetchall()
    finally:
        conn.close()

    foods = []
    for row in rows:
        name = row[1]
        allergens_text = str(row[15] or "")
        has_lactose = any(k in allergens_text.lower() for k in ["laktoz", "pien", "milk"])
        def f(i, default=0.0):
            try:
                return float(row[i] or 0)
            except Exception:
                return default
        foods.append({
            'id': row[0],
            'name': str(name),
            'protein': f(2), 'fat': f(3), 'carbs': f(4),
            'kj': f(5), 'kcal': f(6),
            'A': f(7), 'B1': f(8), 'B2': f(9), 'PP': f(10), 'C': f(11), 'Ca': f(12), 'P': f(13), 'Fe': f(14),
            'price_per_100g': f(16),
            'has_lactose': has_lactose,
            'allergens': allergens_text
        })
    return foods

# ---------- /optimize ----------
@app.post("/optimize")
def optimize_diet():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400

    allergens = [str(a).lower() for a in data.get('allergens', [])]
    gender = data.get('gender', 'male').lower()
    try:
        weight = float(data.get('weight', 70 if gender == 'male' else 60))
        height = float(data.get('height', 175 if gender == 'male' else 165))
        age = float(data.get('age', 30))
        if weight <= 0 or height <= 0 or age <= 0:
            return jsonify({'error': 'Invalid input: weight, height, and age must be positive'}), 400
    except Exception:
        return jsonify({'error': 'Invalid input: weight, height, and age must be numeric'}), 400

    activity = data.get('activity', 'sedentary')
    period = data.get('period', 'day')
    period_days = 7 if period.lower() == 'week' else 1

    bmr = calculate_bmr(gender, weight, height, age)
    eer_kcal = calculate_energy_needs(bmr, activity)
    norms, norms_upper = get_efsa_norms(gender, weight, age, eer_kcal, period_days)

    foods = load_products_from_db(DB_PATH)
    available_foods = []
    for food in foods:
        skip = False
        for allergen in allergens:
            if allergen == 'lactose' and food['has_lactose']:
                skip = True
                break
        if not skip:
            available_foods.append(food)

    if not available_foods:
        return jsonify({'error': 'No foods available after applying restrictions'})

    model = LpProblem("Budget_Diet_Optimization", LpMinimize)
    x = {f['name']: LpVariable(_norm(f['name']), lowBound=0, upBound=5 * period_days) for f in available_foods}
    model += lpSum(f['price_per_100g'] * x[f['name']] for f in available_foods), "Total_Cost"

    for nut in NUT_KEYS:
        model += lpSum(f[nut] * x[f['name']] for f in available_foods) >= norms[nut], f"Min_{nut}"
    for nut in ['protein', 'fat', 'carbs', 'kcal', 'kj']:
        if nut in norms_upper:
            model += lpSum(f[nut] * x[f['name']] for f in available_foods) <= norms_upper[nut], f"Max_{nut}"

    solver = PULP_CBC_CMD(options=['primal', '-feasTol', '1e-6'], msg=False)
    status = model.solve(solver)

    if LpStatus[status] != 'Optimal':
        return jsonify({'error': 'No optimal solution found', 'status': LpStatus[status]}), 200

    denom = period_days
    diet = {name: round(value(var) * 100 / denom, 2) for name, var in x.items() if value(var) and value(var) > 0}
    total_cost = round(value(model.objective), 2)
    nutrient_totals = {nut: round(sum(f[nut] * value(x[f['name']]) for f in available_foods), 2) for nut in NUT_KEYS}

    return jsonify({
        'diet': diet,
        'total_cost': total_cost,
        'nutrient_totals': nutrient_totals,
        'norms': {nut: round(norms[nut], 2) for nut in norms},
        'period': period,
        'status': LpStatus[status]
    })

# ---------- SPA и сервис ----------
@app.get("/health")
def health():
    return {"ok": True}

@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(404)
def spa(_):
    wants_html = "text/html" in (request.headers.get("Accept") or "")
    if request.method == "GET" and wants_html:
        idx = Path(app.static_folder) / "index.html"
        if idx.exists():
            return send_from_directory(app.static_folder, "index.html")
    return jsonify({"error": "Not Found", "path": request.path}), 404

@app.after_request
def no_cache(resp):
    if request.path in ("/", "/index.html"):
        resp.headers["Cache-Control"] = "no-store"
    return resp

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
