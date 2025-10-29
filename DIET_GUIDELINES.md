## Diet Guidelines and Constraints Used

This service optimizes a weekly diet (default) while enforcing public-health and nutrition guidance. Amounts are in grams for the whole period (week by default).

### Energy and Macronutrients (EFSA-based)
- Protein: ≥ 0.83 g/kg/day (scaled to period)
- Fat: 20–35% of energy (scaled to period)
- Carbs: 45–60% of energy (scaled to period)
- Calories: around EER, with +10% upper cap (scaled)
- kJ scaled accordingly

Vitamins and minerals currently modeled as daily norms, not scaled (A, B1, B2, PP, C, Ca, P, Fe).

### Variety and Per-product Caps
- Max per product: ≤ 300 g/day and ≤ 1000 g/week

### WHO and Other Public-Health Guidance
- Free sugar: ≤ 50 g/day (applied to product `Cukurs`)
- Oils: ≤ 30 g/day (sum of edible oils)
- Vegetables: ≥ 400 g/day
- Fruits: ≥ 200 g/day
- Legumes: ≥ 600 g/week
- Refined grains: ≤ 200 g/day
- Whole grains ≥ refined grains (by mass)
- Red meat: ≤ 500 g/week
- Processed meat: 0 (none)
- Sweets (chocolate/candies/cookies/cocoa): ≤ 100 g/day
- Fish (AHA guidance): ≥ ~300–450 g/week (enforced as ≥ 300 g/week)
- Animal protein presence (unless vegetarian): ≥ 300 g/week from meat/poultry/fish combined

### Vegetarian Option
To request a vegetarian diet, set one of the following in the POST body:
```json
{ "diet_type": "vegetarian" }
```
or
```json
{ "vegetarian": true }
```
This excludes meat, fish, offal, and processed meat from the optimization.

### Allergen Handling
- Current implementation excludes lactose-containing items when `allergens` includes `"lactose"`.
- Additional allergens can be added similarly.

### Product Categorization (Keyword Matching)
The optimizer categorizes products by matching normalized (lowercased, diacritics-removed) names with keyword sets:
- Oils: `ella`
- Refined grains: `makaroni`, `mannas`, `milti`, `maize`
- Whole grains: `griki`, `auzu`, `rudzu`, `miezu`, `putraimi`, `risi`, `grubas`
- Legumes: `zirn`, `pupi`, `lec`, `soja`
- Vegetables: `tomat`, `gurk`, `burkan`, `biet`, `kapost`, `spinat`, `salat`, `redis`, `kirb`, `kartupel`, `kabac`, `pipar`, `sipol`, `purav`, `skaben`
- Fruits: `abol`, `apelsin`, `banan`, `vinog`, `upen`, `aven`, `zemen`, `mandarin`, `bumbier`, `plum`, `citron`, `dzerven`, `bruklen`, `aprikoz`, `persik`, `kirs`
- Offal: `aknas`, `smadzenes`
- Red meat: `liellopu`, `cuka`, `tela`, `aita`, `jera`, `cukas`
- Processed meat: `desa`, `skink`, `cisin`, `zavet`
- Fish: `ziv`, `silk`, `sprot`, `lasis`, `zandarts`, `menca`, `lidaka`, `karpa`, `kaviar`, `kilav`
- Poultry: `vistas`, `vista`, `titara`, `piles`, `zoss`
- Sweets: `sokolade`, `konfekt`, `marmelad`, `cepumi`, `kakao`, `karamel`

allergens = lactose, milk, gluten, eggs, soy, nuts, sesame, sulfites, fish.


