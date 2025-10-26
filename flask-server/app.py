from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import logging

# ====== Статика CRA ======
ROOT = Path(__file__).resolve().parent
BUILD_DIR = ROOT.parent / "react-client" / "build"  # CRA build/

app = Flask(__name__, static_folder=str(BUILD_DIR), static_url_path="/")
logging.basicConfig(level=logging.INFO)

# ------------------------------------------------------------
# БЛОК 1. Базовый расчёт TDEE (Мифлин–Сан Жеор)
# ------------------------------------------------------------
# Поддерживаем значения активности и из анкеты, и из оптимизатора
AF = {
    "low": 1.2,
    "moderate": 1.55,
    "high": 1.725,
    "sedentary": 1.4,
    "active": 2.0,
    "very active": 2.0,
}

def mifflin_bmr(gender: str, weight: float, height: float, age: int) -> float:
    """Mifflin–St Jeor (кг, см, годы)."""
    if gender.lower() == "male":
        return 10 * weight + 6.25 * height - 5 * age + 5
    return 10 * weight + 6.25 * height - 5 * age - 161

def _validate_tdee(d: dict):
    need = ("gender", "age", "weight", "height", "activity")
    for k in need:
        if d.get(k) in (None, ""):
            return f"missing field: {k}"
    try:
        a = int(d["age"]); w = float(d["weight"]); h = float(d["height"])
    except Exception:
        return "age must be int; weight/height numbers"
    if not (5 <= a <= 100): return "age out of range (5–100)"
    if w <= 0 or h <= 0:    return "weight/height must be > 0"
    if d["gender"] not in ("male", "female"): return "gender must be male|female"
    if d["activity"] not in AF: return f"activity must be one of: {', '.join(AF)}"
    return None

@app.post("/tdee")
def tdee():
    data = request.get_json(silent=True) or request.form.to_dict()
    err = _validate_tdee(data)
    if err:
        return jsonify({"error": err}), 400
    bmr = mifflin_bmr(data["gender"], float(data["weight"]), float(data["height"]), int(data["age"]))
    kcal = round(bmr * AF[data["activity"]])
    return jsonify({
        "method": "mifflin-st-jeor",
        "bmr": round(bmr),
        "activity_factor": AF[data["activity"]],
        "kcal": kcal
    })

# ------------------------------------------------------------
# БЛОК 2. Оптимизация рациона (PuLP)
# ------------------------------------------------------------
from pulp import (  # type: ignore
    LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, value, LpStatus
)

def calculate_bmr_hb(gender, weight, height, age):
    """Harris–Benedict — оставляем для совместимости с исходником."""
    if gender.lower() == "male":
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

def calculate_energy_needs(bmr, activity):
    return bmr * AF.get(activity.lower(), 1.4)

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
    for k in norms: norms[k] *= period_days
    for k in norms_upper: norms_upper[k] *= period_days
    return norms, norms_upper

NUT_KEYS = ['protein', 'fat', 'carbs', 'kj', 'kcal', 'A', 'B1', 'B2', 'PP', 'C', 'Ca', 'P', 'Fe']

