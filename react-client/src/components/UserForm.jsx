import React, { useEffect, useState } from "react";
import "./userForm.css";


const activityOptions = [
  { value: "low", label: "Низкая" },
  { value: "moderate", label: "Умеренная" },
  { value: "high", label: "Высокая" },
];

// компонент ввода тегов (для аллергенов и нелюбимых продуктов)
function TagInput({ placeholder, suggestions = [], value, setValue }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const addTag = (tag) => {
    const t = tag.trim();
    if (!t) return;
    if (!value.includes(t)) setValue([...value, t]);
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
        {value.map((t) => (
          <span key={t} className="tag" onClick={() => removeTag(t)}>
            {t} ✕
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
            Добавить «{input}»
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserForm() {
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

  // результат TDEE
  const [calories, setCalories] = useState(null);
  const [calcErr, setCalcErr] = useState("");

  // результат оптимизации
  const [optLoading, setOptLoading] = useState(false);
  const [optErr, setOptErr] = useState("");
  const [diet, setDiet] = useState(null); // { diet, total_cost, nutrient_totals, norms, period, status }

  const commonFood = ["Молоко","Глютен","Арахис","Курица","Рыба","Яйцо","Орехи","Рис","Яблоко"];

  // автоподгрузка профиля из localStorage
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

  // вспомогательная: готовим тело запроса для бэка
  const makePayload = () => {
    const payload = {
      gender,
      age: Number(age) || null,
      weight: Number(weight) || null,
      height: Number(height) || null,
      activity,
      period,
      // маппим «Молоко» → lactose, остальное пока как есть в нижнем регистре
      allergens: Array.from(
        new Set(
          allergens.map((a) => a.toLowerCase()).map((a) => (a === "молоко" ? "lactose" : a))
        )
      ),
      dislikes, // пока не используем на бэке
    };
    return payload;
  };

  const save = async () => {
    const body = makePayload();

    setSaving(true);
    setSavedMsg("");
    setCalcErr("");
    setCalories(null);

    // сохраняем локально (демо)
    await new Promise((res) => setTimeout(res, 200));
    localStorage.setItem("demo_profile", JSON.stringify(body));

    // считаем TDEE
    try {
      const resp = await fetch("/tdee", {
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
      setSavedMsg("Сохранено локально.");
      setTimeout(() => setSavedMsg(""), 2000);
    }
  };

  const optimize = async () => {
    const body = makePayload();
    setOptLoading(true);
    setOptErr("");
    setDiet(null);

    try {
      const resp = await fetch("/optimize", {
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
    } catch (e) {
      setOptErr(String(e.message || e));
    } finally {
      setOptLoading(false);
    }
  };

  return (
    <div className="userform card">
      <h2>Анкета</h2>
      <div className="grid2">
        <label>
          Пол
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="female">Женский</option>
            <option value="male">Мужской</option>
          </select>
        </label>

        <label>
          Возраст
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min="1" />
        </label>

        <label>
          Вес (кг)
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} min="1" step="0.1" />
        </label>

        <label>
          Рост (см)
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} min="50" />
        </label>

        <label>
          Физ. активность
          <select value={activity} onChange={(e) => setActivity(e.target.value)}>
            {activityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label>
          Период
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="day">День</option>
            <option value="week">Неделя</option>
          </select>
        </label>
      </div>

      <div className="grid1">
        <label>Аллергены</label>
        <TagInput
          placeholder="Добавь аллерген и нажми Enter…"
          suggestions={commonFood}
          value={allergens}
          setValue={setAllergens}
        />

        <label>Нелюбимые продукты</label>
        <TagInput
          placeholder="Добавь продукт и нажми Enter…"
          suggestions={commonFood}
          value={dislikes}
          setValue={setDislikes}
        />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить и посчитать TDEE"}
        </button>

        <button onClick={optimize} disabled={optLoading} className="secondary">
          {optLoading ? "Оптимизация…" : "Оптимизировать рацион"}
        </button>

        {savedMsg && <span className="muted">{savedMsg}</span>}
      </div>

      {calcErr && <div className="error" style={{ marginTop: 8 }}>{calcErr}</div>}
      {calories != null && (
        <div className="success" style={{ marginTop: 8 }}>
          Суточная норма: <b>{calories}</b> ккал
        </div>
      )}

      {optErr && <div className="error" style={{ marginTop: 8 }}>{optErr}</div>}
      {diet && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Предложенный рацион ({diet.period === "week" ? "г/день на неделю" : "г/день"})</h3>
          {Object.keys(diet.diet || {}).length === 0 ? (
            <div className="muted">Рацион пуст — попробуй изменить параметры.</div>
          ) : (
            <ul>
              {Object.entries(diet.diet).map(([name, grams]) => (
                <li key={name}>
                  {name}: <b>{grams}</b> г
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 8 }}>
            Итоговая стоимость: <b>{diet.total_cost}</b>
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            Статус решения: {diet.status}
          </div>
        </div>
      )}
    </div>
  );
}
