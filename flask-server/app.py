from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
from pulp import LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, value, LpStatus
import sqlite3
import logging
import requests
import json
import os
import random
import datetime
from dotenv import load_dotenv
import unicodedata
from urllib.parse import urlencode

load_dotenv()
# Also try to load `auth.env` (used in this workspace) so users can keep credentials there
try:
    env_path = os.path.join(os.path.dirname(__file__), 'auth.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
except Exception:
    pass

# Ensure calculation_history table exists on startup
try:
    import init_history_db  # creates table if missing
    logging.info("History DB initialized: calculation_history ensured")
except Exception as e:
    logging.error(f"Failed to initialize history DB: {e}")

app = Flask(__name__)
# session secret for Flask sessions
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'devsecret')
# allow the React frontend (dev server) to talk and send cookies
FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', 'http://localhost:3000')
CORS(app, supports_credentials=True, resources={r"/*": {"origins": FRONTEND_ORIGIN}})

logging.basicConfig(level=logging.DEBUG)

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.15,  # Сидячий образ жизни
    "low": 1.2,
    "moderate": 1.5,  # Слегка снижено для более реалистичных значений
    "active": 1.75  # Слегка снижено
}

def calculate_bmr(gender, weight, height, age):
    if gender.lower() == "male":
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

def calculate_energy_needs(bmr, activity, gender="male"):
    """Calculate energy needs with gender-specific adjustments for more realistic values."""
    multiplier = ACTIVITY_MULTIPLIERS.get(activity.lower(), 1.3)
    base_energy = bmr * multiplier
    
    # Для женщин немного снижаем значения для более реалистичных результатов
    if gender.lower() == "female":
        # Дополнительное снижение на 5-10% для женщин с низкой активностью
        if activity.lower() in ["sedentary", "low"]:
            base_energy *= 0.95
    
    return base_energy

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
        'fat': (0.30 * eer_kcal) / 9,
        'carbs': (0.60 * eer_kcal) / 4,
        'kcal': eer_kcal * 1.1,
        'kj': eer_kcal * 4.184 * 1.1
    }
    
    # Scale only macronutrients and calories for the period
    # Vitamins and minerals remain daily norms
    energy_nutrients = ['protein', 'fat', 'carbs', 'kj', 'kcal']
    for nut in energy_nutrients:
        if nut in norms:
            norms[nut] *= period_days
    for nut in norms_upper:
        if nut in energy_nutrients:
            norms_upper[nut] *= period_days
    return norms, norms_upper

nut_keys = ['protein', 'fat', 'carbs', 'kj', 'kcal', 'A', 'B1', 'B2', 'PP', 'C', 'Ca', 'P', 'Fe']

