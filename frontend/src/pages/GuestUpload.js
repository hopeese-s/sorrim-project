import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './GuestUpload.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const GuestUpload = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraStream, setCameraStream] = useState(null);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    fetchProject();
    return () => {
      // Clean up camera stream when component unmounts
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [projectId]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 9) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // เก็บโค้ดเดิมไว้ทั้งหมด แล้วแก้ไขเฉพาะฟังก์ชัน fetchProject

const fetchProject = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
    if (response.ok) {
      const data = await response.json();
      setProject(data);
    } else {
      // If project not found, show error instead of demo
      setProject({
        id: projectId,
        name: 'โปรเจ็กต์ไม่พบ',
        error: true,
        mediaFiles: []
      });
    }
  } catch (error) {
    console.error('Error fetching project:', error);
    setProject({
      id: projectId,
      name: 'เกิดข้อผิดพลาด',
      error: true,
      mediaFiles: []
    });
  }
};

// และในส่วน return ให้เพิ่มการตรวจสอบ error
if (!project) {
  return (
    <div className="loading">
      <div className="loading-spinner"></div>
      <p>กำลังโหลด...</p>
    </div>
  );
}

if (project.error) {
  return (
    <div className="guest-upload-container">
      <div className="upload-card error-card">
        <h2>❌ ไม่พบโปรเจ็กต์</h2>
        <p>โปรเจ็กต์นี้อาจถูกลบหรือไม่มีอยู่จริง</p>
        <button 
          className="btn btn-primary"
          onClick={() => window.location.href = '/'}
        >
          กลับหน้าแรก
        </button>
      </div>
    </div>
  );
}


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์');
    }
  };

  const startRecording = () => {
    if (!cameraStream) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(cameraStream, {
      mimeType: 'video/webm'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' });
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(blob);
      
      setShowCamera(false);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check video duration if it's a video file
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.duration > 10) {
            alert('คลิปวิดีโอต้องมีความยาวไม่เกิน 10 วินาที');
            return;
          }
          setSelectedFile(file);
          const reader = new FileReader();
          reader.onload = (e) => setPreview(e.target.result);
          reader.readAsDataURL(file);
        };
        video.src = URL.createObjectURL(file);
      } else {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !guestName.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('projectId', projectId);
      formData.append('guestName', guestName);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setUploadSuccess(true);
        setSelectedFile(null);
        setPreview(null);
        setGuestName('');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setUploading(false);
  };

  if (!project) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="upload-success">
        <div className="success-animation">
          <div className="checkmark">✓</div>
        </div>
        <h2>🎉 อัพโหลดสำเร็จ!</h2>
        <p>ขอบคุณที่ร่วมแชร์ความทรงจำในงาน "{project.name}"</p>
        <button 
          onClick={() => setUploadSuccess(false)} 
          className="btn btn-primary"
        >
          อัพโหลดอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="guest-upload-container">
      <div className="upload-card">
        <h2>📸 แชร์ความทรงจำ</h2>
        <p className="project-name">งาน: {project.name}</p>
        
        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label>ชื่อเล่น:</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="กรุณาใส่ชื่อเล่น"
              className="guest-name-input"
              required
            />
          </div>

          <div className="media-options">
            <div className="option-buttons">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={startCamera}
              >
                📹 ถ่ายวิดีโอ (10 วิ)
              </button>
              
              <label className="btn btn-secondary file-select-btn">
                📁 เลือกไฟล์
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {showCamera && (
            <div className="camera-container">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                className="camera-video"
              />
              <div className="camera-controls">
                <div className="recording-timer">
                  {isRecording && (
                    <span className="timer">
                      🔴 {recordingTime}/10 วิ
                    </span>
                  )}
                </div>
                <div className="camera-buttons">
                  {!isRecording ? (
                    <button 
                      type="button"
                      className="btn btn-record"
                      onClick={startRecording}
                    >
                      🎥 เริ่มถ่าย
                    </button>
                  ) : (
                    <button 
                      type="button"
                      className="btn btn-stop"
                      onClick={stopRecording}
                    >
                      ⏹️ หยุด
                    </button>
                  )}
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCamera(false);
                      if (cameraStream) {
                        cameraStream.getTracks().forEach(track => track.stop());
                        setCameraStream(null);
                      }
                    }}
                  >
                    ❌ ปิดกล้อง
                  </button>
                </div>
              </div>
            </div>
          )}

          {preview && (
            <div className="preview">
              {selectedFile?.type?.startsWith('image/') ? (
                <img src={preview} alt="Preview" />
              ) : (
                <video src={preview} controls />
              )}
              <button 
                type="button"
                className="remove-file-btn"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
              >
                ❌ ลบไฟล์
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={uploading || !selectedFile || !guestName.trim()}
            className={`btn btn-primary upload-btn ${uploading ? 'btn-loading' : ''}`}
          >
            {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลด'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuestUpload;
