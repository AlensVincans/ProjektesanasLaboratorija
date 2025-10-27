# flask-server/app.py
from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import logging, sqlite3, os, unicodedata

# ====== Статика CRA ======
ROOT = Path(__file__).resolve().parent
BUILD_DIR = ROOT.parent / "react-client" / "build"   # CRA build/

app = Flask(__name__, static_folder=str(BUILD_DIR), static_url_path="/")
logging.basicConfig(level=logging.INFO)

# ====== Путь к БД ======
DB_PATH = os.environ.get("FOOD_DB_PATH") or str((ROOT / "db" / "food.db").resolve())

# Алиасы колонок (включая латышские названия из твоей БД)
COLUMN_ALIASES = {
    "name": ["name","product","title","product_name","food","uzturldzeklis"],
    "price_per_100g": ["price_per_100g","price_100g","cost_per_100g","cena_100g"],
    "price_per_kg":   ["price_per_kg","price_kg","cost_per_kg","cena_1kg"],
    "price":          ["price","unit_price","item_price","cena"],
    "weight_g":       ["weight_g","net_weight_g","grams","gram","package_weight_g","size_g","svars_g"],
    "kcal":           ["kcal","calories","energy_kcal","kcal100g","kcal(100g)"],
    "kj":             ["kj","energy","energy_kj","kj100g","kj(100g)"],
    "protein":        ["protein","proteins","prot","protein_g","olb.v.","olbv"],
    "fat":            ["fat","fats","fat_g","tauki"],
    "carbs":          ["carbs","carbohydrates","carb","carbo_g","oglh.","oglh"],
    "A":  ["vit_a","a","retinol","vitamin_a"],
    "B1": ["vit_b1","b1","thiamin","thiamine"],
    "B2": ["vit_b2","b2","riboflavin"],
    "PP": ["pp","niacin","vit_pp","b3"],
    "C":  ["vit_c","c","ascorbic_acid"],
    "Ca": ["calcium","ca"],
    "P":  ["phosphorus","p"],
    "Fe": ["iron","fe"],
    "has_lactose": ["has_lactose","lactose","is_dairy","contains_lactose","allergeni"],
}
LIKELY_TABLES = ["foods", "products", "items", "food", "product"]
REQUIRED_CORE = ["name", "price_per_100g", "kcal", "protein", "fat", "carbs"]
MICRO_KEYS = ["A","B1","B2","PP","C","Ca","P","Fe"]

# ------------------------------------------------------------
# БЛОК 1. Базовый расчёт TDEE (Мифлин–Сан Жеор)
# ------------------------------------------------------------
AF = {
    "low": 1.2,
    "moderate": 1.55,
    "high": 1.725,
    "sedentary": 1.4,
    "active": 2.0,
    "very active": 2.0,
}

def mifflin_bmr(gender: str, weight: float, height: float, age: int) -> float:
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
# Утилиты для чтения БД
# ------------------------------------------------------------
def _detect_table(conn: sqlite3.Connection) -> str | None:
    rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    tables = [r[0] for r in rows]
    for t in LIKELY_TABLES:
        if t in tables:
            return t
    return tables[0] if tables else None

def _norm(s: str) -> str:
    # нормализуем имена колонок: снимаем диакритику, нижний регистр, только a-z0-9
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    return "".join(ch for ch in s if ch.isalnum())

def _colmap(actual_cols: list[str]) -> dict:
    norm_to_real = {_norm(c): c for c in actual_cols}
    m = {}
    for key, aliases in COLUMN_ALIASES.items():
        found_real = None
        for alias in aliases:
            alias_norm = _norm(alias)
            if alias_norm in norm_to_real:
                found_real = norm_to_real[alias_norm]
                break
        m[key] = found_real
    return m

