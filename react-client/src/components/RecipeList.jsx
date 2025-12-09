import React, { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./RecipeList.css";

export default function RecipeList({ allergens = [], dislikes = [] }) {
  const { language, t } = useLanguage();
  const [items, setItems] = useState([]);

  // Recipe database with ingredients and amounts in grams
  useEffect(() => {
    const allRecipes = language === "lv" ? [
      // Завтрак (Brokastis)
      {
        id: 1,
        title: "Auzu putra ar banānu un medu",
        category: "brokastis",
        time: "15 min",
        ingredients: [
          { name: "auzu pārslas", amount: 50 },
          { name: "banāns", amount: 100 },
          { name: "piens", amount: 200 }
        ]
      },
      {
        id: 5,
        title: "Siera omlete",
        category: "brokastis",
        time: "10 min",
        ingredients: [
          { name: "ola", amount: 2 },
          { name: "siers", amount: 50 },
          { name: "piens", amount: 50 }
        ]
      },
      {
        id: 8,
        title: "Rudzu maize ar avokado",
        category: "brokastis",
        time: "5 min",
        ingredients: [
          { name: "rudzu maize", amount: 60 },
          { name: "avokado", amount: 100 },
          { name: "tomāti", amount: 50 }
        ]
      },
      {
        id: 11,
        title: "Olu un dārzeņu omlete",
        category: "brokastis",
        time: "12 min",
        ingredients: [
          { name: "ola", amount: 2 },
          { name: "tomāti", amount: 100 },
          { name: "pipari", amount: 50 },
          { name: "sīpoli", amount: 30 }
        ]
      },
      {
        id: 17,
        title: "Auzu pankūkas",
        category: "brokastis",
        time: "20 min",
        ingredients: [
          { name: "auzu pārslas", amount: 100 },
          { name: "ola", amount: 1 },
          { name: "piens", amount: 150 },
          { name: "banāns", amount: 80 }
        ]
      },
      {
        id: 20,
        title: "Kviešu putra ar augļiem",
        category: "brokastis",
        time: "15 min",
        ingredients: [
          { name: "kviešu pārslas", amount: 60 },
          { name: "āboli", amount: 100 },
          { name: "banāns", amount: 80 },
          { name: "piens", amount: 200 }
        ]
      },
      // Обед (Pusdienas)
      {
        id: 2,
        title: "Vistas un olu salāti",
        category: "pusdienas",
        time: "25 min",
        ingredients: [
          { name: "vista", amount: 150 },
          { name: "ola", amount: 2 },
          { name: "majonēze", amount: 30 },
          { name: "salāti", amount: 100 }
        ]
      },
      {
        id: 4,
        title: "Griķi ar dārzeņiem",
        category: "pusdienas",
        time: "30 min",
        ingredients: [
          { name: "griķi", amount: 100 },
          { name: "burkāni", amount: 100 },
          { name: "sīpoli", amount: 50 },
          { name: "pipari", amount: 100 }
        ]
      },
      {
        id: 7,
        title: "Dārzeņu zupa",
        category: "pusdienas",
        time: "35 min",
        ingredients: [
          { name: "burkāni", amount: 150 },
          { name: "kartupeļi", amount: 200 },
          { name: "sīpoli", amount: 50 },
          { name: "tomāti", amount: 150 }
        ]
      },
      {
        id: 10,
        title: "Griķu salāti ar dārzeņiem",
        category: "pusdienas",
        time: "20 min",
        ingredients: [
          { name: "griķi", amount: 100 },
          { name: "tomāti", amount: 150 },
          { name: "gurķi", amount: 100 },
          { name: "sīpoli", amount: 30 }
        ]
      },
      {
        id: 12,
        title: "Zirņu zupa",
        category: "pusdienas",
        time: "50 min",
        ingredients: [
          { name: "zirņi", amount: 150 },
          { name: "sīpoli", amount: 50 },
          { name: "burkāni", amount: 100 },
          { name: "kartupeļi", amount: 150 }
        ]
      },
      {
        id: 13,
        title: "Rīsi ar dārzeņiem",
        category: "pusdienas",
        time: "30 min",
        ingredients: [
          { name: "rīsi", amount: 100 },
          { name: "burkāni", amount: 100 },
          { name: "sīpoli", amount: 50 },
          { name: "pipari", amount: 100 }
        ]
      },
      {
        id: 18,
        title: "Zivju salāti",
        category: "pusdienas",
        time: "15 min",
        ingredients: [
          { name: "zivs", amount: 150 },
          { name: "tomāti", amount: 100 },
          { name: "gurķi", amount: 80 },
          { name: "sīpoli", amount: 30 }
        ]
      },
      // Ужин (Vakariņas)
      {
        id: 6,
        title: "Zivju kotletes ar kartupeļiem",
        category: "vakariņas",
        time: "40 min",
        ingredients: [
          { name: "zivs", amount: 200 },
          { name: "kartupeļi", amount: 300 },
          { name: "sīpoli", amount: 50 },
          { name: "ola", amount: 1 }
        ]
      },
      {
        id: 9,
        title: "Vistas biskvīts ar dārzeņiem",
        category: "vakariņas",
        time: "45 min",
        ingredients: [
          { name: "vista", amount: 200 },
          { name: "brokoļi", amount: 150 },
          { name: "burkāni", amount: 100 },
          { name: "pipari", amount: 100 }
        ]
      },
      {
        id: 15,
        title: "Vistas kotletes ar dārzeņiem",
        category: "vakariņas",
        time: "50 min",
        ingredients: [
          { name: "vista", amount: 200 },
          { name: "kartupeļi", amount: 250 },
          { name: "burkāni", amount: 100 },
          { name: "sīpoli", amount: 50 }
        ]
      },
      {
        id: 16,
        title: "Tofu ar dārzeņiem",
        category: "vakariņas",
        time: "25 min",
        ingredients: [
          { name: "tofu", amount: 200 },
          { name: "brokoļi", amount: 150 },
          { name: "pipari", amount: 100 },
          { name: "sīpoli", amount: 50 }
        ]
      },
      {
        id: 19,
        title: "Dārzeņu wok",
        category: "vakariņas",
        time: "20 min",
        ingredients: [
          { name: "brokoļi", amount: 150 },
          { name: "pipari", amount: 150 },
          { name: "burkāni", amount: 100 },
          { name: "sīpoli", amount: 50 }
        ]
      },
      // Перекус (Uzkodas)
      {
        id: 3,
        title: "Smuks ar riekstiem un medu",
        category: "uzkodas",
        time: "5 min",
        ingredients: [
          { name: "piens", amount: 200 },
          { name: "banāns", amount: 100 },
          { name: "rieksti", amount: 30 }
        ]
      },
      {
        id: 14,
        title: "Augļu salāti ar jogurtu",
        category: "uzkodas",
        time: "10 min",
        ingredients: [
          { name: "āboli", amount: 100 },
          { name: "banāns", amount: 100 },
          { name: "ogas", amount: 50 },
          { name: "jogurts", amount: 150 }
        ]
      }
    ] : [
      // Breakfast
      {
        id: 1,
        title: "Oatmeal with Banana and Honey",
        category: "breakfast",
        time: "15 min",
        ingredients: [
          { name: "oats", amount: 50 },
          { name: "banana", amount: 100 },
          { name: "milk", amount: 200 }
        ]
      },
      {
        id: 5,
        title: "Cheese Omelette",
        category: "breakfast",
        time: "10 min",
        ingredients: [
          { name: "egg", amount: 2 },
          { name: "cheese", amount: 50 },
          { name: "milk", amount: 50 }
        ]
      },
      {
        id: 8,
        title: "Rye Bread with Avocado",
        category: "breakfast",
        time: "5 min",
        ingredients: [
          { name: "rye bread", amount: 60 },
          { name: "avocado", amount: 100 },
          { name: "tomatoes", amount: 50 }
        ]
      },
      {
        id: 11,
        title: "Egg and Vegetable Omelette",
        category: "breakfast",
        time: "12 min",
        ingredients: [
          { name: "egg", amount: 2 },
          { name: "tomatoes", amount: 100 },
          { name: "pepper", amount: 50 },
          { name: "onion", amount: 30 }
        ]
      },
      {
        id: 17,
        title: "Oat Pancakes",
        category: "breakfast",
        time: "20 min",
        ingredients: [
          { name: "oats", amount: 100 },
          { name: "egg", amount: 1 },
          { name: "milk", amount: 150 },
          { name: "banana", amount: 80 }
        ]
      },
      {
        id: 20,
        title: "Wheat Porridge with Fruits",
        category: "breakfast",
        time: "15 min",
        ingredients: [
          { name: "wheat flakes", amount: 60 },
          { name: "apples", amount: 100 },
          { name: "banana", amount: 80 },
          { name: "milk", amount: 200 }
        ]
      },
      // Lunch
      {
        id: 2,
        title: "Chicken and Egg Salad",
        category: "lunch",
        time: "25 min",
        ingredients: [
          { name: "chicken", amount: 150 },
          { name: "egg", amount: 2 },
          { name: "mayonnaise", amount: 30 },
          { name: "lettuce", amount: 100 }
        ]
      },
      {
        id: 4,
        title: "Buckwheat with Vegetables",
        category: "lunch",
        time: "30 min",
        ingredients: [
          { name: "buckwheat", amount: 100 },
          { name: "carrot", amount: 100 },
          { name: "onion", amount: 50 },
          { name: "pepper", amount: 100 }
        ]
      },
      {
        id: 7,
        title: "Vegetable Soup",
        category: "lunch",
        time: "35 min",
        ingredients: [
          { name: "carrot", amount: 150 },
          { name: "potatoes", amount: 200 },
          { name: "onion", amount: 50 },
          { name: "tomatoes", amount: 150 }
        ]
      },
      {
        id: 10,
        title: "Buckwheat Salad with Vegetables",
        category: "lunch",
        time: "20 min",
        ingredients: [
          { name: "buckwheat", amount: 100 },
          { name: "tomatoes", amount: 150 },
          { name: "cucumber", amount: 100 },
          { name: "onion", amount: 30 }
        ]
      },
      {
        id: 12,
        title: "Pea Soup",
        category: "lunch",
        time: "50 min",
        ingredients: [
          { name: "peas", amount: 150 },
          { name: "onion", amount: 50 },
          { name: "carrot", amount: 100 },
          { name: "potatoes", amount: 150 }
        ]
      },
      {
        id: 13,
        title: "Rice with Vegetables",
        category: "lunch",
        time: "30 min",
        ingredients: [
          { name: "rice", amount: 100 },
          { name: "carrot", amount: 100 },
          { name: "onion", amount: 50 },
          { name: "pepper", amount: 100 }
        ]
      },
      {
        id: 18,
        title: "Fish Salad",
        category: "lunch",
        time: "15 min",
        ingredients: [
          { name: "fish", amount: 150 },
          { name: "tomatoes", amount: 100 },
          { name: "cucumber", amount: 80 },
          { name: "onion", amount: 30 }
        ]
      },
      // Dinner
      {
        id: 6,
        title: "Fish Cutlets with Potatoes",
        category: "dinner",
        time: "40 min",
        ingredients: [
          { name: "fish", amount: 200 },
          { name: "potatoes", amount: 300 },
          { name: "onion", amount: 50 },
          { name: "egg", amount: 1 }
        ]
      },
      {
        id: 9,
        title: "Chicken Breast with Vegetables",
        category: "dinner",
        time: "45 min",
        ingredients: [
          { name: "chicken", amount: 200 },
          { name: "broccoli", amount: 150 },
          { name: "carrot", amount: 100 },
          { name: "pepper", amount: 100 }
        ]
      },
      {
        id: 15,
        title: "Chicken Cutlets with Vegetables",
        category: "dinner",
        time: "50 min",
        ingredients: [
          { name: "chicken", amount: 200 },
          { name: "potatoes", amount: 250 },
          { name: "carrot", amount: 100 },
          { name: "onion", amount: 50 }
        ]
      },
      {
        id: 16,
        title: "Tofu with Vegetables",
        category: "dinner",
        time: "25 min",
        ingredients: [
          { name: "tofu", amount: 200 },
          { name: "broccoli", amount: 150 },
          { name: "pepper", amount: 100 },
          { name: "onion", amount: 50 }
        ]
      },
      {
        id: 19,
        title: "Vegetable Wok",
        category: "dinner",
        time: "20 min",
        ingredients: [
          { name: "broccoli", amount: 150 },
          { name: "pepper", amount: 150 },
          { name: "carrot", amount: 100 },
          { name: "onion", amount: 50 }
        ]
      },
      // Snacks
      {
        id: 3,
        title: "Smoothie with Nuts and Honey",
        category: "snacks",
        time: "5 min",
        ingredients: [
          { name: "milk", amount: 200 },
          { name: "banana", amount: 100 },
          { name: "nuts", amount: 30 }
        ]
      },
      {
        id: 14,
        title: "Fruit Salad with Yogurt",
        category: "snacks",
        time: "10 min",
        ingredients: [
          { name: "apples", amount: 100 },
          { name: "banana", amount: 100 },
          { name: "berries", amount: 50 },
          { name: "yogurt", amount: 150 }
        ]
      }
    ];

    const filtered = allRecipes.filter((r) => {
      const lowerIngredients = r.ingredients.map((i) => i.name.toLowerCase());

      const hasAllergen = allergens.some((a) =>
        lowerIngredients.includes(a.toLowerCase())
      );
      const hasDislike = dislikes.some((d) =>
        lowerIngredients.includes(d.toLowerCase())
      );

      return !hasAllergen && !hasDislike;
    });

    // Group recipes by category
    const grouped = filtered.reduce((acc, recipe) => {
      const cat = recipe.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(recipe);
      return acc;
    }, {});

    setItems(grouped);
  }, [allergens, dislikes, language]);

  const categoryLabels = language === "lv" ? {
    brokastis: t("recipes.breakfast") || "Brokastis",
    pusdienas: t("recipes.lunch") || "Pusdienas",
    vakariņas: t("recipes.dinner") || "Vakariņas",
    uzkodas: t("recipes.snack") || "Uzkodas"
  } : {
    breakfast: t("recipes.breakfast") || "Breakfast",
    lunch: t("recipes.lunch") || "Lunch",
    dinner: t("recipes.dinner") || "Dinner",
    snacks: t("recipes.snack") || "Snacks"
  };

  const categoryOrder = language === "lv" 
    ? ["brokastis", "pusdienas", "vakariņas", "uzkodas"]
    : ["breakfast", "lunch", "dinner", "snacks"];

  return (
    <div className="recipe-list-container">
      <div className="recipe-list-header">
        <h2>{t("recipes.title") || "Recipes"}</h2>
        <span className="recipe-count">
          {Object.values(items).reduce((sum, arr) => sum + arr.length, 0)} {t("recipes.recipes") || "recipes"}
        </span>
      </div>
      
      {Object.keys(items).length === 0 ? (
        <div className="recipe-empty">
          <p className="muted">{t("recipes.nothingFound") || "No recipes found matching your preferences."}</p>
        </div>
      ) : (
        <div className="recipe-categories">
          {categoryOrder.map((category) => {
            if (!items[category] || items[category].length === 0) return null;
            
            return (
              <div key={category} className="recipe-category-section">
                <h3 className="category-title">{categoryLabels[category]}</h3>
                <div className="recipe-grid">
                  {items[category].map((r) => (
                    <div key={r.id} className="recipe-card">
                      <div className="recipe-content">
                        <h3 className="recipe-title">{r.title}</h3>
                        <div className="recipe-time">{t("recipes.time") || "Time"}: {r.time}</div>
                        <div className="recipe-ingredients">
                          <span className="ingredients-label">{t("recipes.ingredients") || "Ingredients"}:</span>
                          <ul className="ingredients-list">
                            {r.ingredients.map((ing, idx) => (
                              <li key={idx} className="ingredient-item">
                                <span className="ingredient-name">{ing.name}</span>
                                <span className="ingredient-amount">{ing.amount}g</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
