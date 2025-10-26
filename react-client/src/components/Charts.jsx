import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";

export default function Charts() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Вместо запроса к серверу — используем локальные данные
    const fakeData = [
      { name: "Молоко", price: 1.2 },
      { name: "Хлеб", price: 0.9 },
      { name: "Яйца", price: 2.5 },
      { name: "Мясо", price: 6.8 },
      { name: "Сыр", price: 4.3 },
      { name: "Фрукты", price: 3.1 },
    ];

    setData(fakeData);
  }, []);

  return (
    <div className="card">
      <h2>График цен по продуктам</h2>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="price" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
