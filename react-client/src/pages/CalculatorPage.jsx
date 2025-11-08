import React from "react";
import UserForm from "../components/UserForm";
import { useLanguage } from "../contexts/LanguageContext";
import "./CalculatorPage.css";

export default function CalculatorPage() {
  const { t } = useLanguage();
  
  return (
    <div className="calculator-page">
      <div className="page-header">
        <h1>{t("calculator.title")}</h1>
        <p>{t("calculator.subtitle")}</p>
      </div>
      <div className="page-content">
        <UserForm />
      </div>
    </div>
  );
}

