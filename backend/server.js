const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventmedia', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Models
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  userId: { type: String, required: true },
  qrCode: { type: String, required: true },
  mediaFiles: [{
    filename: String,
    originalName: String,
    guestName: String,
    type: String,
    cloudinaryUrl: String,
    cloudinaryPublicId: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  finalVideo: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);

// Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'event-media',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'mov'],
    resource_type: 'auto',
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'auto'
      }
    ]
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 100 * 1024 * 1024,  // 100MB
    fieldSize: 50 * 1024 * 1024   // 50MB for field data
  }
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email,
      password: hashedPassword,
      name
    });
    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name 
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// Verify token route
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name 
      } 
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบ token' });
  }
});

// Project Routes
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'กรุณาใส่ชื่อโปรเจ็กต์' });
    }
    
    const projectId = uuidv4();
    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest/${projectId}`;
    
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    const project = new Project({
      id: projectId,
      name: name.trim(),
      userId: req.user.userId,
      qrCode,
      mediaFiles: []
    });
    
    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างโปรเจ็กต์' });
  }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจ็กต์' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์' });
    }
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจ็กต์' });
  }
});

// Get latest public project for guest access
app.get('/api/projects/latest', async (req, res) => {
  try {
    const latestProject = await Project.findOne()
      .sort({ createdAt: -1 });
    
    if (!latestProject) {
      return res.status(404).json({ error: 'ยังไม่มีโปรเจ็กต์ที่สร้างไว้' });
    }
    
    res.json({
      id: latestProject.id,
      name: latestProject.name,
      createdAt: latestProject.createdAt
    });
  } catch (error) {
    console.error('Get latest project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจ็กต์ล่าสุด' });
  }
});

// Media Upload Route
app.post('/api/upload', upload.single('media'), async (req, res) => {
  try {
    const { projectId, guestName } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'ไม่มีไฟล์ที่อัพโหลด' });
    }
    
    if (!guestName || !guestName.trim()) {
      return res.status(400).json({ error: 'กรุณาใส่ชื่อ' });
    }
    
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์' });
    }
    
    const mediaFile = {
      filename: file.filename,
      originalName: file.originalname,
      guestName: guestName.trim(),
      type: file.mimetype.startsWith('image/') ? 'image' : 'video',
      cloudinaryUrl: file.path,
      cloudinaryPublicId: file.public_id
    };
    
    project.mediaFiles.push(mediaFile);
    await project.save();
    
    res.json({ success: true, file: mediaFile });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์' });
  }
});

// Video Compilation Route
app.post('/api/projects/:id/compile', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({ 
      id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!project) {
      return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์' });
    }

    if (project.mediaFiles.length === 0) {
      return res.status(400).json({ error: 'ไม่มีไฟล์สื่อให้รวม' });
    }

    // For now, just mark as compiled
    project.finalVideo = `${project.id}/compiled.mp4`;
    await project.save();
    
    res.json({ 
      success: true, 
      message: 'เริ่มการประมวลผลคลิปแล้ว กรุณารอสักครู่...' 
    });
  } catch (error) {
    console.error('Compile error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการรวมคลิป' });
  }
});

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
