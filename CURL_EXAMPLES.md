## CURL Examples

All requests assume the server runs at http://localhost:5001

### Basic weekly optimization
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "age": "25",
    "height": "185",
    "weight": "80",
    "activity": "low"
  }' http://localhost:5001/optimize | jq .
```

### Vegetarian option
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "gender": "female",
    "age": "30",
    "height": "170",
    "weight": "60",
    "activity": "moderate",
    "diet_type": "vegetarian"
  }' http://localhost:5001/optimize | jq .
```

### No added sugar
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "age": "35",
    "height": "180",
    "weight": "82",
    "activity": "sedentary",
    "no_added_sugar": true
  }' http://localhost:5001/optimize | jq .
```

### Allergen examples
- Gluten-free:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"gender":"male","age":"25","height":"185","weight":"80","activity":"low","allergens":["gluten"]}' \
  http://localhost:5001/optimize | jq .
```

- Milk/lactose-free:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"gender":"male","age":"25","height":"185","weight":"80","activity":"low","allergens":["milk","lactose"]}' \
  http://localhost:5001/optimize | jq .
```

- Eggs-free:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"gender":"male","age":"25","height":"185","weight":"80","activity":"low","allergens":["eggs"]}' \
  http://localhost:5001/optimize | jq .
```

### Combined example (vegetarian, gluten-free, no sugar)
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "gender":"female",
    "age":"29",
    "height":"168",
    "weight":"58",
    "activity":"low",
    "diet_type":"vegetarian",
    "allergens":["gluten"],
    "no_added_sugar": true
  }' http://localhost:5001/optimize | jq .
```

### Meal-plan generation
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "age": 25,
    "height": 185,
    "weight": 80,
    "activity": "low"
  }' http://localhost:5001/meal-plan | jq .
```


