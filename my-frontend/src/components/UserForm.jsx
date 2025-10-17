import React, { useState } from "react";

const activityOptions = [
  { value: "low", label: "Низкая" },
  { value: "moderate", label: "Умеренная" },
  { value: "high", label: "Высокая" },
];

function TagInput({ placeholder, suggestions = [], value, setValue }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const addTag = (tag) => {
    const t = tag.trim();
    if (!t) return;
    if (!value.includes(t)) setValue([...value, t]);
    setInput(""); setOpen(false);
  };

  const removeTag = (tag) => setValue(value.filter((x) => x !== tag));

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="tag-input">
      <div className="tags">
        {value.map((t) => (
          <span key={t} className="tag" onClick={() => removeTag(t)}>{t} ✕</span>
        ))}
        <input
          value={input}
          onChange={(e)=>{ setInput(e.target.value); setOpen(true); }}
          onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); addTag(input);} }}
          placeholder={placeholder}
        />
      </div>
      {open && input && (
        <div className="dropdown">
          {filtered.map((s) => (
            <div key={s} onMouseDown={()=>addTag(s)} className="dropdown-item">{s}</div>
          ))}
          <div className="dropdown-item muted" onMouseDown={()=>addTag(input)}>
            Добавить «{input}»
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserForm({ onSaved }) {
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState("moderate");

  const [allergens, setAllergens] = useState([]);
  const [dislikes, setDislikes] = useState([]);

  const commonFood = ["Молоко","Глютен","Арахис","Курица","Рыба","Яйцо","Орехи","Рис","Яблоко"];

  const save = async () => {
    const body = { gender, age:Number(age)||null, weight:Number(weight)||null,
                   height:Number(height)||null, activity, allergens, dislikes };
    await fetch("http://localhost:5000/api/profile",{
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });
    onSaved?.(body);
  };

  return (
    <div className="card">
      <h2>Анкета</h2>
      <div className="grid2">
        <label>Пол
          <select value={gender} onChange={(e)=>setGender(e.target.value)}>
            <option value="female">Женский</option>
            <option value="male">Мужской</option>
          </select>
        </label>

        <label>Возраст
          <input type="number" value={age} onChange={(e)=>setAge(e.target.value)} min="1"/>
        </label>

        <label>Вес (кг)
          <input type="number" value={weight} onChange={(e)=>setWeight(e.target.value)} min="1" step="0.1"/>
        </label>

        <label>Рост (см)
          <input type="number" value={height} onChange={(e)=>setHeight(e.target.value)} min="50"/>
        </label>

        <label>Физ. активность
          <select value={activity} onChange={(e)=>setActivity(e.target.value)}>
            {activityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

      <button className="primary" onClick={save}>Сохранить</button>
    </div>
  );
}

