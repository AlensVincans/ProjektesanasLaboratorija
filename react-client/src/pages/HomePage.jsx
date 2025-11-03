import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="home-section">
        <div className="home-content">
          <div className="home-text">
            <h1 className="home-title">Персональный Рацион</h1>
            <p className="home-subtitle">
              Рассчитайте идеальный рацион питания на основе ваших индивидуальных параметров
            </p>
            <p className="home-description">
              Наш калькулятор поможет подобрать оптимальное меню с учетом вашего возраста, 
              веса, роста, физической активности, аллергенов и пищевых предпочтений. 
              Мы учитываем все важные факторы для создания здорового и сбалансированного питания.
            </p>
            <div className="home-actions">
              <Link to="/calculator" className="btn btn-primary">
                Начать расчет
              </Link>
              <Link to="/about" className="btn btn-secondary">
                Узнать больше
              </Link>
            </div>
          </div>
          <div className="home-image-container">
            <img 
              src="/images/home.webp" 
              alt="Здоровое питание и фитнес" 
              className="home-image"
            />
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Возможности калькулятора</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Точный расчет TDEE</h3>
              <p>Определение суточной нормы калорий с учетом вашего уровня активности</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🥗</div>
              <h3>Оптимизация рациона</h3>
              <p>Подбор продуктов для сбалансированного питания с учетом бюджета</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚫</div>
              <h3>Учет аллергенов</h3>
              <p>Исключение продуктов, которые могут вызвать аллергические реакции</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Контроль стоимости</h3>
              <p>Расчет общей стоимости рациона и оптимизация по цене</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Визуализация данных</h3>
              <p>Графики и диаграммы для наглядного представления результатов</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🍽️</div>
              <h3>Рецепты блюд</h3>
              <p>Подбор рецептов с учетом ваших предпочтений и ограничений</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Готовы начать?</h2>
          <p>Заполните простую анкету и получите персонализированный план питания</p>
          <Link to="/calculator" className="btn btn-primary btn-large">
            Перейти к калькулятору
          </Link>
        </div>
      </section>
    </div>
  );
}

