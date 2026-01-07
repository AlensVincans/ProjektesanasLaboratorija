import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import "./Navigation.css";

export default function Navigation() {
  const location = useLocation();
  const { language, changeLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/user", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.logged_in) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          {t("nav.personalDiet")}
        </Link>
        <div className="nav-right">
          <div className="nav-links">
            <Link to="/" className={`nav-link ${isActive("/")}`}>
              {t("navigation.home") || t("nav.home")}
            </Link>
            <Link to="/calculator" className={`nav-link ${isActive("/calculator")}`}>
              {t("navigation.calculator") || t("nav.calculator")}
            </Link>
            <Link to="/about" className={`nav-link ${isActive("/about")}`}>
              {t("navigation.about") || t("nav.about")}
            </Link>
            {user && (
              <Link to="/history" className={`nav-link ${isActive("/history")}`}>
                {t("navigation.history") || t("nav.history") || "History"}
              </Link>
            )}
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
          <div className="auth-buttons" style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <>
                <Link to="/profile" className="profile-link">
                  <img
                    src={user.avatar_url || user.picture}
                    alt="avatar"
                    className="nav-avatar"
                  />
                  <span className="nav-username">{user.login || user.name || user.email}</span>
                </Link>
                <a className="nav-link logout-link" href="/api/logout">{t("navigation.logout")}</a>
              </>
            ) : (
              <a className="nav-link" href="/api/login">{t("navigation.login")}</a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