def load_foods_from_db(db_path: str) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        table = _detect_table(conn)
        if not table:
            raise RuntimeError("No tables in DB")
        cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})")]
        cmap = _colmap(cols)
        missing = [k for k in REQUIRED_CORE if cmap.get(k) is None]
        if missing:
            raise RuntimeError(f"Table '{table}' missing required columns (or aliases): {missing}")

        rows = conn.execute(f"SELECT * FROM {table}").fetchall()
        foods = []
        for r in rows:
            def get_raw(col, default=None):
                if col is None: return default
                try: return r[col]
                except Exception: return default

            def getf(key, default=0.0):
                c = cmap.get(key)
                v = get_raw(c, None)
                try: return float(v)
                except Exception: return default

            def getb(key):
                c = cmap.get(key)
                v = get_raw(c, 0)
                if isinstance(v, (int, float)): return v != 0
                s = str(v).strip().lower()
                # латыш/рус/англ варианты лактозы/молока
                return any(x in s for x in ("laktoz", "laktoze", "pien", "piena", "milk", "lactose", "молок"))

            name_col = cmap["name"]
            name = str(get_raw(name_col, "")).strip()
            if not name:
                continue

            foods.append({
                "name": name,
                "price_per_100g": getf("price_per_100g", 0.0),
                "kcal": getf("kcal", 0.0) or (getf("kj", 0.0) / 4.184 if getf("kj", 0.0) else 0.0),
                "protein": getf("protein", 0.0),
                "fat": getf("fat", 0.0),
                "carbs": getf("carbs", 0.0),
                "A": getf("A", 0.0),
                "B1": getf("B1", 0.0),
                "B2": getf("B2", 0.0),
                "PP": getf("PP", 0.0),
                "C": getf("C", 0.0),
                "Ca": getf("Ca", 0.0),
                "P": getf("P", 0.0),
                "Fe": getf("Fe", 0.0),
                "has_lactose": getb("has_lactose"),
            })
        if not foods:
            raise RuntimeError(f"Table '{table}' had no usable rows")
        return foods
    finally:
        conn.close()

# ------------------------------------------------------------
# БЛОК 2. Оптимизация рациона (PuLP)
# ------------------------------------------------------------
from pulp import (  # type: ignore
    LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, value, LpStatus
)

