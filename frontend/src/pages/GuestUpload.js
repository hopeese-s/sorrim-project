import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        console.log(`🔍 Fetching project: ${projectId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'ไม่พบโปรเจ็กต์');
        }
        
        const data = await response.json();
        console.log(`✅ Project loaded:`, data);
        setProject(data);
      } catch (err) {
        console.error('❌ Fetch project error:', err);
        setError(err.message);
        setProject({ 
          name: 'ไม่พบโปรเจ็กต์', 
          error: true,
          errorMessage: err.message 
        });
      }
    };
    
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        alert('ขนาดไฟล์ใหญ่เกิน 100MB กรุณาเลือกไฟล์ใหม่');
        return;
      }
      
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      console.log('✅ File selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!selectedFile) {
      alert('กรุณาเลือกไฟล์');
      return;
    }
    
    if (!guestName.trim()) {
      alert('กรุณาใส่ชื่อ');
      return;
    }

    setUploading(true);
    setError('');

    try {
      console.log('📤 Starting upload...');
      
      // Create FormData - สำคัญมาก!
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('projectId', projectId);
      formData.append('guestName', guestName.trim());

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        // ❌ ห้ามใส่ Content-Type header เมื่อใช้ FormData!
        // browser จะตั้งให้อัตโนมัติพร้อม boundary
        body: formData,
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการอัพโหลด');
      }

      const result = await response.json();
      console.log('✅ Upload success:', result);
      
      setUploadSuccess(true);
    } catch (err) {
      console.error('❌ Upload error:', err);
      setError(err.message);
      alert(`การอัพโหลดล้มเหลว: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  if (!project) {
    return (
      <div className="guest-upload-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (project.error) {
    return (
      <div className="guest-upload-container">
        <div className="upload-card error-card">
          <h2>❌ ไม่พบโปรเจ็กต์</h2>
          <p>{error || 'ลิงก์นี้อาจไม่ถูกต้องหรือโปรเจ็กต์ถูกลบไปแล้ว'}</p>
          <div className="error-details">
            <small>Project ID: {projectId}</small>
          </div>
          <button 
            onClick={() => window.location.href = '/'} 
            className="btn btn-primary"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="guest-upload-container">
        <div className="upload-card success-card">
          <h2>🎉 อัพโหลดสำเร็จ!</h2>
          <p>ขอบคุณ <strong>{guestName}</strong> ที่ร่วมแชร์ความทรงจำในงาน "<strong>{project.name}</strong>"</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            อัพโหลดอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-upload-container">
      <div className="upload-card">
        <h2>📸 แชร์ความทรงจำ</h2>
        <div className="project-info">
          <span className="project-name">งาน: {project.name}</span>
          <span className="project-id">ID: {project.id}</span>
        </div>
        
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>ชื่อเล่น:</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="กรุณาใส่ชื่อเล่น"
              required
              disabled={uploading}
            />
          </div>
          
          <div className="form-group">
            <label>เลือกรูปภาพ หรือ วิดีโอ:</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="file-input"
              required
              disabled={uploading}
            />
          </div>

          {preview && (
            <div className="preview">
              <h4>ตัวอย่าง:</h4>
              {selectedFile.type.startsWith('image/') ? (
                <img src={preview} alt="Preview" />
              ) : (
                <video src={preview} controls />
              )}
              <p>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

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
