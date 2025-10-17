import React, { useEffect, useState } from "react";

export default function ProductList() {
  const [rows, setRows] = useState([]);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    const r = await fetch("http://localhost:5000/api/products");
    setRows(await r.json());
  };
  useEffect(()=>{ load(); }, []);

  const updatePrice = async (id, price) => {
    setSavingId(id);
    await fetch(`http://localhost:5000/api/products/${id}`,{
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ price: Number(price) || 0 })
    });
    setSavingId(null);
  };

  return (
    <div className="card">
      <h2>Продукты и цены</h2>
      <table className="table">
        <thead><tr><th>Продукт</th><th style={{width:160}}>Цена, €</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={r.price}
                  onBlur={(e)=>updatePrice(r.id, e.target.value)}
                />
                {savingId===r.id && <span className="muted">  сохранение…</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={load}>Обновить</button>
    </div>
  );
}
