import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductList from "../components/ProductList";
import RecipeList from "../components/RecipeList";
import Charts from "../components/Charts";
import { useLanguage } from "../contexts/LanguageContext";
import "./ResultsPage.css";

export default function ResultsPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ allergens: [], dislikes: [] });
  const [diet, setDiet] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load data from localStorage or location state
  useEffect(() => {
    // Check if diet was passed via navigation state
    if (location.state && location.state.diet) {
      setDiet(location.state.diet);
      if (location.state.mealPlan) {
        setMealPlan(location.state.mealPlan);
      }
      setLoading(false);
      return;
    }

    // Otherwise load from localStorage
    const savedDiet = localStorage.getItem("current_diet");
    const savedMealPlan = localStorage.getItem("current_meal_plan");
    const raw = localStorage.getItem("demo_profile");
    
    if (savedDiet) {
      try {
        setDiet(JSON.parse(savedDiet));
      } catch (e) {
        console.error("Error loading diet:", e);
      }
    }
    
    if (savedMealPlan) {
      try {
        setMealPlan(JSON.parse(savedMealPlan));
      } catch (e) {
        console.error("Error loading meal plan:", e);
      }
    }
    
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
    
    setLoading(false);
  }, [location.state]);

  if (loading) {
    return (
      <div className="results-page">
        <div className="page-header">
          <h1>{t("results.title")}</h1>
          <p>{t("results.subtitle")}</p>
        </div>
        <div className="page-content">
          <div className="loading">{t("history.loading") || "Loading..."}</div>
        </div>
      </div>
    );
  }

  if (!diet) {
    return (
      <div className="results-page">
        <div className="page-header">
          <h1>{t("results.title")}</h1>
          <p>{t("results.subtitle")}</p>
        </div>
        <div className="page-content">
          <div className="card" style={{ textAlign: "center", padding: "40px" }}>
            <p>{t("productList.empty") || "No diet data available."}</p>
            <button 
              className="primary" 
              onClick={() => navigate("/calculator")}
              style={{ marginTop: "16px" }}
            >
              {t("navigation.calculator") || "Go to Calculator"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="page-header">
        <h1>{t("results.title")}</h1>
        <p>{t("results.subtitle")}</p>
      </div>
      <div className="page-content">
        <div className="results-grid">
          <div className="results-section">
            <ProductList diet={diet} />
          </div>
          {mealPlan && mealPlan.meal_plan && (
            <div className="results-section">
              <div className="card">
                <h3>{t("form.mealPlan") || "Meal Plan"}</h3>
                <div 
                  style={{ 
                    whiteSpace: "pre-wrap", 
                    lineHeight: "1.6",
                    padding: "12px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px",
                    maxHeight: "500px",
                    overflowY: "auto"
                  }}
                >
                  {mealPlan.meal_plan}
                </div>
              </div>
            </div>
          )}
          <div className="results-section">
            <RecipeList
              allergens={profile.allergens || []}
              dislikes={profile.dislikes || []}
            />
          </div>
          <div className="results-section full-width">
            <Charts diet={diet} />
          </div>
        </div>
      </div>
    </div>
  );
}

