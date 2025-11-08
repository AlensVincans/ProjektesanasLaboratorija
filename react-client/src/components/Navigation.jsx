import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import "./Navigation.css";

export default function Navigation() {
  const location = useLocation();
  const { language, changeLanguage, t } = useLanguage();

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span>💪</span> {t("nav.personalDiet")}
        </Link>
        <div className="nav-right">
          <div className="nav-links">
            <Link to="/" className={`nav-link ${isActive("/")}`}>
              {t("nav.home")}
            </Link>
            <Link to="/calculator" className={`nav-link ${isActive("/calculator")}`}>
              {t("nav.calculator")}
            </Link>
            <Link to="/results" className={`nav-link ${isActive("/results")}`}>
              {t("nav.results")}
            </Link>
            <Link to="/about" className={`nav-link ${isActive("/about")}`}>
              {t("nav.about")}
            </Link>
          </div>
          <div className="language-switcher">
            <button
              className={`lang-btn ${language === "lv" ? "active" : ""}`}
              onClick={() => changeLanguage("lv")}
            >
              LV
            </button>
            <button
              className={`lang-btn ${language === "en" ? "active" : ""}`}
              onClick={() => changeLanguage("en")}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

