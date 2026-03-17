import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile"; // Импортируем страницу профиля

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/home" element={<Home />} />
                <Route path="/profile" element={<Profile />} /> {/* Новый маршрут */}
            </Routes>
        </Router>
    );
};

export default App;