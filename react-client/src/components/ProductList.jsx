import React, { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./ProductList.css";


export default function productList({ diet: dietProp }) {
  const { t } = useLanguage();
  const [diet, setDiet] = useState(dietProp);
  
  // Load from localStorage if no prop provided
  useEffect(() => {
    if (dietProp) {
      setDiet(dietProp);
      return;
    }
    
    const savedDiet = localStorage.getItem("current_diet");
    if (savedDiet) {
      try {
        setDiet(JSON.parse(savedDiet));
      } catch (e) {
        console.error("Error loading diet:", e);
      }
    }
  }, [dietProp]);
  
  if (!diet) {
    return (
      <div className="card product-list" style={{ marginTop: 12 }}>
        <div className="muted">{t("productList.empty") || "No diet data available. Please calculate a diet first."}</div>
      </div>
    );
  }

  const hasItems = Array.isArray(diet.items) && diet.items.length > 0;
  const entries = hasItems ? diet.items : Object.entries(diet.diet || {}).map(([name, grams]) => ({ name, grams }));

  return (
    <div className="card product-list" style={{ marginTop: 12 }}>
      <h3>
        {t("productList.suggestedDiet")} ({diet.period === "week" ? t("productList.gPerDayWeek") : t("productList.gPerDay")})
      </h3>

      {entries.length === 0 ? (
        <div className="muted">{t("productList.empty")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("productList.product")}</th>
                <th>{t("productList.grams")}</th>
                <th>{t("productList.kcalPerDay")}</th>
                <th>{t("productList.protein")}</th>
                <th>{t("productList.fat")}</th>
                <th>{t("productList.carbs")}</th>
                <th>{t("productList.cost")}</th>
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
        {t("productList.totalCost")}: <b>{diet.total_cost}</b>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        {t("productList.solutionStatus")}: {diet.status}
      </div>

      {diet.nutrient_totals && diet.norms && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>{t("productList.nutrientSummary")}</h4>
          <div className="grid2">
            <div>
              <div>{t("productList.kcalTarget")}: {diet.nutrient_totals.kcal} / {t("productList.target")} {diet.norms.kcal}</div>
              <div>{t("productList.protein")}: {diet.nutrient_totals.protein} g / ≥ {diet.norms.protein} g</div>
              <div>{t("productList.fat")}: {diet.nutrient_totals.fat} g / ≥ {diet.norms.fat} g</div>
              <div>{t("productList.carbs")}: {diet.nutrient_totals.carbs} g / ≥ {diet.norms.carbs} g</div>
            </div>
            <div className="muted">
              {t("productList.period")}: {diet.period === "week" ? t("form.week") : t("form.day")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
