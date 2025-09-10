import React, { useState } from 'react';
import './Home.css';
const Home = () => {
    const [isGuestSelected, setIsGuestSelected] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [demoAttempts, setDemoAttempts] = useState(0);
    const [showError, setShowError] = useState(false);

    const selectGuest = () => setIsGuestSelected(true);
    const selectPhotographer = () => alert('Redirecting to photographer portal...');
    const startDemo = () => {
        const newAttempts = demoAttempts + 1;
        setDemoAttempts(newAttempts);
        if (newAttempts >= 3) {
            setShowError(true);
            return;
        }
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            if (newAttempts >= 2) setShowError(true);
        }, 3000);
    };

    return (
      <div className="home-page">
        <header className="header">
          <div className="logo">SORRIM'S WEBSITE</div>
          <nav className="nav">HOME</nav>
          <div className="auth-buttons">
            <button className="btn">LOG IN</button>
            <button className="btn">SIGN UP</button>
          </div>
        </header>
        <main className="main-container">
          <div className="left-section">
            <div className="brand-text">SORRIM'S WEBSITE</div>
            <h1 className="main-title">WHO<br/>ARE YOU?</h1>
            <div className="user-selection">
              <button className="user-type-card guest-card" onClick={selectGuest}>GUEST</button>
              <button className="user-type-card photographer-card" onClick={selectPhotographer}>PHOTOGRAPHER</button>
            </div>
            {isGuestSelected && (
              <div className="guest-options">
                <button className="guest-demo-btn" onClick={startDemo} disabled={demoAttempts >= 3}>
                  {isScanning ? <span className="scanning-text">🔍 Scanning for QR codes...</span> : 'Try Demo Experience'}
                </button>
                <div className="qr-info">
                  <p><strong>Or scan QR code with your phone</strong></p>
                  <p>Point your camera at QR codes around the venue to unlock exclusive content and experiences!</p>
                </div>
                {showError && (
                  <div className="guest-error">
                    <strong>Demo temporarily unavailable</strong>
                    <small>Please try scanning a QR code or contact staff for assistance</small>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="right-section">
            <div className="decorative-element"></div>
          </div>
        </main>
      </div>
    );
};
export default Home;
