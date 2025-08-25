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
  console.error('❌ Cloudinary configuration is missing!');
  process.exit(1);
}

// CORS Middleware
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
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
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
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  qrCode: { type: String, required: true },
  mediaFiles: [{
    guestName: String,
    type: String,
    cloudinaryUrl: String,
    cloudinaryPublicId: String,
  }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);

// Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'event-media-collector',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'mov'],
    resource_type: 'auto',
  }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Root Route
app.get('/', (req, res) => res.json({ message: '🚀 Event Media Collector API is live!' }));

// 🔥 สร้าง API Router - บรรทัดสำคัญที่หายไป!
const apiRouter = express.Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Event Media Collector API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing'
  });
});

// Auth Routes
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัคร' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

apiRouter.get('/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบ token' });
  }
});

// Project Routes
apiRouter.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'กรุณาใส่ชื่อโปรเจ็กต์' });
    
    const projectId = uuidv4();
    const qrData = `https://event-media-frontend.onrender.com/guest/${projectId}`;
    const qrCode = await QRCode.toDataURL(qrData, { width: 400, margin: 2 });
    
    const project = new Project({ id: projectId, name, userId: req.user.userId, qrCode });
    await project.save();
    
    console.log(`✅ Created project: ${name} (${projectId})`);
    res.status(201).json(project);
  } catch (error) {
    console.error('❌ Create project error:', error);
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
    if (!latestProject) return res.status(404).json({ error: 'ยังไม่มีโปรเจ็กต์ที่สร้างไว้' });
    
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

apiRouter.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Looking for project ID: ${id}`);
    
    const project = await Project.findOne({ id: id });
    
    if (!project) {
      console.log(`❌ Project not found: ${id}`);
      return res.status(404).json({ 
        error: 'ไม่พบโปรเจ็กต์',
        projectId: id,
        message: 'โปรเจ็กต์นี้อาจถูกลบหรือไม่มีอยู่จริง'
      });
    }
    
    console.log(`✅ Project found: ${project.name} (${project.id})`);
    res.json(project);
  } catch (error) {
    console.error('❌ Get project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาโปรเจ็กต์' });
  }
});

// DELETE Route สำหรับลบโปรเจ็กต์
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

// Media Upload Route
apiRouter.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const { projectId, guestName } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'ไม่มีไฟล์' });
    if (!guestName?.trim()) return res.status(400).json({ error: 'กรุณาใส่ชื่อ' });

    const project = await Project.findOne({ id: projectId });
    if (!project) return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์' });

    const mediaFile = {
      guestName: guestName.trim(),
      type: file.mimetype.startsWith('image/') ? 'image' : 'video',
      cloudinaryUrl: file.path,
      cloudinaryPublicId: file.public_id,
    };

    project.mediaFiles.push(mediaFile);
    await project.save();

    console.log(`✅ Upload success: ${file.originalname} to project ${projectId}`);
    res.json({ success: true, message: 'อัพโหลดสำเร็จ!' });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพโหลด' });
  }
});

// 🔥 ใช้ API Router - บรรทัดสำคัญที่ต้องมี!
app.use('/api', apiRouter);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found. Visit / for API info.' });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({ 
    error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌍 Frontend URL: https://event-media-frontend.onrender.com`);
  console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
});
