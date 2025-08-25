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
  const [error, setError] = useState('');

  useEffect(() => {
  const fetchProject = async () => {
    try {
      console.log(`🔍 Fetching project: ${projectId}`); // Debug log
      
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ไม่พบโปรเจ็กต์');
      }
      
      const data = await response.json();
      console.log(`✅ Project loaded:`, data); // Debug log
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
      if (file.type.startsWith('video/') && file.size > 100 * 1024 * 1024) {
        alert('ขนาดไฟล์วิดีโอใหญ่เกิน 100MB');
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !guestName.trim()) {
      alert('กรุณาใส่ชื่อและเลือกไฟล์');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('media', selectedFile);
    formData.append('projectId', projectId);
    formData.append('guestName', guestName);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการอัพโหลด');
      }

      setUploadSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  
  if (!project) {
    return <div className="loading"><div className="loading-spinner"></div><p>กำลังโหลด...</p></div>;
  }

 if (project?.error) {
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

  return (
    <div className="guest-upload-container">
      <div className="upload-card">
        <h2>📸 แชร์ความทรงจำ</h2>
        <p className="project-name">งาน: {project.name}</p>
        
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>ชื่อเล่น:</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="กรุณาใส่ชื่อเล่น"
              required
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
            />
          </div>

          {preview && (
            <div className="preview">
              {selectedFile.type.startsWith('image/') ? (
                <img src={preview} alt="Preview" />
              ) : (
                <video src={preview} controls />
              )}
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


