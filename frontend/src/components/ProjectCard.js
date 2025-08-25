import React from 'react';
import './ProjectCard.css';

const ProjectCard = ({ project, onCompile, onDelete }) => {
  const downloadQR = () => {
    try {
      const link = document.createElement('a');
      link.href = project.qrCode;
      link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('ไม่สามารถดาวน์โหลด QR Code ได้');
    }
  };

  const copyQRLink = async () => {
    try {
      const qrLink = `${window.location.origin}/guest/${project.id}`;
      await navigator.clipboard.writeText(qrLink);
      alert('คัดลอกลิงก์เรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Error copying link:', error);
      alert('ไม่สามารถคัดลอกลิงก์ได้');
    }
  };

  const handleDelete = () => {
    onDelete(project.id, project.name);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const imageCount = project.mediaFiles?.filter(f => f.type === 'image').length || 0;
  const videoCount = project.mediaFiles?.filter(f => f.type === 'video').length || 0;
  const totalFiles = project.mediaFiles?.length || 0;

  return (
    <div className="project-card">
      <div className="project-header">
        <h3 title={project.name}>{project.name}</h3>
        <div className="project-header-actions">
          <span className="media-count">{totalFiles} ไฟล์</span>
          <button 
            className="btn btn-danger btn-delete"
            onClick={handleDelete}
            title="ลบโปรเจ็กต์"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="project-meta">
        <span className="create-date">
          สร้างเมื่อ: {formatDate(project.createdAt)}
        </span>
      </div>

      <div className="qr-section">
        <img 
          src={project.qrCode} 
          alt={`QR Code สำหรับ ${project.name}`}
          className="qr-image" 
        />
        <div className="qr-actions">
          <button onClick={downloadQR} className="btn btn-small">
            📥 ดาวน์โหลด
          </button>
          <button onClick={copyQRLink} className="btn btn-small">
            🔗 คัดลอกลิงก์
          </button>
        </div>
      </div>
      
      <div className="project-stats">
        <div className="stat">
          <span className="stat-icon">🖼️</span>
          <div className="stat-info">
            <span className="stat-label">รูปภาพ</span>
            <span className="stat-value">{imageCount}</span>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon">🎬</span>
          <div className="stat-info">
            <span className="stat-label">วิดีโอ</span>
            <span className="stat-value">{videoCount}</span>
          </div>
        </div>
      </div>
      
      <div className="project-actions">
        <button 
          className="btn btn-primary compile-btn"
          onClick={() => onCompile(project.id)}
          disabled={totalFiles === 0}
          title={totalFiles === 0 ? 'ต้องมีไฟล์อย่างน้อย 1 ไฟล์' : 'สร้างคลิปสรุปงาน'}
        >
          {totalFiles === 0 ? '📂 ไม่มีไฟล์' : '🎬 สรุปงาน'}
        </button>
        
        {project.finalVideo && (
          <a 
            href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/${project.finalVideo}`}
            download
            className="btn btn-success"
          >
            📹 ดาวน์โหลดคลิปสรุป
          </a>
        )}

        <div className="project-link">
          <small>
            ID: <code>{project.id.substring(0, 8)}...</code>
          </small>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
