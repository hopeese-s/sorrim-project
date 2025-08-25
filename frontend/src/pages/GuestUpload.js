import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './GuestUpload.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const GuestUpload = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [step, setStep] = useState(1); // 1=ใส่ชื่อ, 2=กล้อง, 3=สำเร็จ
  const [guestName, setGuestName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
      if (!response.ok) throw new Error('ไม่พบโปรเจ็กต์');
      const data = await response.json();
      setProject(data);
    } catch (err) {
      setError(err.message);
      setProject({ name: 'Error', error: true });
    }
  };

  // ขั้นตอนที่ 1: ใส่ชื่อและยืนยัน
  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('กรุณาใส่ชื่อ');
      return;
    }
    setStep(2);
    startCamera();
  };

  // เปิดกล้อง
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' // กล้องหน้า
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Cannot access camera:', err);
      alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้อง');
      setStep(1);
    }
  };

  // ถ่ายรูป
  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      setCapturedImage(blob);
      uploadPhoto(blob);
    }, 'image/jpeg', 0.8);

    // ปิดกล้อง
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // อัพโหลดรูป
  const uploadPhoto = async (imageBlob) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('media', imageBlob, `${guestName}_${Date.now()}.jpg`);
      formData.append('projectId', projectId);
      formData.append('guestName', guestName);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'อัพโหลดล้มเหลว');
      }

      setStep(3); // สำเร็จ!
    } catch (err) {
      console.error('Upload error:', err);
      alert(`อัพโหลดล้มเหลว: ${err.message}`);
      setStep(1);
    } finally {
      setUploading(false);
    }
  };

  // เลือกไฟล์แทน (สำรอง)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadPhoto(file);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setGuestName('');
    setCapturedImage(null);
    setError('');
  };

  if (!project) {
    return (
      <div className="guest-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (project.error) {
    return (
      <div className="guest-container">
        <div className="error-card">
          <h2>❌ ไม่พบโปรเจ็กต์</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'} className="btn">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-container">
      <div className="guest-card">
        <h2>📸 {project.name}</h2>
        
        {/* ขั้นตอนที่ 1: ใส่ชื่อ */}
        {step === 1 && (
          <div className="name-step">
            <h3>👋 ใส่ชื่อเล่นของคุณ</h3>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="ชื่อเล่น..."
                className="name-input"
                autoFocus
                required
              />
              <button type="submit" className="btn btn-primary">
                ยืนยัน ✅
              </button>
            </form>
          </div>
        )}

        {/* ขั้นตอนที่ 2: กล้อง */}
        {step === 2 && (
          <div className="camera-step">
            <h3>📷 ถ่ายรูปเลย {guestName}!</h3>
            
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div className="camera-controls">
              <button 
                onClick={capturePhoto} 
                className="btn btn-capture"
                disabled={uploading}
              >
                {uploading ? '📤 กำลังอัพโหลด...' : '📸 ถ่าย!'}
              </button>
              
              <div className="or-divider">หรือ</div>
              
              <label className="btn btn-file">
                📁 เลือกจากไฟล์
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        )}

        {/* ขั้นตอนที่ 3: สำเร็จ */}
        {step === 3 && (
          <div className="success-step">
            <div className="success-animation">🎉</div>
            <h3>สำเร็จแล้ว!</h3>
            <p>ขอบคุณ <strong>{guestName}</strong> ที่แชร์ความทรงจำ</p>
            <button onClick={resetFlow} className="btn btn-primary">
              ถ่ายอีกรูป 📸
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestUpload;
