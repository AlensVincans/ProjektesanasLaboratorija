import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./RecipeList.css";

export default function RecipeList({ allergens = [], dislikes = [] }) {
  const { language, t } = useLanguage();
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateMealPlan = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current diet from localStorage
      const savedDiet = localStorage.getItem("current_diet");
      const savedProfile = localStorage.getItem("demo_profile");
      
      if (!savedDiet || !savedProfile) {
        setError(t("form.mealPlanError") || "No diet data found. Please optimize your diet first.");
        setLoading(false);
        return;
      }

      const diet = JSON.parse(savedDiet);
      const profile = JSON.parse(savedProfile);

      // Prepare request body
      const requestBody = {
        gender: profile.gender || "male",
        weight: profile.weight || 70,
        height: profile.height || 175,
        age: profile.age || 30,
        activity: profile.activity || "moderate",
        period: profile.period || "week",
        allergens: profile.allergens || [],
        vegetarian: profile.vegetarian || false,
        language: language,
        diet: diet.diet || {}
      };

      const response = await fetch("http://localhost:5000/meal-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.meal_plan) {
        setMealPlan(data.meal_plan);
      } else {
        setError("No meal plan received");
      }
    } catch (err) {
      console.error("Error generating meal plan:", err);
      setError(err.message || "Failed to generate meal plan");
    } finally {
      setLoading(false);
    }
  };

  const renderMealPlan = (text) => {
    if (!text) return null;
    const sections = text.split(/(?=##)/g).filter(s => s.trim());
    return (
      <div className="meal-plan-sections">
        {sections.map((section, idx) => {
          const lines = section.trim().split('\n');
          const title = lines[0].replace(/^##\s*/, '').trim();
          const content = lines.slice(1).join('\n');
          let sectionClass = 'meal-section';
          if (title.includes('BROKASTIS') || title.includes('BREAKFAST')) sectionClass += ' breakfast';
          else if (title.includes('PUSDIENAS') || title.includes('LUNCH')) sectionClass += ' lunch';
          else if (title.includes('VAKARIŅAS') || title.includes('DINNER')) sectionClass += ' dinner';
          else if (title.includes('UZKODAS') || title.includes('SNACKS')) sectionClass += ' snacks';
          else if (title.includes('PADOMI') || title.includes('TIPS')) sectionClass += ' tips';

          return (
            <div key={idx} className={sectionClass}>
              <h3 className="section-title">{title}</h3>
              <div className="section-content">
                {renderContent(content)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = (content) => {
    const parts = content.split(/(?=###)/g);
    
    return parts.map((part, idx) => {
      const trimmed = part.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith('###')) {
        // Recipe/dish
        const dishLines = trimmed.split('\n');
        const dishName = dishLines[0].replace(/^###\s*/, '').trim();
        const dishContent = dishLines.slice(1).join('\n');
        
        return (
          <div key={idx} className="dish-card">
            <h4 className="dish-name">{dishName}</h4>
            {renderDishContent(dishContent)}
          </div>
        );
      } else {
        // Regular content (for tips section)
        return (
          <div key={idx} className="text-content">
            {trimmed.split('\n').map((line, i) => {
              if (line.startsWith('- ')) {
                return <li key={i} className="tip-item">{line.substring(2)}</li>;
              } else if (line.trim()) {
                return <p key={i}>{line}</p>;
              }
              return null;
            })}
          </div>
        );
      }
    });
  };

  const renderDishContent = (content) => {
    const sections = {};
    let currentSection = 'other';
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith('**') && trimmed.endsWith(':**')) {
        const sectionName = trimmed.replace(/\*\*/g, '').replace(':', '').toLowerCase();
        currentSection = sectionName;
        sections[currentSection] = [];
      } else if (currentSection) {
        if (!sections[currentSection]) sections[currentSection] = [];
        sections[currentSection].push(trimmed);
      }
    });

    return (
      <div className="dish-details">
        {sections.ingredients && sections.ingredients.length > 0 && (
          <div className="ingredients-section">
            <span className="section-label">{t('recipes.ingredients') || 'Ingredients'}:</span>
            <ul className="ingredients-list">
              {sections.ingredients.map((ing, i) => (
                <li key={i}>{ing.replace(/^-\s*/, '')}</li>
              ))}
            </ul>
          </div>
        )}
        
        {(sections.sastāvdaļas || sections['sastāvdaļas']) && (sections.sastāvdaļas || sections['sastāvdaļas']).length > 0 && (
          <div className="ingredients-section">
            <span className="section-label">Sastāvdaļas:</span>
            <ul className="ingredients-list">
              {(sections.sastāvdaļas || sections['sastāvdaļas']).map((ing, i) => (
                <li key={i}>{ing.replace(/^-\s*/, '')}</li>
              ))}
            </ul>
          </div>
        )}
        
        {sections.preparation && sections.preparation.length > 0 && (
          <div className="preparation-section">
            <span className="section-label">{t('recipes.preparation') || 'Preparation'}:</span>
            <p>{sections.preparation.join(' ')}</p>
          </div>
        )}
        
        {(sections.gatavošana || sections['gatavošana']) && (sections.gatavošana || sections['gatavošana']).length > 0 && (
          <div className="preparation-section">
            <span className="section-label">Gatavošana:</span>
            <p>{(sections.gatavošana || sections['gatavošana']).join(' ')}</p>
          </div>
        )}
        
        {sections.nutrition && sections.nutrition.length > 0 && (
          <div className="nutrition-section">
            <span className="section-label">{t('recipes.nutrition') || 'Nutrition'}:</span>
            <p>{sections.nutrition.join(' ')}</p>
          </div>
        )}
        
        {(sections.uzturvērtība || sections['uzturvērtība']) && (sections.uzturvērtība || sections['uzturvērtība']).length > 0 && (
          <div className="nutrition-section">
            <span className="section-label">Uzturvērtība:</span>
            <p>{(sections.uzturvērtība || sections['uzturvērtība']).join(' ')}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="recipe-list-container">
      <div className="recipe-list-header">
        <h2>{t("recipes.title") || "Recipes"}</h2>
        <button 
          onClick={generateMealPlan} 
          disabled={loading}
          className="generate-btn"
        >
          {loading ? (t("form.generating") || "Generating...") : (t("form.generateMealPlan") || "Generate Meal Plan")}
        </button>
      </div>
      
      {error && (
        <div className="recipe-error">
          <p>{error}</p>
        </div>
      )}

      {!mealPlan && !error && !loading && (
        <div className="recipe-empty">
          <p className="muted">{t("recipes.clickToGenerate") || "Click 'Generate Meal Plan' to get personalized recipes based on your optimized diet."}</p>
        </div>
      )}

      {mealPlan && renderMealPlan(mealPlan)}
    </div>
  );
}

