import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { useLanguage } from "../contexts/LanguageContext";

export default function Charts({ diet: dietProp }) {
  const { language, t } = useLanguage();
  const [diet, setDiet] = useState(dietProp);
  const [costData, setCostData] = useState([]);
  const [nutrientData, setNutrientData] = useState([]);

  useEffect(() => {
    // Load diet from localStorage if no prop provided
    if (!dietProp) {
      const savedDiet = localStorage.getItem("current_diet");
      if (savedDiet) {
        try {
          setDiet(JSON.parse(savedDiet));
        } catch (e) {
          console.error("Error loading diet:", e);
        }
      }
    } else {
      setDiet(dietProp);
    }
  }, [dietProp]);

  useEffect(() => {
    if (!diet) {
      // Fallback to fake data if no diet available
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
      setCostData(fakeData);
      return;
    }

    // Use real diet data
    let items = diet.items || [];
    // If items array doesn't exist, try to convert diet.diet object to items array
    if (items.length === 0 && diet.diet && typeof diet.diet === 'object') {
      items = Object.entries(diet.diet).map(([name, grams]) => ({
        name,
        grams,
        cost: 0, // Cost will be missing but we'll still show the chart
      }));
    }
    
    if (items.length > 0) {
      // Cost chart data
      const costChartData = items
        .map(item => ({
          name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
          fullName: item.name,
          price: item.cost || 0,
        }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 10); // Top 10 most expensive items
      
      setCostData(costChartData);

      // Nutrient pie chart data
      if (diet.nutrient_totals) {
        const nutrientChartData = [
          { name: t("productList.protein") || "Protein", value: diet.nutrient_totals.protein || 0 },
          { name: t("productList.fat") || "Fat", value: diet.nutrient_totals.fat || 0 },
          { name: t("productList.carbs") || "Carbs", value: diet.nutrient_totals.carbs || 0 },
        ].filter(item => item.value > 0);
        
        setNutrientData(nutrientChartData);
      }
    }
  }, [diet, language, t]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (costData.length === 0 && nutrientData.length === 0) {
    return (
      <div className="card">
        <h2>{t("charts.title") || "Charts"}</h2>
        <div className="muted">{t("productList.empty") || "No data available for charts."}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{t("charts.title") || "Charts"}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {costData.length > 0 && (
          <div>
            <h3 style={{ marginBottom: "16px" }}>{t("charts.costChart") || "Cost by Product"}</h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={costData}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `€${value.toFixed(2)}`,
                      props.payload.fullName || name
                    ]}
                  />
                  <Bar dataKey="price" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {nutrientData.length > 0 && (
          <div>
            <h3 style={{ marginBottom: "16px" }}>{t("charts.nutrientChart") || "Macronutrient Distribution"}</h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={nutrientData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {nutrientData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}g`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
