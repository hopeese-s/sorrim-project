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

// API Router
const apiRouter = express.Router();

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

// Project Routes
apiRouter.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'กรุณาใส่ชื่อโปรเจ็กต์' });
    }
    
    const projectId = uuidv4();
    console.log(`🆔 Creating project with ID: ${projectId}`); // Debug log
    
    // ใช้ URL ที่ถูกต้อง
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://event-media-frontend.onrender.com' 
      : 'http://localhost:3000';
    
    const qrData = `${frontendUrl}/guest/${projectId}`;
    console.log(`🔗 QR Code URL: ${qrData}`); // Debug log
    
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    const project = new Project({
      id: projectId,
      name: name.trim(),
      userId: req.user.userId,
      qrCode,
      mediaFiles: []
    });
    
    // รอให้บันทึกเสร็จสมบูรณ์
    await project.save();
    console.log(`✅ Project saved successfully: ${project.name} (${project.id})`); // Debug log
    
    // ตรวจสอบว่าบันทึกจริงหรือไม่
    const savedProject = await Project.findOne({ id: projectId });
    if (!savedProject) {
      throw new Error('Failed to save project to database');
    }
    
    res.status(201).json(savedProject);
  } catch (error) {
    console.error('❌ Create project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างโปรเจ็กต์' });
  }
});

// แก้ไขการค้นหาโปรเจ็กต์
apiRouter.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Looking for project ID: ${id}`); // Debug log
    
    const project = await Project.findOne({ id: id });
    
    if (!project) {
      console.log(`❌ Project not found: ${id}`); // Debug log
      return res.status(404).json({ 
        error: 'ไม่พบโปรเจ็กต์',
        projectId: id,
        message: 'โปรเจ็กต์นี้อาจถูกลบหรือไม่มีอยู่จริง'
      });
    }
    
    console.log(`✅ Project found: ${project.name} (${project.id})`); // Debug log
    res.json(project);
  } catch (error) {
    console.error('❌ Get project error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาโปรเจ็กต์' });
  }
});

apiRouter.get('/projects', authenticateToken, async (req, res) => {
  const projects = await Project.find({ userId: req.user.userId }).sort({ createdAt: -1 });
  res.json(projects);
});

apiRouter.get('/projects/latest', async (req, res) => {
  const latestProject = await Project.findOne().sort({ createdAt: -1 });
  if (!latestProject) return res.status(404).json({ error: 'ยังไม่มีโปรเจ็กต์ที่สร้างไว้' });
  res.json({ id: latestProject.id, name: latestProject.name });
});

apiRouter.get('/projects/:id', async (req, res) => {
  const project = await Project.findOne({ id: req.params.id });
  if (!project) return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์' });
  res.json(project);
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

    res.json({ success: true, message: 'อัพโหลดสำเร็จ!' });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพโหลด' });
  }
});

apiRouter.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Attempting to delete project: ${id} by user: ${req.user.userId}`);
    
    // ลบเฉพาะโปรเจ็กต์ของ user นี้เท่านั้น
    const deletedProject = await Project.findOneAndDelete({ 
      id: id, 
      userId: req.user.userId 
    });
    
    if (!deletedProject) {
      console.log(`❌ Project not found or not owned by user: ${id}`);
      return res.status(404).json({ error: 'ไม่พบโปรเจ็กต์หรือคุณไม่มีสิทธิ์ลบ' });
    }
    
    // ลบไฟล์ใน Cloudinary ด้วย (ถ้ามี)
    if (deletedProject.mediaFiles && deletedProject.mediaFiles.length > 0) {
      try {
        for (const media of deletedProject.mediaFiles) {
          if (media.cloudinaryPublicId) {
            await cloudinary.uploader.destroy(media.cloudinaryPublicId);
          }
        }
        console.log(`🗑️ Cleaned up ${deletedProject.mediaFiles.length} media files from Cloudinary`);
      } catch (cloudinaryError) {
        console.error('Error cleaning up Cloudinary files:', cloudinaryError);
        // ไม่ให้ error นี้หยุดการลบ project
      }
    }
    
    console.log(`✅ Project deleted successfully: ${deletedProject.name} (${id})`);
    res.json({ 
      success: true, 
      message: 'ลบโปรเจ็กต์เรียบร้อยแล้ว',
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

app.use('/api', apiRouter);

app.listen(PORT, () => console.log(`🚀 Backend API running on port ${PORT}`));


