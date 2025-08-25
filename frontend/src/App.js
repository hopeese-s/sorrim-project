import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import PhotographerDashboard from './pages/PhotographerDashboard';
import GuestUpload from './pages/GuestUpload';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://sorrim-project-backend.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route 
            path="/photographer" 
            element={user ? <PhotographerDashboard user={user} /> : <Navigate to="/login" />} 
          />
          <Route path="/guest/:projectId" element={<GuestUpload />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
