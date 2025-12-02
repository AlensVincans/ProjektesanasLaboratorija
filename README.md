# Projektēšanas laboratorija — Diet Optimizer (web lietotne)

## Intro par projektu
Mēs veidojam lietotni, kas palīdz sastādīt **budžetam draudzīgu** un **drošu** ēdienkarti. Mēs balstāmies uz sabiedrības veselības un dietoloģijas **vadlīnijām** (WHO/EFSA, vietējie ieteikumi): katru dienu dārzeņi un augļi, biežāk **pilngraudi** nekā rafinētie, **mēreni brīvie cukuri**, saprātīgs **tauku** daudzums, **ierobežota sarkanā/pārstrādātā gaļa**, **ieteicamas zivis**, un **alergēnu** ievērošana. 

**Filtri (lietotājam):** alergēni *(piens/laktoze, glutēns, olas, soja, rieksti, sezams, sulfīti, zivs)*, **vegetārs** režīms, **bez pievienotā cukura**. Rezultātā lietotājs saņem optimizētu **produktu grozu** (grami + cena + grupu pārklājums) un pēc izvēles **nedēļas ēdienkarti latviski**, izmantojot **tikai** atlasītos produktus.

---

## Komanda
- **Anna Pelagejevska** — frontend / vizualizācija
- **Aleksandrs Belkins** — backend / API
- **Alens Vincāns** — backend / API
- **Ksenija Šitikova** — frontend / vizualizācija
- **Arturs Saltikovs** — DB
- **Maksims Malahovičs** — DB

---

## Tehnoloģiju steks
- **Klients (front‑end):** React (Create React App), HTML/CSS
- **Serveris (back‑end):** Python **Flask** (REST API)
- **Optimizācijas serviss:** **PuLP/CBC** (lineārā programmēšana — minimālā cena pie uzturprasībām)
- **Datu glabāšanas serviss:** **SQLite** (produktu uzturvielas uz 100 g, cena, alergēni, kategorijas)
- **Konfigurācija:** `.env` (piem., `OPENAI_API_KEY` tikai ēdienkartei)

---

## Arhitektūra
**Augsta līmeņa plūsma**
```
React klients  →  Flask API  →  Optimizācijas serviss (PuLP)  →  SQLite
                           ↘︎  (pēc izvēles) OpenAI ēdienkarte LV
```

**Mapju koks**
```
ProjektesanasLaboratorija/
├─ flask-server/
│  ├─ app/            # API maršruti, servisi, modeļi, utilītas
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ models/
│  │  └─ utils/
│  ├─ db/             # SQLite datubāze (food.db) un skripti
│  ├─ tests/          # (pēc vajadzības) API/loģikas testi
│  └─ .env            # servera vides mainīgie
│
├─ react-client/
│  ├─ public/         # index.html, statiskie resursi
│  └─ src/
│     ├─ components/  # UserForm, ProductList u.c.
│     ├─ pages/       # skati/maršrutu lapas
│     ├─ api/         # klienta fetch/axios wrappers
│     ├─ hooks/       # pielāgotie React hooks
│     ├─ styles/      # globālie stili
│     └─ store/       # (pēc vajadzības) stāvokļa pārvaldība
│
└─ infra/
   └─ docker/         # (topošais) docker-compose, Dockerfile u.c.
```

**Konceptuālais modelis**
- **Preferences**: dzimums, vecums, svars, augums, aktivitāte, periods (diena/nedēļa)
- **Filtri**: alergēni, *vegetarian*, *no_added_sugar*
- **Produkts**: nosaukums, uzturvielas/100 g, cena, alergēni, kategorijas
- **Grozs (rezultāts)**: {produkts → grami}, kopējā cena, uzturvielu kopsavilkums, produktu grupu pārklājums, izslēgtie pēc alergēniem
- **Ēdienkarte**: teksts LV, veidots tikai no groza produktiem (pēc izvēles)

---

## Kā palaist
**Palaišana būs caur `docker-compose.yml`.**

- [ ] `docker-compose up --build`
- [ ] Front‑end: `http://localhost:3000`
- [ ] API: `http://localhost:5001`

