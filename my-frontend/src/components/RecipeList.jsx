import React, { useEffect, useState } from "react";

export default function RecipeList({ allergens=[], dislikes=[] }) {
  const [items, setItems] = useState([]);

  useEffect(()=>{
    const q = new URLSearchParams({
      allergens: allergens.join(","),
      dislikes: dislikes.join(",")
    }).toString();
    fetch("http://localhost:5000/api/recipes?"+q)
      .then(r=>r.json()).then(setItems);
  }, [allergens, dislikes]);

  return (
    <div className="card">
      <h2>Рецепты</h2>
      {items.length===0 && <p className="muted">Ничего не найдено под ограничения.</p>}
      <ul className="recipes">
        {items.map(r=>(
          <li key={r.id}>
            <b>{r.title}</b>
            <div className="muted">Ингредиенты: {r.ingredients}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
