import React, { useState, useEffect } from "react";
import ProductList from "../components/ProductList";
import RecipeList from "../components/RecipeList";
import Charts from "../components/Charts";
import "./ResultsPage.css";

export default function ResultsPage() {
  const [profile, setProfile] = useState({ allergens: [], dislikes: [] });
  const [diet, setDiet] = useState(null);

  // Загрузка данных из localStorage
  useEffect(() => {
    const raw = localStorage.getItem("demo_profile");
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setProfile({
          allergens: Array.isArray(p.allergens) ? p.allergens : [],
          dislikes: Array.isArray(p.dislikes) ? p.dislikes : [],
        });
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    }
  }, []);

  return (
    <div className="results-page">
      <div className="page-header">
        <h1>Результаты расчета</h1>
        <p>Просмотрите детальную информацию о вашем рационе</p>
      </div>
      <div className="page-content">
        <div className="results-grid">
          <div className="results-section">
            <ProductList />
          </div>
          <div className="results-section">
            <RecipeList
              allergens={profile.allergens || []}
              dislikes={profile.dislikes || []}
            />
          </div>
          <div className="results-section full-width">
            <Charts />
          </div>
        </div>
      </div>
    </div>
  );
}

