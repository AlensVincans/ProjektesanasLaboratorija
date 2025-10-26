import React, { useEffect, useState } from "react";

export default function RecipeList({ allergens = [], dislikes = [] }) {
  const [items, setItems] = useState([]);

  // Имитация базы рецептов
  const allRecipes = [
    {
      id: 1,
      title: "Овсяная каша с бананом",
      ingredients: ["овсянка", "банан", "молоко"],
    },
    {
      id: 2,
      title: "Салат с курицей и яйцом",
      ingredients: ["курица", "яйцо", "майонез", "салат"],
    },
    {
      id: 3,
      title: "Смузи с орехами",
      ingredients: ["молоко", "банан", "орехи"],
    },
    {
      id: 4,
      title: "Гречка с овощами",
      ingredients: ["гречка", "морковь", "лук", "перец"],
    },
    {
      id: 5,
      title: "Омлет с сыром",
      ingredients: ["яйцо", "сыр", "молоко"],
    },
  ];

  // Фильтрация без fetch
  useEffect(() => {
    const filtered = allRecipes.filter((r) => {
      const lowerIngredients = r.ingredients.map((i) => i.toLowerCase());

      // Проверяем, нет ли аллергенов или нелюбимых ингредиентов
      const hasAllergen = allergens.some((a) =>
        lowerIngredients.includes(a.toLowerCase())
      );
      const hasDislike = dislikes.some((d) =>
        lowerIngredients.includes(d.toLowerCase())
      );

      return !hasAllergen && !hasDislike;
    });

    // имитируем задержку "загрузки"
    setTimeout(() => setItems(filtered), 300);
  }, [allergens, dislikes]);

  return (
    <div className="card">
      <h2>Рецепты</h2>
      {items.length === 0 && (
        <p className="muted">Ничего не найдено под ограничения.</p>
      )}
      <ul className="recipes">
        {items.map((r) => (
          <li key={r.id}>
            <b>{r.title}</b>
            <div className="muted">
              Ингредиенты: {r.ingredients.join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
