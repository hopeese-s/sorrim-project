const express = require('express');
const cors = require('cors');
const multer = require('multer');
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

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error('❌ Cloudinary configuration missing!');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://event-media-frontend.onrender.com'
  ],
  credentials: true
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
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

// Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'event-media',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'mov'],
    resource_type: 'auto',
    transformation: [{ quality: 'auto:good', fetch_format: 'auto' }]
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// 🚀 ROOT ROUTE - API Info เท่านั้น
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Event Media Collector - Backend API',
    version: '1.0.0',
    status: 'running',
    services: {
      frontend: 'https://event-media-frontend.onrender.com',
      backend: 'https://sorrim-project-backend.onrender.com'
    },
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login'
    }
  });
});

// API Routes
const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Event Media Collector API',
    timestamp: new Date().toISOString()
  });
});

// Auth Routes
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
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
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

apiRouter.get('/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบ token' });
  }
});

// Project Routes
apiRouter.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'กรุณาใส่ชื่อโปรเจ็กต์' });
    }
    
    const projectId = uuidv4();
    const qrData = `https://event-media-frontend.onrender.com/guest/${projectId}`;
    
    const qrCode = await QRCode.toDataURL(qrData, { width: 400, margin: 3 });
    
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
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างโปรเจ็กต์' });
  }
});

apiRouter.get('/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจ็กต์' });
  }
});

apiRouter.get('/projects/latest', async (req, res) => {
  try {
    const latestProject = await Project.findOne().sort({ createdAt: -1 });
    if (!latestProject) {
      return res.status(404).json({ error: 'ยังไม่มีโปรเจ็กต์ที่สร้างไว้' });
    }
    res.json({ id: latestProject.id, name: latestProject.name });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจ็กต์ล่าสุด' });
  }
});

apiRouter.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจ็กต์' });
  }
});

// Media Upload
apiRouter.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const { projectId, guestName } = req.body;
    const file = req.file;
    
    if (!file) return res.status(400).json({ error: 'ไม่มีไฟล์ที่อัพโหลด' });
    if (!guestName?.trim()) return res.status(400).json({ error: 'กรุณาใส่ชื่อ' });
    
    const project = await Project.findOne({ id: projectId });
    if (!project) return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์' });
    
    const mediaFile = {
      filename: file.filename || file.originalname,
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
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์' });
  }
});

app.use('/api', apiRouter);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found. Visit / for API info.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
});
