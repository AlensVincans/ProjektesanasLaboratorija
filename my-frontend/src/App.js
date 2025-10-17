import React, { useState } from "react";
import "./App.css";
import Intro from "./components/Intro";
import UserForm from "./components/UserForm";
import ProductList from "./components/ProductList";
import RecipeList from "./components/RecipeList";
import Charts from "./components/Charts";

function App() {
  const [profile, setProfile] = useState({ allergens: [], dislikes: [] });

  return (
    <div className="container">
      <Intro />
      <UserForm onSaved={setProfile} />
      <ProductList />
      <RecipeList
        allergens={profile.allergens || []}
        dislikes={profile.dislikes || []}
      />
      <Charts />
    </div>
  );
}

export default App;
