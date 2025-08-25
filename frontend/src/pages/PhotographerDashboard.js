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
        console.log('✅ Projects loaded:', data.length, 'projects');
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
    
    try {
      console.log('📝 Creating project:', newProjectName);
      
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
        console.log('✅ Project created:', newProject);
        setProjects([newProject, ...projects]);
        setNewProjectName('');
        setShowNewProjectModal(false);
        alert(`สร้างโปรเจ็กต์ "${newProject.name}" สำเร็จ!`);
      } else {
        const errorData = await response.json();
        console.error('❌ Create project error:', errorData);
        alert(errorData.error || 'เกิดข้อผิดพลาดในการสร้างโปรเจ็กต์');
      }
    } catch (error) {
      console.error('❌ Create project error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
    setLoading(false);
  };

  // ✅ ฟังก์ชัน deleteProject ที่ถูกต้อง
  const deleteProject = async (projectId, projectName) => {
    console.log('🗑️ Delete project called:', projectId, projectName);
    
    const confirmDelete = window.confirm(
      `คุณแน่ใจหรือไม่ที่จะลบโปรเจ็กต์ "${projectName}"?\n\n⚠️ การลบจะไม่สามารถยกเลิกได้ และไฟล์ทั้งหมดในโปรเจ็กต์จะหายไปด้วย`
    );
    
    if (!confirmDelete) {
      console.log('❌ User cancelled deletion');
      return;
    }

    try {
      console.log('🗑️ Deleting project:', projectId);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Delete success:', result);
        
        // อัพเดท state ทันทีเพื่อให้ UI เปลี่ยนแปลงทันที
        setProjects(prevProjects => {
          const newProjects = prevProjects.filter(p => p.id !== projectId);
          console.log('Updated projects count:', newProjects.length);
          return newProjects;
        });
        
        alert(`ลบโปรเจ็กต์ "${projectName}" สำเร็จแล้ว`);
      } else {
        const errorData = await response.json();
        console.error('❌ Delete error:', errorData);
        alert(errorData.error || 'เกิดข้อผิดพลาดในการลบโปรเจ็กต์');
      }
    } catch (error) {
      console.error('❌ Delete project error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const compileVideo = async (projectId) => {
    try {
      console.log('🎬 Compiling video for project:', projectId);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/compile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Compile success:', result);
        alert('เริ่มการประมวลผลคลิปแล้ว!');
        fetchProjects(); // Refresh projects
      } else {
        const errorData = await response.json();
        console.error('❌ Compile error:', errorData);
        alert(errorData.error || 'เกิดข้อผิดพลาดในการรวมคลิป');
      }
    } catch (error) {
      console.error('❌ Compile video error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleLogout = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะออกจากระบบ?')) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
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
        <div className="header-left">
          <h1>📸 Photographer Dashboard</h1>
          <p>จัดการโปรเจ็กต์และรวบรวมไฟล์สื่อ</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary new-project-btn"
            onClick={() => setShowNewProjectModal(true)}
          >
            ➕ New Project
          </button>
          <div className="user-info">
            <span>สวัสดี, <strong>{user?.name || 'User'}</strong></span>
            <button 
              className="btn btn-secondary logout-btn"
              onClick={handleLogout}
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {projects.length > 0 ? (
          <div className="projects-grid">
            {projects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onCompile={compileVideo}
                onDelete={deleteProject}  // ✅ ส่ง deleteProject ที่ประกาศแล้ว
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h3>ยังไม่มีโปรเจ็กต์</h3>
            <p>กดปุ่ม "➕ New Project" เพื่อสร้างโปรเจ็กต์แรกของคุณ</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowNewProjectModal(true)}
            >
              สร้างโปรเจ็กต์แรก
            </button>
          </div>
        )}
      </div>

      {showNewProjectModal && (
        <div 
          className="modal-overlay" 
          onClick={() => !loading && setShowNewProjectModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✨ สร้างโปรเจ็กต์ใหม่</h3>
              <button 
                className="modal-close"
                onClick={() => setShowNewProjectModal(false)}
                disabled={loading}
              >
                ❌
              </button>
            </div>
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
                <small>สามารถใส่ได้สูงสุด 50 ตัวอักษร</small>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-cancel"
                  onClick={() => setShowNewProjectModal(false)}
                  disabled={loading}
                >
                  ❌ ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-create ${loading ? 'btn-loading' : ''}`}
                  disabled={loading || !newProjectName.trim()}
                >
                  {loading ? '⏳ กำลังสร้าง...' : '✅ สร้าง'}
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
