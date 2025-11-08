import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function Intro() {
  const { t } = useLanguage();
  
  return (
    <div className="card">
      <h1>{t("intro.title")}</h1>
      <p>
        {t("intro.description")}
      </p>
    </div>
  );
}
