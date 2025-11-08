import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";
import { useLanguage } from "../contexts/LanguageContext";

export default function Charts() {
  const { language, t } = useLanguage();
  const [data, setData] = useState([]);

  useEffect(() => {
    // Instead of server request — use local data
    const fakeData = language === "lv" ? [
      { name: "Piens", price: 1.2 },
      { name: "Maize", price: 0.9 },
      { name: "Olas", price: 2.5 },
      { name: "Gaļa", price: 6.8 },
      { name: "Siers", price: 4.3 },
      { name: "Augļi", price: 3.1 },
    ] : [
      { name: "Milk", price: 1.2 },
      { name: "Bread", price: 0.9 },
      { name: "Eggs", price: 2.5 },
      { name: "Meat", price: 6.8 },
      { name: "Cheese", price: 4.3 },
      { name: "Fruits", price: 3.1 },
    ];

    setData(fakeData);
  }, [language]);

  return (
    <div className="card">
      <h2>{t("charts.title")}</h2>
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
