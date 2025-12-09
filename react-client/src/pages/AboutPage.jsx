import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./AboutPage.css";

export default function AboutPage() {
  const { t } = useLanguage();
  
  return (
    <div className="about-page">
      <div className="page-header">
        <h1>{t("about.title")}</h1>
        <p>{t("about.subtitle")}</p>
      </div>
      <div className="page-content">
        <section className="about-section">
          <h2>{t("about.mission")}</h2>
          <p>
            {t("about.missionText")}
          </p>
        </section>

        <section className="about-section">
          <h2>{t("about.howItWorks")}</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>{t("about.step1")}</h3>
              <p>
                {t("about.step1Desc")}
              </p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>{t("about.step2")}</h3>
              <p>
                {t("about.step2Desc")}
              </p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>{t("about.step3")}</h3>
              <p>
                {t("about.step3Desc")}
              </p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>{t("about.step4")}</h3>
              <p>
                {t("about.step4Desc")}
              </p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>{t("about.benefits")}</h2>
          <ul className="advantages">
            <li>{t("about.benefit1")}</li>
            <li>{t("about.benefit2")}</li>
            <li>{t("about.benefit3")}</li>
            <li>{t("about.benefit4")}</li>
            <li>{t("about.benefit5")}</li>
            <li>{t("about.benefit6")}</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>{t("about.important")}</h2>
          <p>
            {t("about.importantText")}
          </p>
        </section>
      </div>
    </div>
  );
}

