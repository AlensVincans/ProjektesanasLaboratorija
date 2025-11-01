import React from "react";
import "./ProductList.css";

export default function ProductList({ diet }) {
  if (!diet) return null;

  const hasItems = Array.isArray(diet.items) && diet.items.length > 0;
  const entries = hasItems ? diet.items : Object.entries(diet.diet || {}).map(([name, grams]) => ({ name, grams }));

  return (
    <div className="card product-list" style={{ marginTop: 12 }}>
      <h3>
        Предложенный рацион ({diet.period === "week" ? "г/день на неделю" : "г/день"})
      </h3>

      {entries.length === 0 ? (
        <div className="muted">Рацион пуст — попробуй изменить параметры.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Продукт</th>
                <th>Граммы</th>
                <th>Ккал/день</th>
                <th>Белки</th>
                <th>Жиры</th>
                <th>Углеводы</th>
                <th>Стоимость, €</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td><b>{r.grams}</b></td>
                  <td>{r.kcal ?? "—"}</td>
                  <td>{r.protein ?? "—"}</td>
                  <td>{r.fat ?? "—"}</td>
                  <td>{r.carbs ?? "—"}</td>
                  <td>{r.cost ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        Итоговая стоимость: <b>{diet.total_cost}</b>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        Статус решения: {diet.status}
      </div>

      {diet.nutrient_totals && diet.norms && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>Итоги по нутриентам</h4>
          <div className="grid2">
            <div>
              <div>Ккал: {diet.nutrient_totals.kcal} / норма {diet.norms.kcal}</div>
              <div>Белки: {diet.nutrient_totals.protein} г / ≥ {diet.norms.protein} г</div>
              <div>Жиры: {diet.nutrient_totals.fat} г / ≥ {diet.norms.fat} г</div>
              <div>Углеводы: {diet.nutrient_totals.carbs} г / ≥ {diet.norms.carbs} г</div>
            </div>
            <div className="muted">
              Период: {diet.period === "week" ? "неделя" : "день"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


