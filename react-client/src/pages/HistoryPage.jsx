import React, { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./HistoryPage.css";

export default function HistoryPage() {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/history", {
        credentials: "include",
      });

      if (response.status === 401) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setHistory(data.history || []);
        setLoggedIn(data.logged_in || false);
      }
    } catch (err) {
      setError(t("history.error") || "Failed to load history");
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCalculation = async (id) => {
    if (!window.confirm(t("history.confirmDelete") || "Delete this calculation?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/history/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setHistory(history.filter((item) => item.id !== id));
        if (selectedCalculation && selectedCalculation.id === id) {
          setSelectedCalculation(null);
        }
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      alert("Error deleting calculation");
      console.error("Error deleting calculation:", err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="history-page">
        <div className="loading">{t("history.loading") || "Loading..."}</div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="history-page">
        <div className="page-header">
          <h1>{t("history.title") || "Calculation History"}</h1>
        </div>
        <div className="not-logged-in">
          <p>{t("history.notLoggedIn") || "Please log in to view your calculation history."}</p>
          <a href="http://localhost:5000/login" className="login-btn">
            {t("navigation.login") || "Login with Google"}
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-page">
        <div className="page-header">
          <h1>{t("history.title") || "Calculation History"}</h1>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>{t("history.title") || "Calculation History"}</h1>
        <p>{t("history.subtitle") || "View your previous calculations"}</p>
      </div>

      {history.length === 0 ? (
        <div className="no-history">
          <p>{t("history.noHistory") || "No calculations yet. Start by creating a new calculation!"}</p>
        </div>
      ) : (
        <>
        <div className="history-content">
            {history.map((item) => (
              <div
                key={item.id}
                className={`history-item ${selectedCalculation?.id === item.id ? "selected" : ""}`}
                onClick={() => setSelectedCalculation(item)}
              >
                <div className="history-item-header">
                  <span className="history-date">{formatDate(item.created_at)}</span>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCalculation(item.id);
                    }}
                    title={t("history.delete") || "Delete"}
                  >
                    ×
                  </button>
                </div>
                <div className="history-item-info">
                  <span>
                    {item.gender === "male" ? t("form.male") || "Male" : t("form.female") || "Female"} - {item.weight}kg, {item.height}cm, {item.age} {t("history.years") || "y"}
                  </span>
                  <span className="period-badge">{item.period === "week" ? t("form.week") || "Week" : t("form.day") || "Day"}</span>
                </div>
                <div className="history-item-summary">
                  <div className="summary-item">
                    <strong>{t("history.cost") || "Cost"}:</strong> €{item.total_cost?.toFixed(2) || "0.00"}
                  </div>
                  <div className="summary-item">
                    <strong>{t("history.kcal") || "kcal"}:</strong> {item.total_kcal?.toFixed(0) || "0"}
                  </div>
                </div>
              </div>
            ))}

          {selectedCalculation && (
            <div className="calculation-details">
              <h2>{t("history.details") || "Calculation Details"}</h2>
              
              <div className="details-section">
                <h3>{t("history.parameters") || "Parameters"}</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">{t("form.gender") || "Gender"}:</span>
                    <span className="detail-value">{selectedCalculation.gender === "male" ? t("form.male") || "Male" : t("form.female") || "Female"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t("form.weight") || "Weight"}:</span>
                    <span className="detail-value">{selectedCalculation.weight} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t("form.height") || "Height"}:</span>
                    <span className="detail-value">{selectedCalculation.height} cm</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t("form.age") || "Age"}:</span>
                    <span className="detail-value">{selectedCalculation.age}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t("form.physicalActivity") || "Activity"}:</span>
                    <span className="detail-value">{selectedCalculation.activity}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t("form.period") || "Period"}:</span>
                    <span className="detail-value">{selectedCalculation.period}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>{t("history.nutrition") || "Nutrition Summary"}</h3>
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-label">{t("history.kcal") || "Energy"}:</span>
                    <span className="nutrition-value">{selectedCalculation.total_kcal?.toFixed(0) || "0"} kcal</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">{t("productList.protein") || "Protein"}:</span>
                    <span className="nutrition-value">{selectedCalculation.total_protein?.toFixed(1) || "0"} g</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">{t("productList.fat") || "Fat"}:</span>
                    <span className="nutrition-value">{selectedCalculation.total_fat?.toFixed(1) || "0"} g</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">{t("productList.carbs") || "Carbs"}:</span>
                    <span className="nutrition-value">{selectedCalculation.total_carbs?.toFixed(1) || "0"} g</span>
                  </div>
                  <div className="nutrition-item highlight">
                    <span className="nutrition-label">{t("history.totalCost") || "Total Cost"}:</span>
                    <span className="nutrition-value">€{selectedCalculation.total_cost?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>{t("history.dietPlan") || "Diet Plan"}</h3>
                <div className="diet-list">
                  {Object.entries(selectedCalculation.diet || {}).map(([product, grams]) => (
                    <div key={product} className="diet-item">
                      <span className="product-name">{product}</span>
                      <span className="product-amount">{grams.toFixed(0)}g</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
