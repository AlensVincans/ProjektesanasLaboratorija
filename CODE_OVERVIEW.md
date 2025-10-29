## Code Overview

This document explains the core modules, endpoints, optimization model, constraints, and key data flows in `prod/app.py`.

### Endpoints
- POST `/optimize`
  - Input: JSON with `gender`, `age`, `height`, `weight`, `activity`, optional `period` (`day`/`week`), `allergens` (array), `diet_type` or `vegetarian`, and `no_added_sugar`.
  - Output: optimized diet for the period with product grams, total cost, nutrient totals, norms, and status.

- POST `/meal-plan`
  - Calls `/optimize` internally, then uses ChatGPT to generate a human-readable meal plan in Latvian.

### Data Loading
- SQLite `db.sqlite`, table `products`.
- `load_products_from_db()` loads rows into food dicts, computes `has_lactose`, filters service/blocked items (e.g., `Dienas norma`, combined/animal fats we don't use).

### Units and Periods
- Decision variables are in 100 g units per product.
- Output `diet` is in grams for the whole period.
- Default period is `week` (7 days). Vitamins/minerals remain daily norms; energy nutrients (protein, fat, carbs, kcal, kJ) are scaled by period days.

### Objective
- Minimize total monetary cost: sum(price_per_100g * x_i).

### Core Constraints
- Nutrient minimums (EFSA-derived): protein, fat, carbs, kcal, kJ (scaled to period), plus selected vitamins/minerals as daily norms.
- Nutrient maximums: kcal, kJ, carbs, fat (fat upper set to 30% energy), protein (upper bandwidth), all scaled.
- Variety caps: per-product ≤ 300 g/day and ≤ 1000 g/week.
- Allergen filtering: lactose/milk/gluten/eggs/soy/nuts/sesame/sulfites/fish (normalized matching).
- Lifestyle/health guidance (WHO/AHA):
  - Free sugar (product `Cukurs`) ≤ 50 g/day; or 0 if `no_added_sugar=true`.
  - Oils ≤ 30 g/day.
  - Vegetables ≥ 400 g/day; fruits ≥ 200 g/day; legumes ≥ 600 g/week.
  - Refined grains ≤ 200 g/day; whole grains ≥ refined grains.
  - Red meat ≤ 500 g/week; processed meat = 0.
  - Fish ≥ ~300 g/week; animal protein presence (meat/poultry/fish) ≥ 300 g/week unless vegetarian.
- Vegetarian option: removes meat/fish/offal/processed meat from the domain.

### Categorization
- Product names are normalized (lowercased, diacritics removed) and matched with keyword lists to build categories (oils, grains, legumes, vegetables, fruits, offal, red meat, fish, poultry, sweets, etc.).

### ChatGPT Integration
- `generate_meal_plan_with_chatgpt()` reads `OPENAI_API_KEY`, posts a structured prompt with the optimized diet, returns the generated plan.

### Config Notes
- Port: 5001, debug on.
- Environment: `.env` for `OPENAI_API_KEY`.

### Extending
- Add nutrients or constraints: extend `nut_keys`, update norms/upper-bounds, add model constraints.
- Add categories: extend keyword lists in the categorization block.
- Add allergens: extend `allergen_map` in `optimize_diet()`.