def calculate_bmr_hb(gender, weight, height, age):
    # Harris–Benedict
    if gender.lower() == "male":
        return 88.362 + 13.397*weight + 4.799*height - 5.677*age
    return 447.593 + 9.247*weight + 3.098*height - 4.330*age

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
        'Fe': 11 if gender.lower() == 'male' else (16 if age < 50 else 11),
    }
    norms_upper = {
        'protein': 2.0 * weight,
        'fat': (0.35 * eer_kcal) / 9,
        'carbs': (0.60 * eer_kcal) / 4,
        'kcal': eer_kcal * 1.1,
        'kj': eer_kcal * 4.184 * 1.1,
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

    allergens = [str(a).lower() for a in data.get('allergens', [])]
    dislikes  = [str(d).lower() for d in data.get('dislikes', [])]
    gender    = (data.get('gender') or 'male').lower()

    try:
        weight = float(data.get('weight') or (70 if gender == 'male' else 60))
        height = float(data.get('height') or (175 if gender == 'male' else 165))
        age    = float(data.get('age') or 30)
        if weight <= 0 or height <= 0 or age <= 0:
            return jsonify({'error': 'Invalid input: weight, height, and age must be positive'}), 400
    except Exception:
        return jsonify({'error': 'Invalid input: weight, height, and age must be numeric'}), 400

    activity    = (data.get('activity') or 'sedentary').lower()
    period      = (data.get('period') or 'day').lower()
    period_days = 7 if period == 'week' else 1

    # Энергопотребление
    bmr      = calculate_bmr_hb(gender, weight, height, age)
    eer_kcal = calculate_energy_needs(bmr, activity)
    norms, norms_upper = get_efsa_norms(gender, weight, age, eer_kcal, period_days)

    # Грузим продукты из БД
    try:
        foods = load_foods_from_db(DB_PATH)
        app.logger.info(f"Loaded {len(foods)} foods from DB: {DB_PATH}")
    except Exception as e:
        app.logger.warning(f"DB load failed: {e}. Falling back to empty.")
        foods = []

    # Фильтр аллергены/нелюбимые
    def dislike_match(food_name: str) -> bool:
        lname = (food_name or "").lower()
        return any(d in lname for d in dislikes) if dislikes else False

    available = [
        f for f in foods
        if not ('lactose' in allergens and f.get('has_lactose', False))
        and not dislike_match(f.get('name', ''))
    ]
    if not available:
        return jsonify({'error': 'No foods available after applying restrictions'})

    # Модель
    model = LpProblem("Budget_Diet_Optimization", LpMinimize)
    x = {f['name']: LpVariable(f"{_norm(f['name'])}", lowBound=0, upBound=10 * period_days) for f in available}

    # ---------- Диагностика доступности микро ----------
    max_portions = 10 * period_days  # по 100 г
    avail_supply = {
        nut: sum(max(0.0, f.get(nut, 0.0)) * max_portions for f in available)
        for nut in NUT_KEYS
    }

    # ---------- Ограничения ----------
    relaxed, skipped = [], []

    # Энергия — жёстко: >=90% целевой и <= верхней (≈110%)
    kcal_min = norms['kcal'] * 0.9
    kcal_max = norms_upper['kcal']
    model += lpSum(f.get('kcal', 0.0) * x[f['name']] for f in available) >= kcal_min, "Min_kcal"
    model += lpSum(f.get('kcal', 0.0) * x[f['name']] for f in available) <= kcal_max, "Max_kcal"

    # Макро — жёстко, но минимум с люфтом 10%
    for nut in ['protein', 'fat', 'carbs']:
        need = norms[nut] * 0.9
        cap  = norms_upper[nut]
        model += lpSum(f.get(nut, 0.0) * x[f['name']] for f in available) >= need, f"Min_{nut}"
        model += lpSum(f.get(nut, 0.0) * x[f['name']] for f in available) <= cap,  f"Max_{nut}"

    # Микро — мягко: только если реально достижимы
    for nut in ['A','B1','B2','PP','C','Ca','P','Fe','kj']:
        need = norms[nut]
        avail = avail_supply.get(nut, 0.0)
        if avail <= 1e-9 or avail < 0.6 * need:
            skipped.append(nut)
            continue
        goal = min(need, avail) * 0.9
        if goal < need:
            relaxed.append({"nutrient": nut, "target": round(need,2), "used_target": round(goal,2), "avail": round(avail,2)})
        model += lpSum(f.get(nut, 0.0) * x[f['name']] for f in available) >= goal, f"Min_{nut}"

    # Целевая функция: стоимость + крошечная регуляризация
    model.setObjective(
        lpSum(f['price_per_100g'] * x[f['name']] for f in available) +
        1e-6 * lpSum(x[f['name']] for f in available)
    )

    solver = PULP_CBC_CMD(options=['primal', '-feasTol', '1e-6'], msg=False)
    status = model.solve(solver)

    if LpStatus[status] != 'Optimal':
        return jsonify({'error': 'No optimal solution found', 'status': LpStatus[status],
                        'skipped': skipped, 'relaxed': relaxed}), 200

    # Результаты: граммы/день, цена/день, ккал/день
    denom = 7 if period == 'week' else 1
    items = []
    for f in available:
        q100 = value(x[f['name']]) or 0.0
        if q100 <= 0: 
            continue
        items.append({
            "name": f['name'],
            "grams_per_day": round(q100 * 100 / denom, 2),
            "cost_per_day":  round(f['price_per_100g'] * q100 / denom, 2),
            "kcal_per_day":  round(f.get('kcal', 0.0) * q100 / denom, 1),
        })

    diet = {it["name"]: it["grams_per_day"] for it in items}
    total_cost = round(value(model.objective), 2)
    nutrient_totals = {
        nut: round(sum(f.get(nut, 0.0) * value(x[f['name']]) for f in available), 2)
        for nut in NUT_KEYS
    }

    return jsonify({
        'diet': diet,
        'items': sorted(items, key=lambda z: z["grams_per_day"], reverse=True),
        'total_cost': total_cost,
        'nutrient_totals': nutrient_totals,
        'norms': {k: round(v, 2) for k, v in norms.items()},
        'period': period,
        'status': LpStatus[status],
        'relaxed': relaxed,
        'skipped': skipped,
    })

# Разрешим OPTIONS (префлайт)
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
    # Перед запуском: (cd react-client && npm i && npm run build)
    app.run(host="127.0.0.1", port=5000, debug=True)
