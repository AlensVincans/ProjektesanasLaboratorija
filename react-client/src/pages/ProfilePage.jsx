import React, { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCalculation, setSelectedCalculation] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  const fetchUserData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user info
      const userResp = await fetch("http://localhost:5000/user", {
        credentials: "include",
      });
      const userData = await userResp.json();

      if (!userData.logged_in) {
        window.location.href = "/";
        return;
      }

      setUser(userData.user);

      // Fetch history
      const historyResp = await fetch("http://localhost:5000/history", {
        credentials: "include",
      });
      const historyData = await historyResp.json();
      
      if (historyData.history) {
        setHistory(historyData.history);
        calculateStats(historyData.history);
      }

      // Load favorites from localStorage
      const savedFavorites = localStorage.getItem("favorites");
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const calculateStats = (historyData) => {
    if (!historyData || historyData.length === 0) {
      setStats(null);
      return;
    }

    const totalCalculations = historyData.length;
    const avgCost = historyData.reduce((sum, item) => sum + (item.total_cost || 0), 0) / totalCalculations;
    const avgKcal = historyData.reduce((sum, item) => sum + (item.total_kcal || 0), 0) / totalCalculations;
    const avgProtein = historyData.reduce((sum, item) => sum + (item.total_protein || 0), 0) / totalCalculations;
    
    const weekCalculations = historyData.filter(item => item.period === "week").length;
    const dayCalculations = historyData.filter(item => item.period === "day").length;

    // Find cheapest and most expensive diets
    const sortedByCost = [...historyData].sort((a, b) => a.total_cost - b.total_cost);
    const cheapest = sortedByCost[0];
    const mostExpensive = sortedByCost[sortedByCost.length - 1];

    // Last calculation date
    const lastCalculation = historyData[0]?.created_at;

    setStats({
      totalCalculations,
      avgCost,
      avgKcal,
      avgProtein,
      weekCalculations,
      dayCalculations,
      cheapest,
      mostExpensive,
      lastCalculation,
    });
  };

  const toggleFavorite = (id) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
    localStorage.setItem("favorites", JSON.stringify([...newFavorites]));
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
        const newHistory = history.filter((item) => item.id !== id);
        setHistory(newHistory);
        calculateStats(newHistory);
        if (selectedCalculation && selectedCalculation.id === id) {
          setSelectedCalculation(null);
        }
        // Remove from favorites if it was there
        if (favorites.has(id)) {
          toggleFavorite(id);
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

  const exportHistory = async () => {
    try {
      const response = await fetch("http://localhost:5000/history/export", {
        credentials: "include",
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Create a blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diet-history-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error exporting history");
      console.error("Error exporting history:", err);
    }
  };

  const renderOverview = () => {
    return (
      <div className="profile-overview">
        <div className="profile-card">
          <div className="profile-header">
            <img
              src={user?.picture || user?.avatar_url}
              alt="Profile"
              className="profile-avatar-large"
            />
            <div className="profile-info">
              <h2>{user?.name || user?.login}</h2>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-member-since">
                {t("profile.memberSince") || "Member since"}: {formatDate(user?.created_at || new Date())}
              </p>
            </div>
          </div>
        </div>

        {stats && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon stat-icon-calculations"></div>
                <div className="stat-info">
                  <h3>{stats.totalCalculations}</h3>
                  <p>{t("profile.totalCalculations") || "Total Calculations"}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stat-icon-cost"></div>
                <div className="stat-info">
                  <h3>€{stats.avgCost.toFixed(2)}</h3>
                  <p>{t("profile.avgCost") || "Average Cost"}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stat-icon-calories"></div>
                <div className="stat-info">
                  <h3>{stats.avgKcal.toFixed(0)}</h3>
                  <p>{t("profile.avgKcal") || "Average Calories"}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stat-icon-protein"></div>
                <div className="stat-info">
                  <h3>{stats.avgProtein.toFixed(1)}g</h3>
                  <p>{t("profile.avgProtein") || "Average Protein"}</p>
                </div>
              </div>
            </div>

            <div className="insights-section">
              <h3>{t("profile.insights") || "Insights"}</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <h4>{t("profile.periodPreference") || "Period Preference"}</h4>
                  <div className="insight-chart">
                    <div className="chart-bar">
                      <div
                        className="chart-fill week"
                        style={{
                          width: `${(stats.weekCalculations / stats.totalCalculations) * 100}%`,
                        }}
                      />
                      <span>{stats.weekCalculations} {t("calculator.week") || "Week"}</span>
                    </div>
                    <div className="chart-bar">
                      <div
                        className="chart-fill day"
                        style={{
                          width: `${(stats.dayCalculations / stats.totalCalculations) * 100}%`,
                        }}
                      />
                      <span>{stats.dayCalculations} {t("calculator.day") || "Day"}</span>
                    </div>
                  </div>
                </div>

                <div className="insight-card">
                  <h4>{t("profile.costRange") || "Cost Range"}</h4>
                  <div className="cost-range">
                    <div className="cost-item">
                      <span className="cost-label">{t("profile.cheapest") || "Cheapest"}:</span>
                      <span className="cost-value">€{stats.cheapest?.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">{t("profile.mostExpensive") || "Most Expensive"}:</span>
                      <span className="cost-value">€{stats.mostExpensive?.total_cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!stats && (
          <div className="no-data">
            <p>{t("profile.noCalculations") || "No calculations yet. Start by creating your first diet plan!"}</p>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    const favoriteItems = history.filter((item) => favorites.has(item.id));
    const regularItems = history.filter((item) => !favorites.has(item.id));

    return (
      <div className="profile-history">
        <div className="history-header">
          <button className="export-btn" onClick={exportHistory} title={t("profile.exportHistory") || "Export History"}>
            {t("profile.exportData") || "Export Data"}
          </button>
        </div>

        {favoriteItems.length > 0 && (
          <div className="favorites-section">
            <h3>{t("profile.favorites") || "Favorite Diets"}</h3>
            <div className="history-grid">
              {favoriteItems.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteCalculation}
                  onSelect={setSelectedCalculation}
                  formatDate={formatDate}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        <div className="recent-section">
          <h3>{t("profile.recentCalculations") || "Recent Calculations"}</h3>
          {regularItems.length > 0 ? (
            <div className="history-grid">
              {regularItems.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  isFavorite={false}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteCalculation}
                  onSelect={setSelectedCalculation}
                  formatDate={formatDate}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>{t("history.noHistory") || "No calculations yet."}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading">{t("profile.loading") || "Loading..."}</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header-section">
        <h1>{t("profile.title") || "My Profile"}</h1>
        <p>{t("profile.subtitle") || "Manage your diet calculations and preferences"}</p>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          {t("profile.overview") || "Overview"}
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          {t("profile.history") || "History"}
        </button>
      </div>

      <div className="profile-content">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "history" && renderHistory()}
      </div>

      {selectedCalculation && (
        <CalculationModal
          calculation={selectedCalculation}
          onClose={() => setSelectedCalculation(null)}
          t={t}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

// History Card Component
function HistoryCard({ item, isFavorite, onToggleFavorite, onDelete, onSelect, formatDate, t }) {
  return (
    <div className="history-card" onClick={() => onSelect(item)}>
      <div className="history-card-header">
        <span className="history-card-date">{formatDate(item.created_at)}</span>
        <div className="history-card-actions">
          <button
            className={`favorite-btn ${isFavorite ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            title={isFavorite ? t("profile.removeFromFavorites") : t("profile.addToFavorites")}
          >
            {isFavorite ? "★" : "☆"}
          </button>
          <button
            className="delete-btn-small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            title={t("history.delete")}
          >
            ×
          </button>
        </div>
      </div>
      <div className="history-card-info">
        <span>
          {item.gender === "male" ? t("calculator.male") || "Male" : t("calculator.female") || "Female"} - {item.weight}kg, {item.height}cm, {item.age}{t("history.years") || "y"}
        </span>
        <span className={`period-badge ${item.period}`}>
          {item.period === "week" ? t("calculator.week") || "Week" : t("calculator.day") || "Day"}
        </span>
      </div>
      <div className="history-card-stats">
        <div className="stat">
          <span className="stat-label">{t("results.cost") || "Cost"}</span>
          <span className="stat-value">€{item.total_cost?.toFixed(2) || "0.00"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t("results.kcal") || "Calories"}</span>
          <span className="stat-value">{item.total_kcal?.toFixed(0) || "0"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t("results.protein") || "Protein"}</span>
          <span className="stat-value">{item.total_protein?.toFixed(0) || "0"}g</span>
        </div>
      </div>
    </div>
  );
}

// Calculation Modal Component
function CalculationModal({ calculation, onClose, t, formatDate }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        
        <h2>{t("history.details") || "Calculation Details"}</h2>
        <p className="modal-date">{formatDate(calculation.created_at)}</p>

        <div className="modal-section">
          <h3>{t("history.parameters") || "Parameters"}</h3>
          <div className="modal-grid">
            <div className="modal-item">
              <span className="modal-label">{t("calculator.gender") || "Gender"}:</span>
              <span className="modal-value">
                {calculation.gender === "male" ? t("calculator.male") || "Male" : t("calculator.female") || "Female"}
              </span>
            </div>
            <div className="modal-item">
              <span className="modal-label">{t("calculator.weight") || "Weight"}:</span>
              <span className="modal-value">{calculation.weight} kg</span>
            </div>
            <div className="modal-item">
              <span className="modal-label">{t("calculator.height") || "Height"}:</span>
              <span className="modal-value">{calculation.height} cm</span>
            </div>
            <div className="modal-item">
              <span className="modal-label">{t("calculator.age") || "Age"}:</span>
              <span className="modal-value">{calculation.age}</span>
            </div>
            <div className="modal-item">
              <span className="modal-label">{t("calculator.activity") || "Activity"}:</span>
              <span className="modal-value">{calculation.activity}</span>
            </div>
            <div className="modal-item">
              <span className="modal-label">{t("calculator.period") || "Period"}:</span>
              <span className="modal-value">{calculation.period}</span>
            </div>
          </div>
        </div>

        <div className="modal-section">
          <h3>{t("history.nutrition") || "Nutrition Summary"}</h3>
          <div className="modal-nutrition">
            <div className="nutrition-item-modal">
              <span className="nutrition-icon nutrition-icon-calories"></span>
              <div>
                <div className="nutrition-label">{t("results.kcal") || "Calories"}</div>
                <div className="nutrition-value">{calculation.total_kcal?.toFixed(0) || "0"} kcal</div>
              </div>
            </div>
            <div className="nutrition-item-modal">
              <span className="nutrition-icon nutrition-icon-protein"></span>
              <div>
                <div className="nutrition-label">{t("results.protein") || "Protein"}</div>
                <div className="nutrition-value">{calculation.total_protein?.toFixed(1) || "0"} g</div>
              </div>
            </div>
            <div className="nutrition-item-modal">
              <span className="nutrition-icon nutrition-icon-fat"></span>
              <div>
                <div className="nutrition-label">{t("results.fat") || "Fat"}</div>
                <div className="nutrition-value">{calculation.total_fat?.toFixed(1) || "0"} g</div>
              </div>
            </div>
            <div className="nutrition-item-modal">
              <span className="nutrition-icon nutrition-icon-carbs"></span>
              <div>
                <div className="nutrition-label">{t("results.carbs") || "Carbs"}</div>
                <div className="nutrition-value">{calculation.total_carbs?.toFixed(1) || "0"} g</div>
              </div>
            </div>
            <div className="nutrition-item-modal highlight">
              <span className="nutrition-icon nutrition-icon-cost"></span>
              <div>
                <div className="nutrition-label">{t("history.totalCost") || "Total Cost"}</div>
                <div className="nutrition-value">€{calculation.total_cost?.toFixed(2) || "0.00"}</div>
              </div>
            </div>
          </div>
        </div>

        {calculation.meal_plan && (
          <div className="modal-section">
            <h3>{t("form.mealPlan") || "Meal Plan"}</h3>
            <div className="modal-meal-plan" style={{ 
              whiteSpace: 'pre-wrap', 
              background: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              lineHeight: '1.6'
            }}>
              {calculation.meal_plan}
            </div>
          </div>
        )}
        
        <div className="modal-section">
          <h3>{t("history.dietPlan") || "Diet Plan"}</h3>
          <div className="modal-diet-list">
            {Object.entries(calculation.diet || {}).map(([product, grams]) => (
              <div key={product} className="modal-diet-item">
                <span className="product-name">{product}</span>
                <span className="product-amount">{grams.toFixed(0)}g</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
