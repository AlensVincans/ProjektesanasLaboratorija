from flask import Flask, request, jsonify
from pulp import LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, value, LpStatus
import sqlite3
import logging
import requests
import json
import os
from dotenv import load_dotenv
import unicodedata

load_dotenv()

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG)

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.4,
    "low": 1.6,
    "moderate": 1.8,
    "active": 1.9,
    "very active": 2.0
}

def calculate_bmr(gender, weight, height, age):
    if gender.lower() == "male":
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

def calculate_energy_needs(bmr, activity):
    multiplier = ACTIVITY_MULTIPLIERS.get(activity.lower(), 1.4)
    return bmr * multiplier

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
        
        # Build the prompt in Latvian
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

Lūdzu, izveido ēdienkārtu, kas ietver:
1. ĒDIENU SADALĪJUMU (brokastis, pusdienas, vakariņas, uzkodas)
2. KONKRĒTUS RECEPTES ar precīziem katra produkta daudzumiem
3. ĒDIENU LAIKU
4. PRAKTISKUS GATAVOŠANAS PADOMUS

Atbildei jābūt strukturētai un praktiskai. Izmanto tikai produktus, kas uzskaitīti augstāk.

Formatē atbildi skaidrā, organizētā veidā ar sadaļām katrai maltītei un iekļauj uzturvērtības informāciju.

