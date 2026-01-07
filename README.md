# Projektēšanas laboratorija — Diet Optimizer (web lietotne)

## Ievads projektā
Mēs veidojam lietotni, kas palīdz sastādīt **budžetam draudzīgu** un **drošu** ēdienkarti. Mēs balstāmies uz sabiedrības veselības un dietoloģijas **vadlīnijām** (WHO/EFSA, vietējie ieteikumi): katru dienu dārzeņi un augļi, biežāk **pilngraudi** nekā rafinētie, **mēreni brīvie cukuri**, saprātīgs **tauku** daudzums, **ierobežota sarkanā/pārstrādātā gaļa**, **ieteicamas zivis**, un **alergēnu** ievērošana. 

**Filtri (lietotājam):** alergēni *(piens/laktoze, glutēns, olas, soja, rieksti, sezams, sulfīti, zivs)*, **vegetārs** režīms, **bez pievienotā cukura**. Rezultātā lietotājs saņem optimizētu **produktu grozu** (grami + cena + grupu pārklājums) un pēc izvēles **nedēļas ēdienkarti latviski**, izmantojot **tikai** atlasītos produktus.

**Publiska saite:** `https://lab.aleksandrsbelkins.info`  
**Izvietojums:** Microsoft Azure mākoņplatformā.  
**Piekļuve:** izmantojam nginx kā reverso starpniekserveri un TLS sertifikātus drošai HTTPS piekļuvei.

---

## Mērķis un problēma
Mērķis ir palīdzēt lietotājam ātri iegūt uzturā sabalansētu, budžetam atbilstošu produktu grozu un ēdienkarti, vienlaikus ievērojot alergēnus un uztura ierobežojumus. Ikdienā lēmumu par ēdienkarti ietekmē laika trūkums, cenu svārstības un nepietiekamas zināšanas par uzturvielu prasībām, tāpēc risinājums piedāvā vienkāršu ievadi un skaidru rezultātu. Sistēma apvieno optimizācijas algoritmus ar lietotāja filtriem, lai gala grozs būtu gan praktiski izmantojams, gan atbilstošs veselīga uztura vadlīnijām.

---

## Komanda
- **Anna Pelagejevska** — lietotāja saskarne / vizualizācija
- **Aleksandrs Belkins** — servera puse / API; izvietošana uz Azure (Docker), nginx un TLS konfigurācija
- **Alens Vincāns** — servera puse / API
- **Ksenija Šitikova** — lietotāja saskarne / vizualizācija
- **Arturs Saltikovs** — datubāze
- **Maksims Malahovičs** — datubāze

---

## Funkcionalitātes
- Uzturvielu prasību un budžeta optimizācija ar lineāro programmēšanu.
- Alergēnu un uztura preferenču filtrēšana (piens/laktoze, glutēns, olas, soja, rieksti, sezams, sulfīti, zivs).
- Produkta groza izveide ar gramiem, cenu un grupu pārklājumu.
- Vēstures saglabāšana un iepriekšējo aprēķinu atkārtota apskate.
- Ēdienkartes ģenerēšana latviešu valodā no atlasītajiem produktiem (pēc izvēles).

---

## Tehnoloģiju steks
**Ko izmantojam projektā**
- **Lietotāja saskarne:** React (Create React App), HTML/CSS
- **Servera puse:** Python **Flask** (REST API)
- **Optimizācija:** **PuLP/CBC** (lineārā programmēšana — minimālā cena pie uzturprasībām)
- **Datu glabāšana:** **SQLite** (produktu uzturvielas uz 100 g, cena, alergēni, kategorijas)
- **Autentifikācija:** Google OAuth 2.0
- **Ēdienkartes ģenerēšana (pēc izvēles):** OpenAI API
- **Izvietošana/konteineri:** Docker, docker compose
- **Publiskā piekļuve/TLS:** reversais starpniekserveris ar Let’s Encrypt sertifikātiem
- **Konfigurācija:** `.env` faili (sensitīvie dati netiek komitēti)

---

## Arhitektūra
**Augsta līmeņa plūsma**
```
                     ┌──────────────────────────────┐
                     │  Reversais starpniekserveris │
                     │  (TLS, maršrutēšana /api)    │
                     └──────────────┬───────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                ┌────────▼────────┐   ┌────────▼────────┐
                │  React klients  │   │    Flask API    │───►┌─────────────┐
                └─────────────────┘   └────────┬────────┘    │  OpenAI API │
                                               │             └─────────────┘
                                               │
                                  ┌────────────▼────────────┐
                                  │  Optimizācija (PuLP/CBC)│
                                  └────────────┬────────────┘
                                               │
                                        ┌──────▼──────┐
                                        │   SQLite    │
                                        └─────────────┘
```

**Konceptuālais modelis**
- **Lietotāja iestatījumi**: dzimums, vecums, svars, augums, aktivitāte, periods (diena/nedēļa)
- **Filtri**: alergēni, veģetārs režīms, bez pievienotā cukura
- **Produkts**: nosaukums, uzturvielas/100 g, cena, alergēni, kategorijas
- **Grozs (rezultāts)**: {produkts → grami}, kopējā cena, uzturvielu kopsavilkums, produktu grupu pārklājums, izslēgtie pēc alergēniem
- **Ēdienkarte**: teksts latviski, veidots tikai no groza produktiem (pēc izvēles)

---

**Mapju koks**
```
ProjektesanasLaboratorija/
├─ docker-compose.yml # konteineru palaišana
├─ README.md          # projekta apraksts
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
└─ nginx/             # reversā starpniekservera konfigurācija (TLS, /api proxy)
   └─ docker-lab.aleksandrsbelkins.info.conf
```

---

## Kā palaist
**Palaišana būs caur `docker-compose.yml`.**

- [ ] `docker compose up --build -d`
- [ ] Front‑end: `https://lab.aleksandrsbelkins.info`
- [ ] API: `https://lab.aleksandrsbelkins.info/api`

**Google OAuth pāradresācijas URI:**
- `https://lab.aleksandrsbelkins.info/api/callback`
