import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "./index.css";

// Apply saved theme before app mounts
if (typeof document !== "undefined" && typeof window !== "undefined") {
    try {
        const savedTheme = window.localStorage.getItem("blinkchat-theme");
        if (savedTheme === "light") {
            document.body.classList.add("theme-light");
        }
    } catch (e) {
        // ignore
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