def generate_meal_plan_with_chatgpt(diet_data, user_info):
    """Generates a meal plan using ChatGPT based on optimized diet data."""
    try:
        # Get API key from environment
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return {'error': 'OpenAI API key not found. Please set OPENAI_API_KEY environment variable.'}
        
        # Prepare product list for ChatGPT
        products_info = []
        for product, amount in diet_data['diet'].items():
            products_info.append(f"- {product}: {amount}g")
        
        products_text = '\n'.join(products_info)
        
        # Get language from user_info, default to 'lv' (Latvian)
        language = user_info.get('language', 'lv')
        
        # Build prompts based on language
        if language == 'lv':
            # Latvian prompt (bez # virsrakstiem un bez emocijzīmēm)
            prompt = f"""
Tu esi profesionāls uztura speciālists. Izveido detalizētu ēdienkārtu, pamatojoties uz šiem produktiem un to daudzumiem:

PRODUKTI UN DAUDZUMI:
{products_text}

LIETOTĀJA INFORMĀCIJA:
- Dzimums: {user_info.get('gender', 'male')}
- Svars: {user_info.get('weight', 70)} kg
- Augums: {user_info.get('height', 175)} cm
- Vecums: {user_info.get('age', 30)} gadi
- Aktivitātes līmenis: {user_info.get('activity', 'moderate')}
- Periods: {user_info.get('period', 'day')}

Lūdzu, izveido ēdienkārtu skaidrā, strukturētā formā, BEZ # virsrakstiem un BEZ emocijzīmēm. Izmanto šādas sadaļas ar vienkāršiem virsrakstiem:

BROKASTIS (7:00-9:00)
Ēdiena nosaukums
Sastāvdaļas:
- produkts: daudzums g
Gatavošana:
[īss apraksts]
Uzturvērtība: ~X kcal, X g olbaltumvielas, X g tauki, X g ogļhidrāti

PUSDIENAS (12:00-14:00)
[līdzīgi]

VAKARIŅAS (18:00-20:00)
[līdzīgi]

UZKODAS
[ja nepieciešams]

PADOMI:
- praktisks padoms 1
- praktisks padoms 2

Izmanto tikai produktus, kas uzskaitīti augstāk, ar norādītajiem daudzumiem.

ATBILDEI JĀBŪT LATVIEŠU VALODĀ!
"""
            system_message = 'Tu esi profesionāls uztura speciālists ar plašu pieredzi. Atbildi vienmēr latviešu valodā, skaidri un bez emocijzīmēm.'
        else:
            # English prompt (no # headings, no emojis)
            prompt = f"""
You are a professional nutritionist. Create a detailed meal plan based on these products and their amounts:

PRODUCTS AND AMOUNTS:
{products_text}

USER INFORMATION:
- Gender: {user_info.get('gender', 'male')}
- Weight: {user_info.get('weight', 70)} kg
- Height: {user_info.get('height', 175)} cm
- Age: {user_info.get('age', 30)} years
- Activity level: {user_info.get('activity', 'moderate')}
- Period: {user_info.get('period', 'day')}

Please create a meal plan in a clear, structured format WITHOUT # headings and WITHOUT emojis. Use simple section titles:

BREAKFAST (7:00-9:00)
Dish Name
Ingredients:
- product: amount g
Preparation:
[brief description]
Nutrition: ~X kcal, X g protein, X g fat, X g carbs

LUNCH (12:00-14:00)
[similar]

DINNER (18:00-20:00)
[similar]

SNACKS
[if needed]

TIPS:
- practical tip 1
- practical tip 2

Use ONLY the products listed above with their specified amounts.

THE RESPONSE MUST BE IN ENGLISH!
"""
            system_message = 'You are a professional nutritionist. Always respond in English, clearly and without emojis.'

        # Send request to ChatGPT
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': 'gpt-3.5-turbo',
            'messages': [
                {
                    'role': 'system',
                    'content': system_message
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'max_tokens': 1500,
            'temperature': 0.7
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            meal_plan = result['choices'][0]['message']['content']
            return {'meal_plan': meal_plan, 'success': True}
        else:
            error_msg = f"ChatGPT API error: {response.status_code} - {response.text}"
            logging.error(error_msg)
            return {'error': error_msg, 'success': False}
            
    except requests.exceptions.Timeout:
        return {'error': 'ChatGPT API timeout. Please try again.', 'success': False}
    except requests.exceptions.RequestException as e:
        return {'error': f'Network error: {str(e)}', 'success': False}
    except Exception as e:
        logging.error(f"Unexpected error in ChatGPT integration: {str(e)}")
        return {'error': f'Unexpected error: {str(e)}', 'success': False}

def load_products_from_db():
    """Loads products from the SQLite database."""
    import os
    db_path = os.path.join(os.path.dirname(__file__), 'db', 'food.sqlite')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM products")
    
    rows = cursor.fetchall()
    conn.close()
    
    foods = []
    for row in rows:
        # Determine if lactose is present in allergens
        has_lactose = 'laktoze' in str(row[15]).lower() if row[15] else False
        
        food = {
            'id': row[0],
            'name': row[1],
            'protein': row[2] or 0,
            'fat': row[3] or 0,
            'carbs': row[4] or 0,
            'kj': row[5] or 0,
            'kcal': row[6] or 0,
            'A': row[7] or 0,
            'B1': row[8] or 0,
            'B2': row[9] or 0,
            'PP': row[10] or 0,
            'C': row[11] or 0,
            'Ca': row[12] or 0,
            'P': row[13] or 0,
            'Fe': row[14] or 0,
            'price_per_100g': row[16] or 0,
            'has_lactose': has_lactose,
            'allergens': row[15] or ''
        }
        # Filter out erroneous or service rows
        name_normalized = str(food['name']).strip().lower()
        # Also blocklist specific fats we do not want to use
        name_no_diacritics = ''.join(c for c in unicodedata.normalize('NFKD', name_normalized) if not unicodedata.combining(c))
        blocked = {'dienas norma', 'kombinetie tauki', 'cukas tauki'}
        if name_normalized in blocked or name_no_diacritics in blocked or not name_normalized:
            continue
        foods.append(food)
    
    return foods

@app.route('/tdee', methods=['POST'])
def calculate_tdee():
    """Calculate Total Daily Energy Expenditure."""
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400

    gender = data.get('gender', 'male').lower()
    try:
        weight = float(data.get('weight', 70 if gender == 'male' else 60))
        height = float(data.get('height', 175 if gender == 'male' else 165))
        age = float(data.get('age', 30))
        if weight <= 0 or height <= 0 or age <= 0:
            return jsonify({'error': 'Invalid input: weight, height, and age must be positive'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid input: weight, height, and age must be numeric'}), 400

    activity = data.get('activity', 'sedentary')
    
    bmr = calculate_bmr(gender, weight, height, age)
    eer_kcal = calculate_energy_needs(bmr, activity, gender)
    
    return jsonify({'kcal': round(eer_kcal, 2), 'bmr': round(bmr, 2)})

@app.route('/optimize', methods=['POST'])
def optimize_diet():
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400

    allergens = data.get('allergens', [])
    gender = data.get('gender', 'male').lower()
    try:
        weight = float(data.get('weight', 70 if gender == 'male' else 60))
        height = float(data.get('height', 175 if gender == 'male' else 165))
        age = float(data.get('age', 30))
        if weight <= 0 or height <= 0 or age <= 0:
            return jsonify({'error': 'Invalid input: weight, height, and age must be positive'}), 400
        bmi = weight / ((height / 100) ** 2)
        if bmi < 18.5:
            logging.warning(f"BMI {bmi:.1f} is underweight")
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid input: weight, height, and age must be numeric'}), 400

    activity = data.get('activity', 'sedentary')
    period = data.get('period', 'week')
    period_days = 7 if period.lower() == 'week' else 1

    bmr = calculate_bmr(gender, weight, height, age)
    eer_kcal = calculate_energy_needs(bmr, activity, gender)
    norms, norms_upper = get_efsa_norms(gender, weight, age, eer_kcal, period_days)

    # Load products from DB
    foods = load_products_from_db()

    # Filter products by allergens
    available_foods = []
    excluded_by_allergen = []
    for food in foods:
        # Check each allergen
        skip_food = False
        # Normalize allergen string from DB for robust matching
        food_allergens_norm = ''.join(c for c in unicodedata.normalize('NFKD', (food.get('allergens') or '').lower()) if not unicodedata.combining(c))
        # Map common input allergens to Latvian DB keywords (normalized/ascii)
        allergen_map = {
            'lactose': ['laktoze'],
            'milk': ['piens', 'laktoze'],
            'gluten': ['glutens', 'kviesi', 'rudzi', 'miezi', 'auzas'],
            'eggs': ['olas', 'olu'],
            'soy': ['soja'],
            'nuts': ['rieksti', 'zemesrieksti', 'mandeles', 'lazdu', 'valrieksti'],
            'sesame': ['sezama'],
            'sulfites': ['sulfiti'],
            'fish': ['zivis', 'zivju']
        }
        for allergen in allergens:
            key = str(allergen or '').strip().lower()
            if key == 'lactose' and food['has_lactose']:
                skip_food = True
                excluded_by_allergen.append({'name': food['name'], 'reason': 'lactose'})
                break
            patterns = allergen_map.get(key, [])
            if patterns and any(p in food_allergens_norm for p in patterns):
                skip_food = True
                excluded_by_allergen.append({'name': food['name'], 'reason': key})
                break
        if not skip_food:
            available_foods.append(food)

    # Optional vegetarian filter based on request
    # Accept either diet_type == 'vegetarian' or vegetarian == True
    diet_type = str(data.get('diet_type', '')).strip().lower()
    vegetarian_flag = bool(data.get('vegetarian', False)) or diet_type == 'vegetarian'
    if vegetarian_flag:
        def is_meat_or_fish(name: str) -> bool:
            n = name.strip().lower()
            meat_keywords = ['gaļa', 'cūk', 'liellop', 'vistas', 'vista', 'teļa', 'tītara', 'truša', 'zoss', 'pīles']
            fish_keywords = ['ziv', 'siļķ', 'šprot', 'lasis', 'zandarts', 'menca', 'līdaka', 'karpa', 'kaviār']
            offal_keywords = ['aknas', 'smadzenes']
            processed_keywords = ['desa', 'šķiņķ', 'cīsiņ', 'žāvētā']
            return any(k in n for k in meat_keywords + fish_keywords + offal_keywords + processed_keywords)
        available_foods = [f for f in available_foods if not is_meat_or_fish(f['name'])]
    
    if not available_foods:
        return jsonify({'error': 'No foods available after applying restrictions'})

    model = LpProblem("Budget_Diet_Optimization", LpMinimize)
    # Safe solver variable names and per-product caps
    per_product_weekly_cap_units = 10 if period_days == 7 else 3

    def make_safe_var(name: str) -> str:
        base = ''.join(ch if ch.isalnum() else '_' for ch in name)
        base = base.strip('_') or 'var'
        return base

    name_to_var = {}
    used = set()
    for f in available_foods:
        candidate = make_safe_var(f['name'])
        v = candidate
        idx = 2
        while v in used:
            v = f"{candidate}_{idx}"
            idx += 1
        used.add(v)
        name_to_var[f['name']] = v

    x_vars = {name_to_var[f['name']]: LpVariable(name_to_var[f['name']], lowBound=0, upBound=min(3 * period_days, per_product_weekly_cap_units)) for f in available_foods}
    x_by_name = {f['name']: x_vars[name_to_var[f['name']]] for f in available_foods}

    # Objective: price + small health-aware nudges + optional variety noise
    # price term dominates, nudges push away from sweets/refined grains and toward vegetables/whole grains/legumes
    price_term = lpSum(f['price_per_100g'] * x_by_name[f['name']] for f in available_foods)

    # Optional variety to avoid identical optimal sets across runs
    variety = bool(data.get('variety', True))
    variety_strength = float(data.get('variety_strength', 0.15))  # noise weight per 100g unit for variety
    seed = data.get('seed')
    rng = random.Random(seed) if seed is not None else random.Random(os.urandom(8))
    noise_term = 0
    if variety and available_foods:
        noise_weights = {f['name']: rng.uniform(-variety_strength, variety_strength) for f in available_foods}
        noise_term = lpSum(noise_weights[f['name']] * x_by_name[f['name']] for f in available_foods)

    for nut in nut_keys:
        model += lpSum(f[nut] * x_by_name[f['name']] for f in available_foods) >= norms[nut], f"Min_{nut}"
    for nut in ['protein', 'fat', 'carbs', 'kcal', 'kj']:
        if nut in norms_upper:
            model += lpSum(f[nut] * x_by_name[f['name']] for f in available_foods) <= norms_upper[nut], f"Max_{nut}"

    # WHO: limit free sugar to ≤50g/day; cap pure sugar product 'Cukurs' (100g per unit)
    cukurs_names = []
    for n in x_by_name.keys():
        norm = ''.join(c for c in unicodedata.normalize('NFKD', n.lower()) if not unicodedata.combining(c))
        if 'cukurs' in norm:
            cukurs_names.append(n)
    if cukurs_names:
        cukurs_total_units = lpSum(x_by_name[n] for n in cukurs_names)
        if bool(data.get('no_added_sugar', False)):
            model += cukurs_total_units == 0.0, "No_Added_Sugar_Cukurs"
        else:
            model += cukurs_total_units <= 0.5 * period_days, "Max_Added_Sugar_Cukurs"

    # Categorize foods by keywords for realistic constraints
    names = {f['name'] for f in available_foods}
    def normalize_text(text: str) -> str:
        # Lowercase, strip spaces, remove diacritics for robust matching
        t = (text or '').strip().lower()
        return ''.join(c for c in unicodedata.normalize('NFKD', t) if not unicodedata.combining(c))

    normalized_name_map = {name: normalize_text(name) for name in names}

    def in_names(keyword_list):
        # keyword_list should be normalized (ascii, no diacritics)
        return [name for name in names if any(kw in normalized_name_map[name] for kw in keyword_list)]

    oils = in_names(['ella'])
    refined_grains = in_names(['makaroni', 'mannas', 'milti', 'maize'])
    whole_grains = in_names(['griki', 'auzu', 'rudzu', 'miezu', 'putraimi', 'risi', 'grubas'])
    legumes = in_names(['zirn', 'pupi', 'lec', 'soja'])
    vegetables = in_names(['tomat', 'gurk', 'burkan', 'biet', 'kapost', 'spinat', 'salat', 'redis', 'kirb', 'kartupel', 'kabac', 'pipar', 'sipol', 'purav', 'skaben'])
    fruits = in_names(['abol', 'apelsin', 'banan', 'vinog', 'upen', 'aven', 'zemen', 'mandarin', 'bumbier', 'plum', 'citron', 'dzerven', 'bruklen', 'aprikoz', 'persik', 'kirs'])
    offal = in_names(['aknas', 'smadzenes'])
    fish = in_names(['ziv', 'silk', 'sprot', 'lasis', 'zandarts', 'menca', 'lidaka', 'karpa', 'kaviar', 'kilav'])
    poultry = in_names(['vistas', 'vista', 'titara', 'piles', 'zoss'])
    red_meat = in_names(['liellopu', 'cuka', 'tela', 'aita', 'jera', 'cukas'])
    processed_meat = in_names(['desa', 'skink', 'cisin', 'zavet'])
    sweets = in_names(['sokolade', 'konfekt', 'marmelad', 'cepumi', 'kakao', 'karamel'])
    potatoes = in_names(['kartupel'])
    pasta = in_names(['makaroni'])

    # Health-aware nudges in objective (very small weights)
    nudge_penalty = lpSum(0.01 * x_by_name[n] for n in (sweets + refined_grains)) if (sweets or refined_grains) else 0
    nudge_reward = lpSum(-0.005 * x_by_name[n] for n in (vegetables + whole_grains + legumes)) if (vegetables or whole_grains or legumes) else 0
    model += price_term + noise_term + nudge_penalty + nudge_reward, "Total_Cost_With_Health_Nudges_Variety"

    # Oils: ≤30g/day (WHO) → 210g/week → 2.1 units/week
    if oils:
        model += lpSum(x_by_name[name] for name in oils) <= (0.3 * period_days), "Max_Oil"

    # Offal: ≤200g/week → 2 units/week
    if offal:
        if period_days == 7:
            model += lpSum(x_by_name[name] for name in offal) <= 2.0, "Max_Offal_Week"
        else:
            model += lpSum(x_by_name[name] for name in offal) <= 0.3, "Max_Offal_Day"

    # Vegetables: ≥400g/day (WHO) → 2800g/week → 28 units/week
    if vegetables:
        model += lpSum(x_by_name[name] for name in vegetables) >= (4.0 * period_days), "Min_Vegetables"

    # Fruits: ≥200g/day (practical minimum) → 1400g/week → 14 units/week
    if fruits:
        model += lpSum(x_by_name[name] for name in fruits) >= (2.0 * period_days), "Min_Fruits"

    # Legumes: ≥600g/week → 6 units/week (or 1 unit/day)
    if legumes:
        if period_days == 7:
            model += lpSum(x_by_name[name] for name in legumes) >= 6.0, "Min_Legumes_Week"
        else:
            model += lpSum(x_by_name[name] for name in legumes) >= 1.0, "Min_Legumes_Day"

    # Refined grains: ≤200g/day → 1400g/week → 14 units/week
    if refined_grains:
        model += lpSum(x_by_name[name] for name in refined_grains) <= (2.0 * period_days), "Max_Refined_Grains"

    # Whole grains should be ≥ refined grains to encourage healthy choices
    if whole_grains and refined_grains:
        model += lpSum(x_by_name[name] for name in whole_grains) >= lpSum(x_by_name[name] for name in refined_grains), "Min_Whole_vs_Refined"

    # WHO: red meat ≤500g/week (5 units/week)
    if red_meat:
        if period_days == 7:
            model += lpSum(x_by_name[name] for name in red_meat) <= 5.0, "Max_Red_Meat_Week"
        else:
            model += lpSum(x_by_name[name] for name in red_meat) <= 0.7, "Max_Red_Meat_Day"

    # WHO: processed meat ideally 0; enforce zero consumption
    if processed_meat:
        model += lpSum(x_by_name[name] for name in processed_meat) == 0.0, "No_Processed_Meat"

    # Limit sweets (chocolate/candies/cookies/cocoa) to ≤100g/day → 1 unit/day
    if sweets:
        model += lpSum(x_by_name[name] for name in sweets) <= (1.0 * period_days), "Max_Sweets"

    # Optional caps to avoid over-reliance on cheap starches
    if potatoes:
        if period_days == 7:
            model += lpSum(x_by_name[name] for name in potatoes) <= 7.0, "Max_Potatoes_Week"
        else:
            model += lpSum(x_by_name[name] for name in potatoes) <= 1.0, "Max_Potatoes_Day"
    if pasta:
        if period_days == 7:
            model += lpSum(x_by_name[name] for name in pasta) <= 7.0, "Max_Pasta_Week"
        else:
            model += lpSum(x_by_name[name] for name in pasta) <= 1.0, "Max_Pasta_Day"


    # Additional public-health aligned constraints (add only if applicable):
    # AHA: fish at least ~450g/week (two ~225g servings)
    if not vegetarian_flag and fish:
        if period_days == 7:
            model += lpSum(x_by_name[name] for name in fish) >= 4.5, "Min_Fish_Week"
        else:
            model += lpSum(x_by_name[name] for name in fish) >= 0.7, "Min_Fish_Day"

    # Ensure presence of animal protein (meat/poultry/fish) unless vegetarian
    if not vegetarian_flag and (red_meat or poultry or fish):
        animal_groups = []
        if red_meat:
            animal_groups.append(lpSum(x_by_name[name] for name in red_meat))
        if poultry:
            animal_groups.append(lpSum(x_by_name[name] for name in poultry))
        if fish:
            animal_groups.append(lpSum(x_by_name[name] for name in fish))
        if animal_groups:
            min_units = 3.0 if period_days == 7 else 0.5
            model += lpSum(animal_groups) >= min_units, "Min_Animal_Protein"

    # Encourage land animal protein presence as well (poultry or red meat) unless vegetarian
    if not vegetarian_flag and (poultry or red_meat):
        land_groups = []
        if poultry:
            land_groups.append(lpSum(x_by_name[name] for name in poultry))
        if red_meat:
            land_groups.append(lpSum(x_by_name[name] for name in red_meat))
        if land_groups:
            min_land_units = 3.0 if period_days == 7 else 0.5
            model += lpSum(land_groups) >= min_land_units, "Min_Land_Animal_Protein"


    solver = PULP_CBC_CMD(options=['primal', '-feasTol 1e-6'], msg=False)
    status = model.solve(solver)

    if LpStatus[status] != 'Optimal':
        error_msg = {'error': 'No optimal solution found', 'status': LpStatus[status]}
        if LpStatus[status] == 'Infeasible':
            error_msg['details'] = 'Infeasible constraints. Possible issues:'
            for nut in nut_keys:
                total = sum(f[nut] * value(x_by_name[f['name']]) for f in available_foods)
                if total < norms[nut]:
                    error_msg['details'] += f" {nut} ({total:.2f} < {norms[nut]:.2f})"
        return jsonify(error_msg)

    # Build detailed diet items with nutrition data
    diet_items = []
    for food in available_foods:
        name = food['name']
        if name in x_by_name and value(x_by_name[name]) > 0:
            units = value(x_by_name[name])
            grams = round(units * 100, 2)
            diet_items.append({
                'name': name,
                'grams': grams,
                'kcal': round(food['kcal'] * units, 2),
                'protein': round(food['protein'] * units, 2),
                'fat': round(food['fat'] * units, 2),
                'carbs': round(food['carbs'] * units, 2),
                'cost': round(food['price_per_100g'] * units, 2)
            })
    
    # Also keep simple dict format for backwards compatibility
    diet = {item['name']: item['grams'] for item in diet_items}
    
    total_cost = round(value(model.objective), 2)
    nutrient_totals = {nut: round(sum(f[nut] * value(x_by_name[f['name']]) for f in available_foods), 2) for nut in nut_keys}

    # Coverage block (grams per category)
    def sum_grams(group):
        return round(sum(value(x_by_name[n]) * 100 for n in group if n in x_by_name), 2)
    coverage = {
        'fish': sum_grams(fish),
        'poultry': sum_grams(poultry),
        'red_meat': sum_grams(red_meat),
        'whole_grains': sum_grams(whole_grains),
        'refined_grains': sum_grams(refined_grains),
        'vegetables': sum_grams(vegetables),
        'fruits': sum_grams(fruits),
        'legumes': sum_grams(legumes),
        'sweets': sum_grams(sweets)
    }

    return jsonify({
        'diet': diet,
        'items': diet_items,  # Detailed items with all nutrition info
        'total_cost': total_cost,
        'nutrient_totals': nutrient_totals,
        'norms': {nut: round(norms[nut], 2) for nut in norms},
        'period': period,
        'status': LpStatus[status],
        'coverage': coverage,
        'excluded_by_allergen': excluded_by_allergen
    })

@app.route('/meal-plan', methods=['POST'])
def generate_meal_plan():
    """Generates a ChatGPT meal plan based on the optimized diet."""
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400

    # First, compute the optimized diet by calling optimize_diet logic
    # We need to temporarily store the request data for optimize_diet to use
    # Since optimize_diet reads from request.json, we'll call it directly
    # But we need to ensure the request context is available
    
    # Call optimize_diet - it will read from the same request.json
    from flask import has_request_context
    if not has_request_context():
        return jsonify({'error': 'Request context required'}), 500
    
    # Optimize diet first
    try:
        diet_response = optimize_diet()
        if isinstance(diet_response, tuple):  # Error path
            return diet_response
        
        diet_data = diet_response.get_json()
        
        if 'error' in diet_data:
            return jsonify(diet_data), 400
    except Exception as e:
        logging.error(f"Error in optimize_diet: {str(e)}")
        return jsonify({'error': f'Optimization failed: {str(e)}'}), 500
    
    # Prepare user info
    user_info = {
        'gender': data.get('gender', 'male'),
        'weight': data.get('weight', 70),
        'height': data.get('height', 175),
        'age': data.get('age', 30),
        'activity': data.get('activity', 'moderate'),
        'period': data.get('period', 'week'),
        'language': data.get('language', 'lv')  # Default to Latvian
    }
    
    # Generate a meal plan via ChatGPT
    meal_plan_result = generate_meal_plan_with_chatgpt(diet_data, user_info)
    
    if not meal_plan_result.get('success', False):
        return jsonify({
            'error': 'Failed to generate meal plan',
            'details': meal_plan_result.get('error', 'Unknown error')
        }), 500
    
    # Return the combined result
    result = {
        'diet': diet_data.get('diet', {}),
        'total_cost': diet_data.get('total_cost', 0),
        'nutrient_totals': diet_data.get('nutrient_totals', {}),
        'norms': diet_data.get('norms', {}),
        'period': diet_data.get('period', 'week'),
        'status': diet_data.get('status', 'Unknown'),
        'meal_plan': meal_plan_result.get('meal_plan', '')
    }
    
    # Include items if available
    if 'items' in diet_data:
        result['items'] = diet_data['items']
    if 'coverage' in diet_data:
        result['coverage'] = diet_data['coverage']
    
    return jsonify(result)


@app.route('/login')
def oauth_login():
    """Start Google OAuth flow by redirecting user to Google's auth endpoint."""
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    if not client_id:
        return jsonify({
            'error': 'GOOGLE_CLIENT_ID not configured',
            'hint': 'Create flask-server/auth.env or .env with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see OAUTH_README.md)'
        }), 500
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5000/callback')
    state = os.urandom(8).hex()
    session['oauth_state'] = state
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'access_type': 'offline',
        'prompt': 'consent'
    }
    auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)
    return redirect(auth_url)


@app.route('/callback')
def oauth_callback():
    """Handle Google OAuth callback, exchange code for token and store user in session."""
    code = request.args.get('code')
    state = request.args.get('state')
    if not code:
        return jsonify({'error': 'Missing code parameter'}), 400
    if state != session.get('oauth_state'):
        return jsonify({'error': 'Invalid OAuth state'}), 400

    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    if not client_id or not client_secret:
        return jsonify({
            'error': 'GOOGLE_CLIENT_ID/SECRET not configured',
            'hint': 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in flask-server/auth.env or .env and restart the server'
        }), 500
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5000/callback')
    token_url = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    try:
        token_resp = requests.post(token_url, data=data, headers=headers, timeout=10)
        token_resp.raise_for_status()
        token_json = token_resp.json()
        access_token = token_json.get('access_token')
        if not access_token:
            return jsonify({'error': 'Failed to obtain access token', 'details': token_json}), 400

        # Fetch user info from Google's OpenID Connect endpoint
        userinfo_resp = requests.get('https://openidconnect.googleapis.com/v1/userinfo', headers={'Authorization': f'Bearer {access_token}'}, timeout=10)
        userinfo_resp.raise_for_status()
        user = userinfo_resp.json()

        # Minimal user object to store in session
        session['user'] = {
            'id': user.get('sub'),
            'email': user.get('email'),
            'name': user.get('name'),
            'picture': user.get('picture')
        }
        session['access_token'] = access_token

        # Redirect back to frontend
        return redirect(FRONTEND_ORIGIN + '/')
    except requests.RequestException as e:
        return jsonify({'error': 'OAuth token exchange failed', 'details': str(e)}), 500


@app.route('/user')
def get_user():
    """Return current logged-in user info from session."""
    user = session.get('user')
    if not user:
        return jsonify({'logged_in': False})
    return jsonify({'logged_in': True, 'user': user})


@app.route('/logout')
def logout():
    session.clear()
    return redirect(FRONTEND_ORIGIN + '/')


@app.route('/history', methods=['GET'])
def get_calculation_history():
    """Get calculation history for the logged-in user."""
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized', 'logged_in': False}), 401
    
    user_id = user.get('id')
    if not user_id:
        return jsonify({'error': 'Invalid user session'}), 400
    
    try:
        db_path = os.path.join(os.path.dirname(__file__), 'db', 'food.sqlite')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get last 20 calculations for this user
        cursor.execute('''
            SELECT id, created_at, gender, weight, height, age, activity, period,
                   allergens, vegetarian, total_cost, total_kcal, total_protein,
                   total_fat, total_carbs, diet_json, meal_plan
            FROM calculation_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        ''', (user_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                'id': row[0],
                'created_at': row[1],
                'gender': row[2],
                'weight': row[3],
                'height': row[4],
                'age': row[5],
                'activity': row[6],
                'period': row[7],
                'allergens': row[8],
                'vegetarian': bool(row[9]),
                'total_cost': row[10],
                'total_kcal': row[11],
                'total_protein': row[12],
                'total_fat': row[13],
                'total_carbs': row[14],
                'diet': json.loads(row[15]) if row[15] else {},
                'meal_plan': row[16] if len(row) > 16 else ''
            })
        
        return jsonify({'history': history, 'logged_in': True})
    except Exception as e:
        logging.error(f"Error fetching history: {str(e)}")
        return jsonify({'error': f'Failed to fetch history: {str(e)}'}), 500


@app.route('/history', methods=['POST'])
def save_calculation():
    """Save a calculation to history for the logged-in user."""
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized', 'logged_in': False}), 401
    
    user_id = user.get('id')
    user_email = user.get('email')
    if not user_id:
        return jsonify({'error': 'Invalid user session'}), 400
    
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400
    
    try:
        # Extract data from request
        gender = data.get('gender', 'male')
        weight = float(data.get('weight', 70))
        height = float(data.get('height', 175))
        age = int(data.get('age', 30))
        activity = data.get('activity', 'moderate')
        period = data.get('period', 'week')
        allergens = json.dumps(data.get('allergens', []))
        vegetarian = 1 if data.get('vegetarian', False) else 0
        
        # Extract results
        total_cost = float(data.get('total_cost', 0))
        nutrient_totals = data.get('nutrient_totals', {})
        total_kcal = float(nutrient_totals.get('kcal', 0))
        total_protein = float(nutrient_totals.get('protein', 0))
        total_fat = float(nutrient_totals.get('fat', 0))
        total_carbs = float(nutrient_totals.get('carbs', 0))
        diet = data.get('diet', {})
        diet_json = json.dumps(diet)
        meal_plan = data.get('meal_plan', '')
        
        # Save to database
        db_path = os.path.join(os.path.dirname(__file__), 'db', 'food.sqlite')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO calculation_history 
            (user_id, user_email, gender, weight, height, age, activity, period,
             allergens, vegetarian, total_cost, total_kcal, total_protein,
             total_fat, total_carbs, diet_json, meal_plan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, user_email, gender, weight, height, age, activity, period,
              allergens, vegetarian, total_cost, total_kcal, total_protein,
              total_fat, total_carbs, diet_json, meal_plan))
        
        calculation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'id': calculation_id,
            'message': 'Calculation saved to history'
        })
    except Exception as e:
        logging.error(f"Error saving calculation: {str(e)}")
        return jsonify({'error': f'Failed to save calculation: {str(e)}'}), 500


