// แก้ไขส่วน latest project
apiRouter.get('/projects/latest', async (req, res) => {
  try {
    const latestProject = await Project.findOne().sort({ createdAt: -1 });
    if (!latestProject) {
      return res.status(404).json({ error: 'ยังไม่มีโปรเจ็กต์ที่สร้างไว้' });
    }
    
    console.log(`✅ Latest project found: ${latestProject.name} (${latestProject.id})`);
    res.json({ 
      id: latestProject.id, 
      name: latestProject.name,
      createdAt: latestProject.createdAt
    });
  } catch (error) {
    console.error('❌ Get latest project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาโปรเจ็กต์ล่าสุด' });
  }
});

// เพิ่ม DELETE API สำหรับลบโปรเจ็กต์
apiRouter.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Attempting to delete project: ${id} by user: ${req.user.userId}`);
    
    const deletedProject = await Project.findOneAndDelete({ 
      id: id, 
      userId: req.user.userId 
    });
    
    if (!deletedProject) {
      console.log(`❌ Project not found or unauthorized: ${id}`);
      return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์หรือไม่มีสิทธิ์ลบ' });
    }
    
    console.log(`✅ Project deleted successfully: ${deletedProject.name} (${id})`);
    res.json({ 
      success: true,
      message: 'ลบโปรเจ็กต์สำเร็จ',
      deletedProject: {
        id: deletedProject.id,
        name: deletedProject.name
      }
    });
  } catch (error) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบโปรเจ็กต์' });
  }
});
