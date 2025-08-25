import React, { useState, useEffect } from 'react';
import ProjectCard from '../components/ProjectCard';
import './PhotographerDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PhotographerDashboard = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setPageLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setLoading(true);
    
    // Add delay for smoother animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName })
      });
      
      if (response.ok) {
        const newProject = await response.json();
        setProjects([newProject, ...projects]);
        setNewProjectName('');
        setShowNewProjectModal(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'เกิดข้อผิดพลาดในการสร้างโปรเจ็กต์');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
    setLoading(false);
  };

  const compileVideo = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/compile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('เริ่มการประมวลผลคลิปแล้ว!');
        fetchProjects(); // Refresh projects
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'เกิดข้อผิดพลาดในการรวมคลิป');
      }
    } catch (error) {
      console.error('Error compiling video:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  if (pageLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Photographer Dashboard</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowNewProjectModal(true)}
          >
            + New Project
          </button>
          <div className="user-info">
            <span>สวัสดี, {user?.name || 'User'}</span>
            <button 
              className="btn btn-secondary"
              onClick={handleLogout}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="projects-grid">
        {projects.length > 0 ? (
          projects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onCompile={compileVideo}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h3>ยังไม่มีโปรเจ็กต์</h3>
            <p>กดปุ่ม "+ New Project" เพื่อสร้างโปรเจ็กต์แรกของคุณ</p>
          </div>
        )}
      </div>

      {showNewProjectModal && (
        <div 
          className="modal-overlay" 
          onClick={() => !loading && setShowNewProjectModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>สร้างโปรเจ็กต์ใหม่</h3>
            <form onSubmit={createProject}>
              <div className="form-group">
                <label>ชื่อโปรเจ็กต์:</label>
                <input
                  type="text"
                  placeholder="เช่น งานแต่งงาน, งานวันเกิด, งานบริษัท..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  maxLength={50}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-cancel"
                  onClick={() => setShowNewProjectModal(false)}
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-create ${loading ? 'btn-loading' : ''}`}
                  disabled={loading || !newProjectName.trim()}
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้าง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotographerDashboard;