@app.route('/history/<int:calculation_id>', methods=['DELETE'])
def delete_calculation(calculation_id):
    """Delete a calculation from history."""
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized', 'logged_in': False}), 401
    
    user_id = user.get('id')
    if not user_id:
        return jsonify({'error': 'Invalid user session'}), 400
    
    try:
        db_path = os.path.join(os.path.dirname(__file__), 'db', 'food.sqlite')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Delete only if it belongs to this user
        cursor.execute('''
            DELETE FROM calculation_history
            WHERE id = ? AND user_id = ?
        ''', (calculation_id, user_id))
        
        deleted_rows = cursor.rowcount
        conn.commit()
        conn.close()
        
        if deleted_rows == 0:
            return jsonify({'error': 'Calculation not found or unauthorized'}), 404
        
        return jsonify({'success': True, 'message': 'Calculation deleted'})
    except Exception as e:
        logging.error(f"Error deleting calculation: {str(e)}")
        return jsonify({'error': f'Failed to delete calculation: {str(e)}'}), 500


@app.route('/history/export', methods=['GET'])
def export_history():
    """Export user's calculation history as JSON."""
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized', 'logged_in': False}), 401
    
    user_id = user.get('id')
    if not user_id:
        return jsonify({'error': 'Invalid user session'}), 400
    
    try:
        db_path = os.path.join(os.path.dirname(__file__), 'db', 'food.sqlite')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all calculations for this user
        cursor.execute('''
            SELECT id, created_at, gender, weight, height, age, activity, period,
                   allergens, vegetarian, total_cost, total_kcal, total_protein,
                   total_fat, total_carbs, diet_json
            FROM calculation_history
            WHERE user_id = ?
            ORDER BY created_at DESC
        ''', (user_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        export_data = {
            'user': {
                'id': user_id,
                'email': user.get('email'),
                'name': user.get('name')
            },
            'export_date': json.dumps(str(datetime.datetime.now())),
            'calculations': []
        }
        
        for row in rows:
            export_data['calculations'].append({
                'id': row[0],
                'created_at': row[1],
                'gender': row[2],
                'weight': row[3],
                'height': row[4],
                'age': row[5],
                'activity': row[6],
                'period': row[7],
                'allergens': row[8],
                'vegetarian': bool(row[9]),
                'total_cost': row[10],
                'total_kcal': row[11],
                'total_protein': row[12],
                'total_fat': row[13],
                'total_carbs': row[14],
                'diet': json.loads(row[15]) if row[15] else {}
            })
        
        return jsonify(export_data)
    except Exception as e:
        logging.error(f"Error exporting history: {str(e)}")
        return jsonify({'error': f'Failed to export history: {str(e)}'}), 500


@app.route('/chatgpt', methods=['POST'])
def chatgpt_endpoint():
    """ChatGPT endpoint for general nutrition questions."""
    try:
        # Get API key from environment
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OpenAI API key not found. Please set OPENAI_API_KEY environment variable.'}), 500
        
        data = request.json
        if not isinstance(data, dict):
            return jsonify({'error': 'Invalid input: JSON object required'}), 400
        
        user_message = data.get('message', '')
        language = data.get('language', 'lv')
        conversation_history = data.get('conversation_history', [])
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Build system message based on language
        if language == 'lv':
            system_message = 'Tu esi profesionāls uztura speciālists un dietologs ar plašu pieredzi. Palīdzi lietotājam ar padomiem par veselīgu uzturu, receptēm un uzturvērtību. Atbildi vienmēr latviešu valodā, būtīgi un praktiski.'
        else:
            system_message = 'You are a professional nutritionist and dietitian with extensive experience. Help the user with advice on healthy nutrition, recipes, and nutritional value. Always respond in English, concisely and practically.'
        
        # Build messages array
        messages = [{'role': 'system', 'content': system_message}]
        
        # Add conversation history (last 10 messages to avoid token limit)
        for msg in conversation_history[-10:]:
            if msg.get('role') in ['user', 'assistant'] and msg.get('content'):
                messages.append({'role': msg['role'], 'content': msg['content']})
        
        # Add current user message
        messages.append({'role': 'user', 'content': user_message})
        
        # Send request to ChatGPT
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        request_data = {
            'model': 'gpt-3.5-turbo',
            'messages': messages,
            'max_tokens': 1000,
            'temperature': 0.7
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=request_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result['choices'][0]['message']['content']
            return jsonify({'response': ai_response, 'success': True})
        else:
            error_msg = f"ChatGPT API error: {response.status_code} - {response.text}"
            logging.error(error_msg)
            return jsonify({'error': error_msg, 'success': False}), 500
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'ChatGPT API timeout. Please try again.', 'success': False}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}', 'success': False}), 500
    except Exception as e:
        logging.error(f"Unexpected error in ChatGPT endpoint: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'success': False}), 500


if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)