@app.route("/optimize", methods=["POST"], strict_slashes=False)
def optimize_diet():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400

    allergens = [a.lower() for a in data.get('allergens', [])]
    gender = (data.get('gender') or 'male').lower()
    try:
        weight = float(data.get('weight') or (70 if gender == 'male' else 60))
        height = float(data.get('height') or (175 if gender == 'male' else 165))
        age = float(data.get('age') or 30)
        if weight <= 0 or height <= 0 or age <= 0:
            return jsonify({'error': 'Invalid input: weight, height, and age must be positive'}), 400
    except Exception:
        return jsonify({'error': 'Invalid input: weight, height, and age must be numeric'}), 400

    activity = (data.get('activity') or 'sedentary').lower()
    period = (data.get('period') or 'day').lower()
    period_days = 7 if period == 'week' else 1

    bmr = calculate_bmr_hb(gender, weight, height, age)
    eer_kcal = calculate_energy_needs(bmr, activity)
    norms, norms_upper = get_efsa_norms(gender, weight, age, eer_kcal, period_days)

    # Демонстрационная матрица продуктов (на 100 г)
    sample_rows = [
        (1, 'Auzu putraimi', 13.0, 6.5, 61.1, 1590.0, 380.0, 0.0, 0.6, 0.14, 0.98, 0.0, 75.0, 327.0, 4.3, 0.2, 0),
        (2, 'Griku putraimi', 12.5, 2.5, 67.4, 1480.0, 354.0, 0.0, 0.51, 0.24, 4.3, 0.0, 56.0, 294.0, 1.8, 0.3, 0),
        (3, 'Kartupeli', 2.0, 0.0, 21.0, 394.0, 94.0, 0.0, 0.1, 0.05, 0.9, 10.0, 10.0, 50.0, 1.2, 0.1, 0),
        (4, 'Govs piens', 3.3, 3.2, 4.7, 272.0, 65.0, 0.05, 0.03, 0.19, 0.4, 3.0, 120.0, 100.0, 0.1, 0.13, 1),
        (5, 'Vistas ola', 45.0, 4.8, 0.2, 266.0, 63.5, 0.3, 0.07, 0.345, 0.1, 0.0, 20.0, 92.0, 1.1, 0.03, 0),
        (6, 'Spinati', 2.9, 0.0, 2.3, 88.0, 21.0, 0.0, 0.11, 0.2, 0.6, 50.0, 81.0, 83.0, 3.0, 0.7, 0),
        (7, 'Liellopu aknas', 17.4, 3.1, 0.0, 510.0, 122.0, 15.0, 0.4, 1.61, 15.3, 25.0, 5.0, 340.0, 9.0, 0.5, 0),
        (8, 'Fortified soy milk', 3.0, 1.5, 4.0, 200.0, 48.0, 0.1, 0.2, 0.3, 0.5, 10.0, 120.0, 100.0, 1.5, 0.25, 0),
        (9, 'Almonds', 21.0, 50.0, 21.0, 2400.0, 574.0, 0.0, 0.2, 1.0, 3.7, 0.0, 270.0, 430.0, 3.7, 0.8, 0),
        (10, 'Sardines', 25.0, 11.5, 0.0, 870.0, 208.0, 0.02, 0.2, 0.3, 2.7, 0.0, 390.0, 360.0, 2.9, 0.6, 0)
    ]
    foods = [
        {'name': r[1], 'protein': r[2], 'fat': r[3], 'carbs': r[4], 'kj': r[5], 'kcal': r[6],
         'A': r[7], 'B1': r[8], 'B2': r[9], 'PP': r[10], 'C': r[11], 'Ca': r[12], 'P': r[13],
         'Fe': r[14], 'price_per_100g': r[15], 'has_lactose': bool(r[16])}
        for r in sample_rows
    ]

    # Фильтрация по аллергенам (демо: lactose)
    available = [f for f in foods if not ('lactose' in allergens and f['has_lactose'])]
    if not available:
        return jsonify({'error': 'No foods available after applying restrictions'})

    # Модель: минимизируем стоимость при выполнении норм
    model = LpProblem("Budget_Diet_Optimization", LpMinimize)
    x = {f['name']: LpVariable(f"{f['name']}", lowBound=0, upBound=10 * period_days) for f in available}
    model += lpSum(f['price_per_100g'] * x[f['name']] for f in available), "Total_Cost"

    for nut in NUT_KEYS:
        model += lpSum(f[nut] * x[f['name']] for f in available) >= norms[nut], f"Min_{nut}"
    # Верхние границы из расчёта:
    norms_upper = {
        'protein': 2.0 * weight,
        'fat': (0.35 * eer_kcal) / 9,
        'carbs': (0.60 * eer_kcal) / 4,
        'kcal': eer_kcal * 1.1,
        'kj': eer_kcal * 4.184 * 1.1
    }
    for nut in ['protein', 'fat', 'carbs', 'kcal', 'kj']:
        model += lpSum(f[nut] * x[f['name']] for f in available) <= norms_upper[nut], f"Max_{nut}"

    solver = PULP_CBC_CMD(options=['primal', '-feasTol', '1e-6'], msg=False)
    status = model.solve(solver)
    if LpStatus[status] != 'Optimal':
        return jsonify({'error': 'No optimal solution found', 'status': LpStatus[status]}), 200

    # Возвращаем граммы в день (если period=week — усредняем на день)
    denom = (7 if period == 'week' else 1)
    diet = {name: round(value(var) * 100 / denom, 2) for name, var in x.items() if value(var) and value(var) > 0}
    total_cost = round(value(model.objective), 2)
    nutrient_totals = {nut: round(sum(f[nut] * value(x[f['name']]) for f in available), 2) for nut in NUT_KEYS}

    return jsonify({
        'diet': diet,
        'total_cost': total_cost,
        'nutrient_totals': nutrient_totals,
        'norms': {k: round(v, 2) for k, v in norms.items()},
        'period': period,
        'status': LpStatus[status]
    })

# Разрешим OPTIONS (на случай инструментов)
@app.route("/optimize", methods=["OPTIONS"], strict_slashes=False)
def optimize_options():
    return ("", 204)

# ------------------------------------------------------------
# Сервисные маршруты / SPA
# ------------------------------------------------------------
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

# Не кешируем index.html, чтобы сразу подтягивалась новая сборка
@app.after_request
def no_cache_index(resp):
    if request.path in ("/", "/index.html"):
        resp.headers["Cache-Control"] = "no-store"
    return resp

if __name__ == "__main__":
    # Перед запуском убедись, что фронт собран: (cd react-client && npm i && npm run build)
    app.run(host="127.0.0.1", port=5000, debug=True)
