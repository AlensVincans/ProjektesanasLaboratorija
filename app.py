from flask import Flask, request, jsonify
from pulp import LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, value, LpStatus
import sqlite3
import logging
import requests
import json
import os
from dotenv import load_dotenv

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
        'fat': (0.35 * eer_kcal) / 9,
        'carbs': (0.60 * eer_kcal) / 4,
        'kcal': eer_kcal * 1.1,
        'kj': eer_kcal * 4.184 * 1.1
    }
    
    # Масштабируем только макронутриенты и калории на период
    # Витамины и минералы остаются дневными нормами
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
    """Генерирует план питания с помощью ChatGPT"""
    try:
        # Получаем API ключ из переменной окружения
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return {'error': 'OpenAI API key not found. Please set OPENAI_API_KEY environment variable.'}
        
        # Подготавливаем данные для ChatGPT
        products_info = []
        for product, amount in diet_data['diet'].items():
            products_info.append(f"- {product}: {amount}г")
        
        products_text = '\n'.join(products_info)
        
        # Формируем промпт для ответа на латышском языке
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

        # Отправляем запрос к ChatGPT
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
    """Загружает продукты из базы данных"""
    import os
    db_path = os.path.join(os.path.dirname(__file__), 'db.sqlite')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM products")
    
    rows = cursor.fetchall()
    conn.close()
    
    foods = []
    for row in rows:
        # Определяем есть ли лактоза в аллергенах
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
    period = data.get('period', 'day')
    period_days = 7 if period.lower() == 'week' else 1

    bmr = calculate_bmr(gender, weight, height, age)
    eer_kcal = calculate_energy_needs(bmr, activity)
    norms, norms_upper = get_efsa_norms(gender, weight, age, eer_kcal, period_days)

    # Загружаем продукты из базы данных
    foods = load_products_from_db()

    # Фильтруем продукты по аллергенам
    available_foods = []
    for food in foods:
        # Проверяем каждый аллерген
        skip_food = False
        for allergen in allergens:
            if allergen.lower() == 'lactose' and food['has_lactose']:
                skip_food = True
                break
            # Можно добавить проверку других аллергенов здесь
        if not skip_food:
            available_foods.append(food)
    
    if not available_foods:
        return jsonify({'error': 'No foods available after applying restrictions'})

    model = LpProblem("Budget_Diet_Optimization", LpMinimize)
    x = {f['name']: LpVariable(f"{f['name']}", lowBound=0, upBound=5 * period_days) for f in available_foods}
    model += lpSum(f['price_per_100g'] * x[f['name']] for f in available_foods), "Total_Cost"

    for nut in nut_keys:
        model += lpSum(f[nut] * x[f['name']] for f in available_foods) >= norms[nut], f"Min_{nut}"
    for nut in ['protein', 'fat', 'carbs', 'kcal', 'kj']:
        if nut in norms_upper:
            model += lpSum(f[nut] * x[f['name']] for f in available_foods) <= norms_upper[nut], f"Max_{nut}"

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

    diet = {name: round(value(x[name]) * 100 / period_days, 2) for name in x if value(x[name]) > 0}
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
    """Генерирует план питания с помощью ChatGPT на основе оптимизированной диеты"""
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid input: JSON object required'}), 400

    # Сначала получаем оптимизированную диету
    diet_response = optimize_diet()
    if isinstance(diet_response, tuple):  # Если есть ошибка
        return diet_response
    
    diet_data = diet_response.get_json()
    
    if 'error' in diet_data:
        return jsonify(diet_data), 400
    
    # Подготавливаем информацию о пользователе
    user_info = {
        'gender': data.get('gender', 'male'),
        'weight': data.get('weight', 70),
        'height': data.get('height', 175),
        'age': data.get('age', 30),
        'activity': data.get('activity', 'moderate'),
        'period': data.get('period', 'day')
    }
    
    # Генерируем план питания с помощью ChatGPT
    meal_plan_result = generate_meal_plan_with_chatgpt(diet_data, user_info)
    
    if not meal_plan_result.get('success', False):
        return jsonify({
            'error': 'Failed to generate meal plan',
            'details': meal_plan_result.get('error', 'Unknown error')
        }), 500
    
    # Возвращаем комбинированный результат
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