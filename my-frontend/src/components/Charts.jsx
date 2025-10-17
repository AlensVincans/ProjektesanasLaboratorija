import React, { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";

export default function Charts(){
  const [data, setData] = useState([]);
  useEffect(()=>{
    fetch("http://localhost:5000/api/stats/prices")
      .then(r=>r.json()).then(setData);
  },[]);
  return (
    <div className="card">
      <h2>График цен по продуктам</h2>
      <div style={{width:"100%", height:300}}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="price" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
