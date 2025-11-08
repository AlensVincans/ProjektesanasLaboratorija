import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import "./HomePage.css";

export default function HomePage() {
  const { t } = useLanguage();
  
  return (
    <div className="home-page">
      <section className="home-section">
        <div className="home-content">
          <div className="home-text">
            <h1 className="home-title">{t("home.title")}</h1>
            <p className="home-subtitle">
              {t("home.subtitle")}
            </p>
            <p className="home-description">
              {t("home.description")}
            </p>
            <div className="home-actions">
              <Link to="/calculator" className="btn btn-primary">
                {t("home.startCalculation")}
              </Link>
              <Link to="/about" className="btn btn-secondary">
                {t("home.learnMore")}
              </Link>
            </div>
          </div>
          <div className="home-image-container">
            <img 
              src="/images/home.webp" 
              alt={t("home.title")}
              className="home-image"
            />
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">{t("home.features")}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>{t("home.accurateTDEE")}</h3>
              <p>{t("home.accurateTDEEDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🥗</div>
              <h3>{t("home.dietOptimization")}</h3>
              <p>{t("home.dietOptimizationDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚫</div>
              <h3>{t("home.allergenTracking")}</h3>
              <p>{t("home.allergenTrackingDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>{t("home.costControl")}</h3>
              <p>{t("home.costControlDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>{t("home.dataVisualization")}</h3>
              <p>{t("home.dataVisualizationDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🍽️</div>
              <h3>{t("home.recipeSelection")}</h3>
              <p>{t("home.recipeSelectionDesc")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>{t("home.readyToStart")}</h2>
          <p>{t("home.readyToStartDesc")}</p>
          <Link to="/calculator" className="btn btn-primary btn-large">
            {t("home.goToCalculator")}
          </Link>
        </div>
      </section>
    </div>
  );
}

