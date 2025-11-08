import React, { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function RecipeList({ allergens = [], dislikes = [] }) {
  const { language, t } = useLanguage();
  const [items, setItems] = useState([]);

  // Filtering without fetch
  useEffect(() => {
    // Mock recipe database - recreate based on language
    const allRecipes = language === "lv" ? [
      {
        id: 1,
        title: "Auzu putra ar banānu",
        ingredients: ["auzu pārslas", "banāns", "piens"],
      },
      {
        id: 2,
        title: "Vistas un olu salāti",
        ingredients: ["vista", "ola", "majonēze", "salāti"],
      },
      {
        id: 3,
        title: "Smuks ar riekstiem",
        ingredients: ["piens", "banāns", "rieksti"],
      },
      {
        id: 4,
        title: "Griķi ar dārzeņiem",
        ingredients: ["griķi", "burkāni", "sīpoli", "pipari"],
      },
      {
        id: 5,
        title: "Siera omlete",
        ingredients: ["ola", "siers", "piens"],
      },
    ] : [
      {
        id: 1,
        title: "Oatmeal with Banana",
        ingredients: ["oats", "banana", "milk"],
      },
      {
        id: 2,
        title: "Chicken and Egg Salad",
        ingredients: ["chicken", "egg", "mayonnaise", "lettuce"],
      },
      {
        id: 3,
        title: "Smoothie with Nuts",
        ingredients: ["milk", "banana", "nuts"],
      },
      {
        id: 4,
        title: "Buckwheat with Vegetables",
        ingredients: ["buckwheat", "carrot", "onion", "pepper"],
      },
      {
        id: 5,
        title: "Cheese Omelette",
        ingredients: ["egg", "cheese", "milk"],
      },
    ];

    const filtered = allRecipes.filter((r) => {
      const lowerIngredients = r.ingredients.map((i) => i.toLowerCase());

      // Check if there are allergens or disliked ingredients
      const hasAllergen = allergens.some((a) =>
        lowerIngredients.includes(a.toLowerCase())
      );
      const hasDislike = dislikes.some((d) =>
        lowerIngredients.includes(d.toLowerCase())
      );

      return !hasAllergen && !hasDislike;
    });

    // Simulate loading delay
    const timer = setTimeout(() => setItems(filtered), 300);
    
    return () => clearTimeout(timer);
  }, [allergens, dislikes, language]);

  return (
    <div className="card">
      <h2>{t("recipes.title")}</h2>
      {items.length === 0 && (
        <p className="muted">{t("recipes.nothingFound")}</p>
      )}
      <ul className="recipes">
        {items.map((r) => (
          <li key={r.id}>
            <b>{r.title}</b>
            <div className="muted">
              {t("recipes.ingredients")}: {r.ingredients.join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
