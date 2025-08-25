import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://sorrim-project-backend.onrender.com';

const Home = () => {
  const navigate = useNavigate();
  const [isGuestAnimating, setIsGuestAnimating] = useState(false);
  const [guestError, setGuestError] = useState('');

  const handleGuestClick = async () => {
    setIsGuestAnimating(true);
    setGuestError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/latest`);
      
      if (response.ok) {
        const latestProject = await response.json();
        setTimeout(() => {
          navigate(`/guest/${latestProject.id}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setGuestError(errorData.error || 'ไม่พบโปรเจ็กต์ที่ใช้งานได้');
        setIsGuestAnimating(false);
      }
    } catch (error) {
      console.error('Error fetching latest project:', error);
      setGuestError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setIsGuestAnimating(false);
    }
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Event Media Collector</h1>
        <p>รวบรวมคลิปและรูปภาพจากแขกในงานอีเวนต์ของคุณ</p>
        
        <div className="user-type-selection">
          <div className="user-type-card">
            <h3>📸 Photographer</h3>
            <p>สร้างโปรเจ็กต์และจัดการคลิปจากแขก</p>
            <Link to="/login" className="btn btn-primary">
              เข้าสู่ระบบ Photographer
            </Link>
          </div>
          
          <div className={`user-type-card ${isGuestAnimating ? 'guest-scanning' : ''}`}>
            <h3>🎭 Guest</h3>
            <p>สแกน QR Code และอัพโหลดคลิป/รูปภาพ</p>
            <div className="guest-options">
              <button 
                className="btn btn-secondary guest-demo-btn"
                onClick={handleGuestClick}
                disabled={isGuestAnimating}
              >
                {isGuestAnimating ? (
                  <span className="scanning-text">
                    📱 กำลังค้นหาโปรเจ็กต์ล่าสุด...
                  </span>
                ) : (
                  'เข้าร่วมงานล่าสุด'
                )}
              </button>
              
              {guestError && (
                <div className="guest-error">
                  ⚠️ {guestError}
                  <small>กรุณาให้ Photographer สร้างโปรเจ็กต์ก่อน</small>
                </div>
              )}
              
              <div className="qr-info">
                <p>หรือสแกน QR Code จากงานเพื่อเข้าสู่หน้าอัพโหลด</p>
                {isGuestAnimating && (
                  <div className="qr-scanning-animation">
                    <div className="scan-line"></div>
                    <div className="scan-corners">
                      <div className="corner top-left"></div>
                      <div className="corner top-right"></div>
                      <div className="corner bottom-left"></div>
                      <div className="corner bottom-right"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
