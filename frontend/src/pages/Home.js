import React from 'react';
import './Home.css';

const Home = () => {
  const handleLogin = () => { /* login logic */ };
  const handleSignup = () => { /* signup logic */ };
  const handleGuest = () => { /* guest logic */ };
  const handlePhotographer = () => { /* photographer logic */ };

  return (
    <div className="home-root">
      {/* Header */}
      <header className="home-header">
        <span className="home-logo">SORRIM'S WEBSITE</span>
        <nav className="home-nav">
          <span className="home-nav-home">HOME</span>
        </nav>
        <div className="home-auth-buttons">
          <button className="home-btn home-btn-login" onClick={handleLogin}>LOG IN</button>
          <button className="home-btn home-btn-signup" onClick={handleSignup}>SIGN UP</button>
        </div>
      </header>

      {/* Content */}
      <main className="home-main">
        <div className="home-left">
          <div className="home-brand">SORRIM'S WEBSITE</div>
          <h1 className="home-title">WHO<br/>ARE YOU?</h1>
          <div className="home-role-select">
            <button className="home-role-btn home-guest-btn" onClick={handleGuest}>GUEST</button>
            <button className="home-role-btn home-photographer-btn" onClick={handlePhotographer}>PHOTOGRAPHER</button>
          </div>
        </div>
        <div className="home-right">
          <div className="home-image-camera"></div>
        </div>
      </main>
    </div>
  );
};

export default Home;
