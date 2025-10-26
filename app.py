from flask import Flask, request, jsonify
from pulp import LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, value, LpStatus
import logging

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG)

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.4,
    "low": 1.6,
    "moderate": 1.8,
    "active": 2.0,
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
    # Relax fat and calcium constraints to 95% of target
    # norms['fat'] *= 0.95
    # norms['Ca'] *= 0.95
    
    for nut in norms:
        norms[nut] *= period_days
    for nut in norms_upper:
        norms_upper[nut] *= period_days
    return norms, norms_upper

nut_keys = ['protein', 'fat', 'carbs', 'kj', 'kcal', 'A', 'B1', 'B2', 'PP', 'C', 'Ca', 'P', 'Fe']

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
        {'name': row[1], 'protein': row[2], 'fat': row[3], 'carbs': row[4], 'kj': row[5], 'kcal': row[6],
         'A': row[7], 'B1': row[8], 'B2': row[9], 'PP': row[10], 'C': row[11], 'Ca': row[12], 'P': row[13],
         'Fe': row[14], 'price_per_100g': row[15], 'has_lactose': bool(row[16])}
        for row in sample_rows
    ]

    available_foods = [f for f in foods if not ('lactose' in allergens and f['has_lactose'])]
    if not available_foods:
        return jsonify({'error': 'No foods available after applying restrictions'})

    model = LpProblem("Budget_Diet_Optimization", LpMinimize)
    x = {f['name']: LpVariable(f"{f['name']}", lowBound=0, upBound=10 * period_days) for f in available_foods}
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

    diet = {name: round(value(x[name]) * 100 / (7 if period.lower() == 'week' else 1), 2) for name in x if value(x[name]) > 0}
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

if __name__ == '__main__':
    app.run(port=5001, debug=True)