ATBILDEI JĀBŪT LATVIEŠU VALODĀ!
"""

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
                    'content': 'Tu esi profesionāls uztura speciālists ar plašu pieredzi ēdienkārtu izveidē un uztura ieteikumos. Atbildi vienmēr latviešu valodā.'
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
    db_path = os.path.join(os.path.dirname(__file__), 'db.sqlite')
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
    eer_kcal = calculate_energy_needs(bmr, activity)
    norms, norms_upper = get_efsa_norms(gender, weight, age, eer_kcal, period_days)

    # Load products from DB
    foods = load_products_from_db()

    # Filter products by allergens
    available_foods = []
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
                break
            patterns = allergen_map.get(key, [])
            if patterns and any(p in food_allergens_norm for p in patterns):
                skip_food = True
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
    # Limit max 300g per product per day and ≤1000g per week to promote variety
    per_product_weekly_cap_units = 10 if period_days == 7 else 3
    x = {f['name']: LpVariable(f"{f['name']}", lowBound=0, upBound=min(3 * period_days, per_product_weekly_cap_units)) for f in available_foods}
    model += lpSum(f['price_per_100g'] * x[f['name']] for f in available_foods), "Total_Cost"

    for nut in nut_keys:
        model += lpSum(f[nut] * x[f['name']] for f in available_foods) >= norms[nut], f"Min_{nut}"
    for nut in ['protein', 'fat', 'carbs', 'kcal', 'kj']:
        if nut in norms_upper:
            model += lpSum(f[nut] * x[f['name']] for f in available_foods) <= norms_upper[nut], f"Max_{nut}"

    # WHO: limit free sugar to ≤50g/day; here we cap pure sugar product 'Cukurs' (100g per unit)
    if 'Cukurs' in x:
        if bool(data.get('no_added_sugar', False)):
            model += x['Cukurs'] == 0.0, "No_Added_Sugar_Cukurs"
        else:
            model += x['Cukurs'] <= 0.5 * period_days, "Max_Added_Sugar_Cukurs"

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

    # Oils: ≤30g/day (WHO) → 210g/week → 2.1 units/week
    if oils:
        model += lpSum(x[name] for name in oils) <= (0.3 * period_days), "Max_Oil"

    # Offal: ≤200g/week → 2 units/week
    if offal:
        if period_days == 7:
            model += lpSum(x[name] for name in offal) <= 2.0, "Max_Offal_Week"
        else:
            model += lpSum(x[name] for name in offal) <= 0.3, "Max_Offal_Day"

    # Vegetables: ≥400g/day (WHO) → 2800g/week → 28 units/week
    if vegetables:
        model += lpSum(x[name] for name in vegetables) >= (4.0 * period_days), "Min_Vegetables"

    # Fruits: ≥200g/day (practical minimum) → 1400g/week → 14 units/week
    if fruits:
        model += lpSum(x[name] for name in fruits) >= (2.0 * period_days), "Min_Fruits"

    # Legumes: ≥600g/week → 6 units/week (or 1 unit/day)
    if legumes:
        if period_days == 7:
            model += lpSum(x[name] for name in legumes) >= 6.0, "Min_Legumes_Week"
        else:
            model += lpSum(x[name] for name in legumes) >= 1.0, "Min_Legumes_Day"

    # Refined grains: ≤200g/day → 1400g/week → 14 units/week
    if refined_grains:
        model += lpSum(x[name] for name in refined_grains) <= (2.0 * period_days), "Max_Refined_Grains"

    # Whole grains should be ≥ refined grains to encourage healthy choices
    if whole_grains and refined_grains:
        model += lpSum(x[name] for name in whole_grains) >= lpSum(x[name] for name in refined_grains), "Min_Whole_vs_Refined"

    # WHO: red meat ≤500g/week (5 units/week)
    if red_meat:
        if period_days == 7:
            model += lpSum(x[name] for name in red_meat) <= 5.0, "Max_Red_Meat_Week"
        else:
            model += lpSum(x[name] for name in red_meat) <= 0.7, "Max_Red_Meat_Day"

    # WHO: processed meat ideally 0; enforce zero consumption
    if processed_meat:
        model += lpSum(x[name] for name in processed_meat) == 0.0, "No_Processed_Meat"

    # Limit sweets (chocolate/candies/cookies/cocoa) to ≤100g/day → 1 unit/day
    if sweets:
        model += lpSum(x[name] for name in sweets) <= (1.0 * period_days), "Max_Sweets"

    # Skip combined fats and animal fats categories entirely (removed by request)

    # Additional public-health aligned constraints (add only if applicable):
    # AHA: fish at least 2 servings/week (~300-450g/week)
    if not vegetarian_flag and fish:
        if period_days == 7:
            model += lpSum(x[name] for name in fish) >= 3.0, "Min_Fish_Week"
        else:
            model += lpSum(x[name] for name in fish) >= 0.5, "Min_Fish_Day"

    # Ensure presence of animal protein (meat/poultry/fish) unless vegetarian
    if not vegetarian_flag and (red_meat or poultry or fish):
        animal_groups = []
        if red_meat:
            animal_groups.append(lpSum(x[name] for name in red_meat))
        if poultry:
            animal_groups.append(lpSum(x[name] for name in poultry))
        if fish:
            animal_groups.append(lpSum(x[name] for name in fish))
        if animal_groups:
            min_units = 3.0 if period_days == 7 else 0.5
            model += lpSum(animal_groups) >= min_units, "Min_Animal_Protein"

    # Encourage land animal protein presence as well (poultry or red meat) unless vegetarian
    if not vegetarian_flag and (poultry or red_meat):
        land_groups = []
        if poultry:
            land_groups.append(lpSum(x[name] for name in poultry))
        if red_meat:
            land_groups.append(lpSum(x[name] for name in red_meat))
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
                total = sum(f[nut] * value(x[f['name']]) for f in available_foods)
                if total < norms[nut]:
                    error_msg['details'] += f" {nut} ({total:.2f} < {norms[nut]:.2f})"
        return jsonify(error_msg)

    diet = {name: round(value(x[name]) * 100, 2) for name in x if value(x[name]) > 0}
    total_cost = round(value(model.objective), 2)
    nutrient_totals = {nut: round(sum(f[nut] * value(x[f['name']]) for f in available_foods), 2) for nut in nut_keys}

    return jsonify({
        'diet': diet,
        'total_cost': total_cost,
        'nutrient_totals': nutrient_totals,
        'norms': {nut: round(norms[nut], 2) for nut in norms},
        'period': period,
        'status': LpStatus[status]
    })

@app.route('/meal-plan', methods=['POST'])
def generate_meal_plan():
    """Generates a ChatGPT meal plan based on the optimized diet."""
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400

    # First, compute the optimized diet
    diet_response = optimize_diet()
    if isinstance(diet_response, tuple):  # Error path
        return diet_response
    
    diet_data = diet_response.get_json()
    
    if 'error' in diet_data:
        return jsonify(diet_data), 400
    
    # Prepare user info
    user_info = {
        'gender': data.get('gender', 'male'),
        'weight': data.get('weight', 70),
        'height': data.get('height', 175),
        'age': data.get('age', 30),
        'activity': data.get('activity', 'moderate'),
        'period': data.get('period', 'week')
    }
    
    # Generate a meal plan via ChatGPT
    meal_plan_result = generate_meal_plan_with_chatgpt(diet_data, user_info)
    
    if not meal_plan_result.get('success', False):
        return jsonify({
            'error': 'Failed to generate meal plan',
            'details': meal_plan_result.get('error', 'Unknown error')
        }), 500
    
    # Return the combined result
    return jsonify({
        'diet': diet_data['diet'],
        'total_cost': diet_data['total_cost'],
        'nutrient_totals': diet_data['nutrient_totals'],
        'norms': diet_data['norms'],
        'period': diet_data['period'],
        'status': diet_data['status'],
        'meal_plan': meal_plan_result['meal_plan']
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True)