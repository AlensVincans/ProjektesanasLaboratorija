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
  const [loading, setLoading] = useState(true);

  // Load data from localStorage or location state
  useEffect(() => {
    // Check if diet was passed via navigation state
    if (location.state && location.state.diet) {
      setDiet(location.state.diet);
      setLoading(false);
      return;
    }

    // Otherwise load from localStorage
    const savedDiet = localStorage.getItem("current_diet");
    const raw = localStorage.getItem("demo_profile");
    
    if (savedDiet) {
      try {
        setDiet(JSON.parse(savedDiet));
      } catch (e) {
        console.error("Error loading diet:", e);
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

