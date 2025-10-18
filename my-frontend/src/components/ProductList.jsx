import React, { useEffect, useState } from "react";

export default function ProductList() {
  const [rows, setRows] = useState([]);
  const [savingId, setSavingId] = useState(null);

  // Локальная "загрузка" данных — имитация API
  const load = async () => {
    const fakeProducts = [
      { id: 1, name: "Молоко", price: 1.20 },
      { id: 2, name: "Хлеб", price: 0.85 },
      { id: 3, name: "Яйца", price: 2.50 },
      { id: 4, name: "Мясо", price: 6.75 },
      { id: 5, name: "Сыр", price: 4.40 },
    ];
    // имитируем задержку, как будто запрос идёт к серверу
    await new Promise(res => setTimeout(res, 300));
    setRows(fakeProducts);
  };

  useEffect(() => { load(); }, []);

  // "Обновление" цены без fetch — просто локально меняем state
  const updatePrice = async (id, price) => {
    setSavingId(id);
    await new Promise(res => setTimeout(res, 500)); // имитация ожидания
    setRows(rows =>
      rows.map(r => r.id === id ? { ...r, price: Number(price) || 0 } : r)
    );
    setSavingId(null);
  };

  return (
    <div className="card">
      <h2>Продукты и цены</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Продукт</th>
            <th style={{ width: 160 }}>Цена, €</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={r.price}
                  onBlur={(e) => updatePrice(r.id, e.target.value)}
                />
                {savingId === r.id && <span className="muted">  сохранение…</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={load}>Обновить</button>
    </div>
  );
}
