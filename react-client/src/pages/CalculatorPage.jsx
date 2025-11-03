import React from "react";
import UserForm from "../components/UserForm";
import "./CalculatorPage.css";

export default function CalculatorPage() {
  return (
    <div className="calculator-page">
      <div className="page-header">
        <h1>Калькулятор рациона</h1>
        <p>Заполните анкету для расчета персонального рациона питания</p>
      </div>
      <div className="page-content">
        <UserForm />
      </div>
    </div>
  );
}

