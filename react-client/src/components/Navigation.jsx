import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navigation.css";

export default function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span>💪</span> Персональный Рацион
        </Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive("/")}`}>
            Главная
          </Link>
          <Link to="/calculator" className={`nav-link ${isActive("/calculator")}`}>
            Калькулятор
          </Link>
          <Link to="/results" className={`nav-link ${isActive("/results")}`}>
            Результаты
          </Link>
          <Link to="/about" className={`nav-link ${isActive("/about")}`}>
            О нас
          </Link>
        </div>
      </div>
    </nav>
  );
}

