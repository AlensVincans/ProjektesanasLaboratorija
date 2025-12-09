import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductList from "./ProductList";
import { useLanguage } from "../contexts/LanguageContext";
import "./userForm.css";

// Tag input component (for allergens and disliked products)
function TagInput({ placeholder, suggestions = [], value, setValue, t }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    if (!value.includes(trimmedTag)) setValue([...value, trimmedTag]);
    setInput("");
    setOpen(false);
  };

  const removeTag = (tag) => setValue(value.filter((x) => x !== tag));

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="tag-input">
      <div className="tags">
        {value.map((tag) => (
          <span key={tag} className="tag" onClick={() => removeTag(tag)}>
            {tag} ✕
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
        />
      </div>
      {open && input && (
        <div className="dropdown">
          {filtered.map((s) => (
            <div
              key={s}
              onMouseDown={() => addTag(s)}
              className="dropdown-item"
            >
              {s}
            </div>
          ))}
          <div
            className="dropdown-item muted"
            onMouseDown={() => addTag(input)}
          >
            {t("form.add")} "{input}"
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserForm() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [period, setPeriod] = useState("day"); // day | week

  const [allergens, setAllergens] = useState([]);
  const [dislikes, setDislikes] = useState([]);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // TDEE result
  const [calories, setCalories] = useState(null);
  const [calcErr, setCalcErr] = useState("");

  // Optimization result
  const [optLoading, setOptLoading] = useState(false);
  const [optErr, setOptErr] = useState("");
  const [diet, setDiet] = useState(null); // { diet, total_cost, nutrient_totals, norms, period, status }
  
  // Meal plan generation result
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [mealPlanErr, setMealPlanErr] = useState("");
  const [mealPlan, setMealPlan] = useState(null); // { diet, meal_plan, ... }

  const activityOptions = [
    { value: "low", label: t("form.low") },
    { value: "moderate", label: t("form.moderate") },
    { value: "active", label: t("form.active") },
  ];

  const commonFood = language === "lv" 
    ? ["Piens", "Glutēns", "Arašīdi", "Vista", "Zivis", "Olas", "Rieksti", "Rīsi", "Āboli"]
    : ["Milk", "Gluten", "Peanuts", "Chicken", "Fish", "Egg", "Nuts", "Rice", "Apple"];

  // Auto-load profile from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("demo_profile");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      setGender(p.gender ?? "female");
      setAge(p.age ?? "");
      setWeight(p.weight ?? "");
      setHeight(p.height ?? "");
      setActivity(p.activity ?? "moderate");
      setAllergens(Array.isArray(p.allergens) ? p.allergens : []);
      setDislikes(Array.isArray(p.dislikes) ? p.dislikes : []);
      setPeriod(p.period ?? "day");
    } catch {}
  }, []);

  // Helper: prepare request body for backend
  const makePayload = () => {
    const payload = {
      gender,
      age: Number(age) || null,
      weight: Number(weight) || null,
      height: Number(height) || null,
      activity,
      period,
      // Map "Milk"/"Piens" → lactose, rest as lowercase
      allergens: Array.from(
        new Set(
          allergens.map((a) => a.toLowerCase()).map((a) => (a === "milk" || a === "молоко" || a === "piens" ? "lactose" : a))
        )
      ),
      dislikes, // Not used on backend yet
    };
    return payload;
  };

  const save = async () => {
    const body = makePayload();

    setSaving(true);
    setSavedMsg("");
    setCalcErr("");
    setCalories(null);

    // Save locally (demo)
    await new Promise((res) => setTimeout(res, 200));
    localStorage.setItem("demo_profile", JSON.stringify(body));

    // Calculate TDEE
    try {
      const resp = await fetch("http://localhost:5000/tdee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: body.gender,
          age: body.age,
          weight: body.weight,
          height: body.height,
          activity: body.activity,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setCalories(data.kcal);
    } catch (e) {
      setCalcErr(String(e.message || e));
    } finally {
      setSaving(false);
      setSavedMsg(t("form.savedLocally"));
      setTimeout(() => setSavedMsg(""), 2000);
    }
  };

  const optimize = async () => {
    const body = makePayload();
    setOptLoading(true);
    setOptErr("");
    setDiet(null);
    setMealPlan(null); // Clear meal plan when optimizing again

    try {
      const resp = await fetch("http://localhost:5000/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: body.gender,
          age: body.age,
          weight: body.weight,
          height: body.height,
          activity: body.activity,
          allergens: body.allergens,
          period: body.period,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      if (data.error) throw new Error(data.error);
      setDiet(data);
      
      // Save diet to localStorage for ResultsPage
      localStorage.setItem("current_diet", JSON.stringify(data));
      
      // Save to history if user is logged in
      await saveToHistory(body, data);
    } catch (e) {
      setOptErr(String(e.message || e));
    } finally {
      setOptLoading(false);
    }
  };

  const saveToHistory = async (params, results) => {
    try {
      await fetch("http://localhost:5000/history", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: params.gender,
          age: params.age,
          weight: params.weight,
          height: params.height,
          activity: params.activity,
          period: params.period,
          allergens: params.allergens,
          vegetarian: false,
          total_cost: results.total_cost,
          nutrient_totals: results.nutrient_totals,
          diet: results.diet,
        }),
      });
      // Silently fail if not logged in
    } catch (e) {
      console.log("Not logged in or failed to save history");
    }
  };

  const generateMealPlan = async () => {
    const body = makePayload();
    setMealPlanLoading(true);
    setMealPlanErr("");
    setMealPlan(null);

    try {
      const resp = await fetch("http://localhost:5000/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: body.gender,
          age: body.age,
          weight: body.weight,
          height: body.height,
          activity: body.activity,
          allergens: body.allergens,
          period: body.period,
          language: language, // Pass language to backend
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || data?.details || `HTTP ${resp.status}`);
      if (data.error) throw new Error(data.error);
      setMealPlan(data);
      // Also update diet if meal plan includes it
      if (data.diet) {
        setDiet(data);
        localStorage.setItem("current_diet", JSON.stringify(data));
      }
      // Save meal plan to localStorage
      localStorage.setItem("current_meal_plan", JSON.stringify(data));
      
      // Save to history if user is logged in
      try {
        const saveResp = await fetch("http://localhost:5000/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            gender: body.gender,
            age: body.age,
            weight: body.weight,
            height: body.height,
            activity: body.activity,
            allergens: body.allergens,
            period: body.period,
            vegetarian: body.vegetarian || false,
            total_cost: data.total_cost || 0,
            nutrient_totals: data.nutrient_totals || {},
            diet: data.diet || {},
            meal_plan: data.meal_plan || ''
          }),
        });
        if (saveResp.ok) {
          console.log("Meal plan saved to history");
        }
      } catch (e) {
        console.error("Error saving meal plan to history:", e);
      }
    } catch (e) {
      setMealPlanErr(String(e.message || e));
    } finally {
      setMealPlanLoading(false);
    }
  };

  return (
    <div className="user-form card">
      <h2>{t("form.questionnaire")}</h2>
      <div className="grid2">
        <label>
          {t("form.gender")}
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="female">{t("form.female")}</option>
            <option value="male">{t("form.male")}</option>
          </select>
        </label>

        <label>
          {t("form.age")}
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min="1" />
        </label>

        <label>
          {t("form.weight")}
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} min="1" step="0.1" />
        </label>

        <label>
          {t("form.height")}
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} min="50" />
        </label>

        <label>
          {t("form.physicalActivity")}
          <select value={activity} onChange={(e) => setActivity(e.target.value)}>
            {activityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label>
          {t("form.period")}
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="day">{t("form.day")}</option>
            <option value="week">{t("form.week")}</option>
          </select>
        </label>
      </div>

      <div className="grid1">
        <label>{t("form.allergens")}</label>
        <TagInput
          placeholder={t("form.addAllergen")}
          suggestions={commonFood}
          value={allergens}
          setValue={setAllergens}
          t={t}
        />

        <label>{t("form.dislikedProducts")}</label>
        <TagInput
          placeholder={t("form.addProduct")}
          suggestions={commonFood}
          value={dislikes}
          setValue={setDislikes}
          t={t}
        />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? t("form.saving") : t("form.save")}
        </button>

        <button onClick={optimize} disabled={optLoading || mealPlanLoading} className="secondary">
          {optLoading ? t("form.optimizing") : t("form.optimize")}
        </button>

        <button onClick={generateMealPlan} disabled={mealPlanLoading || optLoading} className="secondary">
          {mealPlanLoading ? t("form.generating") : t("form.generateMealPlan")}
        </button>

        {savedMsg && <span className="muted">{savedMsg}</span>}
      </div>

      {calcErr && <div className="error" style={{ marginTop: 8 }}>{calcErr}</div>}
      {calories != null && (
        <div className="success" style={{ marginTop: 8 }}>
          {t("form.dailyRequirement")}: <b>{calories}</b> {t("form.kcal")}
        </div>
      )}

      {optErr && <div className="error" style={{ marginTop: 8 }}>{optErr}</div>}
      {mealPlanErr && <div className="error" style={{ marginTop: 8 }}>{t("form.mealPlanError")}: {mealPlanErr}</div>}
      {diet && (
        <>
          <ProductList diet={diet} />
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button 
              className="primary" 
              onClick={() => navigate("/results", { 
                state: { 
                  diet: diet,
                  mealPlan: mealPlan 
                } 
              })}
            >
              {t("form.viewDetailedResults") || "View Detailed Results"}
            </button>
          </div>
        </>
      )}
      {mealPlan && mealPlan.meal_plan && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>{t("form.mealPlan")}</h3>
          <div 
            style={{ 
              whiteSpace: "pre-wrap", 
              lineHeight: "1.6",
              padding: "12px",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
              maxHeight: "600px",
              overflowY: "auto"
            }}
          >
            {mealPlan.meal_plan}
          </div>
        </div>
      )}
    </div>
  );
}