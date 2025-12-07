export const translations = {
  lv: {
    // Navigation
    nav: {
      home: "Sākums",
      calculator: "Kalkulators",
      results: "Rezultāti",
      about: "Par mums",
      personalDiet: "Personīgais uzturs"
    },
    // HomePage
    home: {
      title: "Personīgais Uzturs",
      subtitle: "Aprēķiniet ideālo uzturu, pamatojoties uz jūsu individuālajiem parametriem",
      description: "Mūsu kalkulators palīdzēs izvēlēties optimālo izvēlni, ņemot vērā jūsu vecumu, svaru, augumu, fizisko aktivitāti, alergēnus un ēdiena preferences. Mēs ņemam vērā visus svarīgos faktorus, lai izveidotu veselīgu un sabalansētu uzturu.",
      startCalculation: "Sākt aprēķinu",
      learnMore: "Uzzināt vairāk",
      features: "Kalkulatora iespējas",
      accurateTDEE: "Precīzs TDEE aprēķins",
      accurateTDEEDesc: "Dienas kaloriju nepieciešamības noteikšana, ņemot vērā jūsu aktivitātes līmeni",
      dietOptimization: "Uztura optimizācija",
      dietOptimizationDesc: "Produktu izvēle sabalansētam uzturam, ņemot vērā budžetu",
      allergenTracking: "Alergēnu uzskaite",
      allergenTrackingDesc: "Produktu izslēgšana, kas var izraisīt alerģiskas reakcijas",
      costControl: "Izmaksu kontrole",
      costControlDesc: "Kopējo uztura izmaksu aprēķins un optimizācija pēc cenas",
      dataVisualization: "Datu vizualizācija",
      dataVisualizationDesc: "Diagrammas un grafiki rezultātu skaidrai prezentācijai",
      recipeSelection: "Ēdienu receptes",
      recipeSelectionDesc: "Recepšu izvēle, ņemot vērā jūsu preferences un ierobežojumus",
      readyToStart: "Vai esat gatavi sākt?",
      readyToStartDesc: "Aizpildiet vienkāršu anketu un saņemiet personalizētu uztura plānu",
      goToCalculator: "Pāriet uz kalkulatoru"
    },
    // CalculatorPage
    calculator: {
      title: "Uztura kalkulators",
      subtitle: "Aizpildiet anketu, lai aprēķinātu personīgo uzturu"
    },
    // UserForm
    form: {
      questionnaire: "Anketa",
      gender: "Dzimums",
      female: "Sieviete",
      male: "Vīrietis",
      age: "Vecums",
      weight: "Svars (kg)",
      height: "Augums (cm)",
      physicalActivity: "Fiziskā aktivitāte",
      period: "Periods",
      day: "Diena",
      week: "Nedēļa",
      low: "Zema",
      moderate: "Vidēja",
      active: "Augsta",
      allergens: "Alergēni",
      addAllergen: "Pievienojiet alergēnu un nospiediet Enter…",
      dislikedProducts: "Nepiecietami produkti",
      addProduct: "Pievienojiet produktu un nospiediet Enter…",
      add: "Pievienot",
      save: "Saglabāt un aprēķināt TDEE",
      saving: "Saglabāšana…",
      optimize: "Optimizēt uzturu",
      optimizing: "Optimizēšana…",
      generateMealPlan: "Ģenerēt uztura plānu",
      generating: "Ģenerēšana…",
      savedLocally: "Saglabāts lokāli.",
      dailyRequirement: "Dienas nepieciešamība",
      kcal: "kcal",
      mealPlanError: "Uztura plāna ģenerēšanas kļūda",
      mealPlan: "Uztura plāns (ChatGPT)",
      viewDetailedResults: "Skatīt detalizētos rezultātus"
    },
    // ProductList
    productList: {
      suggestedDiet: "Ieteiktais uzturs",
      gPerDay: "g/dienā",
      gPerDayWeek: "g/dienā nedēļai",
      empty: "Uzturs ir tukšs — mēģiniet mainīt parametrus.",
      product: "Produkts",
      grams: "Grammas",
      kcalPerDay: "Kcal/dienā",
      protein: "Olbaltumvielas",
      fat: "Tauki",
      carbs: "Ogļhidrāti",
      cost: "Izmaksas, €",
      totalCost: "Kopējās izmaksas",
      solutionStatus: "Risinājuma statuss",
      nutrientSummary: "Rezultāti pēc uzturvielām",
      kcalTarget: "Kcal",
      target: "mērķis",
      period: "Periods"
    },
    // ResultsPage
    results: {
      title: "Aprēķina rezultāti",
      subtitle: "Skatiet detalizētu informāciju par savu uzturu"
    },
    // AboutPage
    about: {
      title: "Par mums",
      subtitle: "Informācija par personīgā uztura kalkulatoru",
      mission: "Mūsu misija",
      missionText: "Mēs izveidojām šo kalkulatoru, lai palīdzētu cilvēkiem izveidot veselīgu un sabalansētu uzturu, ņemot vērā viņu individuālās vajadzības. Mūsu mērķis ir padarīt pareizo uzturu pieejamu un saprotamu ikvienam.",
      howItWorks: "Kā tas darbojas",
      step1: "Aizpildiet anketu",
      step1Desc: "Norādiet savus parametrus: dzimumu, vecumu, svaru, augumu, fiziskās aktivitātes līmeni, alergēnus un ēdiena preferences.",
      step2: "TDEE aprēķins",
      step2Desc: "Sistēma aprēķina jūsu dienas kaloriju nepieciešamību (Total Daily Energy Expenditure), pamatojoties uz Mifflin-St Jeor formulu.",
      step3: "Uztura optimizācija",
      step3Desc: "Optimizācijas algoritms izvēlas optimālo produktu kopu, ņemot vērā jūsu kaloriju vajadzības, makroelementus un budžeta ierobežojumus.",
      step4: "Saņemiet rezultātu",
      step4Desc: "Jūs saņemsiet detalizētu uztura plānu ar izmaksu aprēķinu, receptes un datu vizualizāciju diagrammu veidā.",
      benefits: "Priekšrocības",
      benefit1: "Individuāla pieeja katram lietotājam",
      benefit2: "Alergēnu un uztura ierobežojumu uzskaite",
      benefit3: "Uztura izmaksu optimizācija",
      benefit4: "Sabalansēts uzturs pēc makroelementiem",
      benefit5: "Recepšu izvēle, ņemot vērā jūsu preferences",
      benefit6: "Skaidra datu vizualizācija",
      important: "Svarīgi atcerēties",
      importantText: "Šis kalkulators sniedz vispārīgas rekomendācijas. Lai saņemtu individuālas uztura rekomendācijas, it īpaši, ja jums ir hroniskas slimības, ieteicams konsultēties ar ārstu vai uztura speciālistu."
    },
    // RecipeList
    recipes: {
      title: "Receptes",
      nothingFound: "Nekas nav atrasts, kas atbilstu ierobežojumiem.",
      ingredients: "Sastāvdaļas"
    },
    // Charts
    charts: {
      title: "Produktu cenu diagramma",
      costChart: "Izmaksas pa produktiem",
      nutrientChart: "Makroelementu sadalījums"
    },
    // Intro
    intro: {
      title: "Personīgais uzturs",
      description: "Aizpildiet anketu zemāk: dzimums, vecums, augums, svars, fiziskā aktivitāte, alergēni un nepiecietami produkti. Mēs izvēlēsimies produktu sarakstu, receptes un parādīsim cenu diagrammas."
    },
    // Navigation
    navigation: {
      home: "Sākums",
      calculator: "Kalkulators",
      history: "Vēsture",
      about: "Par mums",
      login: "Ielogoties ar Google",
      logout: "Iziet"
    },
    // History
    history: {
      title: "Aprēķinu vēsture",
      subtitle: "Skatiet savus iepriekšējos aprēķinus",
      loading: "Ielādēšana...",
      notLoggedIn: "Lūdzu, ielogojieties, lai skatītu savu aprēķinu vēsturi.",
      noHistory: "Vēl nav neviena aprēķina. Sāciet, izveidojot jaunu aprēķinu!",
      error: "Neizdevās ielādēt vēsturi",
      confirmDelete: "Vai tiešām dzēst šo aprēķinu?",
      delete: "Dzēst",
      years: "g.",
      cost: "Izmaksas",
      kcal: "Kcal",
      details: "Aprēķina detaļas",
      parameters: "Parametri",
      nutrition: "Uzturvērtības kopsavilkums",
      totalCost: "Kopējās izmaksas",
      dietPlan: "Uztura plāns"
    },
    // Profile
    profile: {
      title: "Mans profils",
      subtitle: "Pārvaldiet savus uztura aprēķinus un preferences",
      loading: "Ielādēšana...",
      overview: "Pārskats",
      history: "Vēsture",
      memberSince: "Dalībnieks kopš",
      totalCalculations: "Kopējie aprēķini",
      avgCost: "Vidējās izmaksas",
      avgKcal: "Vidējās kalorijas",
      avgProtein: "Vidējie olbaltumvielas",
      insights: "Ieskati",
      periodPreference: "Perioda preferences",
      costRange: "Izmaksu diapazons",
      cheapest: "Lētākais",
      mostExpensive: "Dārgākais",
      noCalculations: "Vēl nav aprēķinu. Sāciet, izveidojot savu pirmo uztura plānu!",
      favorites: "Iecienītākās diētas",
      recentCalculations: "Nesenie aprēķini",
      addToFavorites: "Pievienot favorītiem",
      removeFromFavorites: "Noņemt no favorītiem",
      exportData: "Eksportēt datus",
      exportHistory: "Eksportēt vēsturi JSON formātā"
    }
  },
  en: {
    // Navigation
    nav: {
      home: "Home",
      calculator: "Calculator",
      results: "Results",
      about: "About",
      personalDiet: "Personal Diet"
    },
    // HomePage
    home: {
      title: "Personal Diet",
      subtitle: "Calculate the ideal diet based on your individual parameters",
      description: "Our calculator will help you choose the optimal menu taking into account your age, weight, height, physical activity, allergens and food preferences. We take into account all important factors for creating healthy and balanced nutrition.",
      startCalculation: "Start Calculation",
      learnMore: "Learn More",
      features: "Calculator Features",
      accurateTDEE: "Accurate TDEE Calculation",
      accurateTDEEDesc: "Determine daily calorie requirement based on your activity level",
      dietOptimization: "Diet Optimization",
      dietOptimizationDesc: "Select products for balanced nutrition considering your budget",
      allergenTracking: "Allergen Tracking",
      allergenTrackingDesc: "Exclude products that may cause allergic reactions",
      costControl: "Cost Control",
      costControlDesc: "Calculate total diet cost and optimize by price",
      dataVisualization: "Data Visualization",
      dataVisualizationDesc: "Charts and graphs for clear presentation of results",
      recipeSelection: "Recipe Selection",
      recipeSelectionDesc: "Choose recipes based on your preferences and restrictions",
      readyToStart: "Ready to Start?",
      readyToStartDesc: "Fill out a simple questionnaire and get a personalized meal plan",
      goToCalculator: "Go to Calculator"
    },
    // CalculatorPage
    calculator: {
      title: "Diet Calculator",
      subtitle: "Fill out the questionnaire to calculate your personal diet"
    },
    // UserForm
    form: {
      questionnaire: "Questionnaire",
      gender: "Gender",
      female: "Female",
      male: "Male",
      age: "Age",
      weight: "Weight (kg)",
      height: "Height (cm)",
      physicalActivity: "Physical Activity",
      period: "Period",
      day: "Day",
      week: "Week",
      low: "Low",
      moderate: "Moderate",
      active: "Active",
      allergens: "Allergens",
      addAllergen: "Add allergen and press Enter…",
      dislikedProducts: "Disliked Products",
      addProduct: "Add product and press Enter…",
      add: "Add",
      save: "Save and Calculate TDEE",
      saving: "Saving…",
      optimize: "Optimize Diet",
      optimizing: "Optimizing…",
      generateMealPlan: "Generate Meal Plan",
      generating: "Generating plan…",
      savedLocally: "Saved locally.",
      dailyRequirement: "Daily requirement",
      kcal: "kcal",
      mealPlanError: "Meal plan generation error",
      mealPlan: "Meal Plan (ChatGPT)",
      viewDetailedResults: "View Detailed Results"
    },
    // ProductList
    productList: {
      suggestedDiet: "Suggested Diet",
      gPerDay: "g/day",
      gPerDayWeek: "g/day for week",
      empty: "Diet is empty — try changing the parameters.",
      product: "Product",
      grams: "Grams",
      kcalPerDay: "Kcal/day",
      protein: "Protein",
      fat: "Fat",
      carbs: "Carbs",
      cost: "Cost, €",
      totalCost: "Total cost",
      solutionStatus: "Solution status",
      nutrientSummary: "Nutrient Summary",
      kcalTarget: "Kcal",
      target: "target",
      period: "Period"
    },
    // ResultsPage
    results: {
      title: "Calculation Results",
      subtitle: "View detailed information about your diet"
    },
    // AboutPage
    about: {
      title: "About Us",
      subtitle: "Information about the personal diet calculator",
      mission: "Our Mission",
      missionText: "We created this calculator to help people create a healthy and balanced diet that takes into account their individual needs. Our goal is to make proper nutrition accessible and understandable for everyone.",
      howItWorks: "How It Works",
      step1: "Fill Out the Questionnaire",
      step1Desc: "Enter your parameters: gender, age, weight, height, physical activity level, allergens and food preferences.",
      step2: "TDEE Calculation",
      step2Desc: "The system calculates your daily calorie requirement (Total Daily Energy Expenditure) based on the Mifflin-St Jeor formula.",
      step3: "Diet Optimization",
      step3Desc: "The optimization algorithm selects the optimal set of products, taking into account your calorie needs, macronutrients and budget constraints.",
      step4: "Get Results",
      step4Desc: "You will receive a detailed meal plan with cost calculation, recipes and data visualization in the form of charts.",
      benefits: "Benefits",
      benefit1: "Individual approach to each user",
      benefit2: "Tracking allergens and dietary restrictions",
      benefit3: "Diet cost optimization",
      benefit4: "Balanced nutrition by macronutrients",
      benefit5: "Recipe selection based on your preferences",
      benefit6: "Clear data visualization",
      important: "Important to Remember",
      importantText: "This calculator provides general recommendations. For individual nutrition recommendations, especially if you have chronic diseases, it is recommended to consult with a doctor or dietitian."
    },
    // RecipeList
    recipes: {
      title: "Recipes",
      nothingFound: "Nothing found matching the restrictions.",
      ingredients: "Ingredients"
    },
    // Charts
    charts: {
      title: "Product Price Chart",
      costChart: "Cost by Product",
      nutrientChart: "Macronutrient Distribution"
    },
    // Intro
    intro: {
      title: "Personal Diet",
      description: "Fill out the questionnaire below: gender, age, height, weight, physical activity, allergens and disliked products. We will select a list of products, recipes and show price charts."
    },
    // Navigation
    navigation: {
      home: "Home",
      calculator: "Calculator",
      history: "History",
      about: "About",
      login: "Login with Google",
      logout: "Logout"
    },
    // History
    history: {
      title: "Calculation History",
      subtitle: "View your previous calculations",
      loading: "Loading...",
      notLoggedIn: "Please log in to view your calculation history.",
      noHistory: "No calculations yet. Start by creating a new calculation!",
      error: "Failed to load history",
      confirmDelete: "Delete this calculation?",
      delete: "Delete",
      years: "y",
      cost: "Cost",
      kcal: "Kcal",
      details: "Calculation Details",
      parameters: "Parameters",
      nutrition: "Nutrition Summary",
      totalCost: "Total Cost",
      dietPlan: "Diet Plan"
    },
    // Profile
    profile: {
      title: "My Profile",
      subtitle: "Manage your diet calculations and preferences",
      loading: "Loading...",
      overview: "Overview",
      history: "History",
      memberSince: "Member since",
      totalCalculations: "Total Calculations",
      avgCost: "Average Cost",
      avgKcal: "Average Calories",
      avgProtein: "Average Protein",
      insights: "Insights",
      periodPreference: "Period Preference",
      costRange: "Cost Range",
      cheapest: "Cheapest",
      mostExpensive: "Most Expensive",
      noCalculations: "No calculations yet. Start by creating your first diet plan!",
      favorites: "Favorite Diets",
      recentCalculations: "Recent Calculations",
      addToFavorites: "Add to favorites",
      removeFromFavorites: "Remove from favorites",
      exportData: "Export Data",
      exportHistory: "Export history as JSON"
    }
  }
};

