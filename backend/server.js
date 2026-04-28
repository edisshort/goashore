const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Cloudinary setup ─────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const JWT_SECRET = process.env.JWT_SECRET || 'goashore_secret_2024';

// ── Auth middleware ──────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Helper: check event ownership (supports both userId and legacy name match)
const isEventOwner = (event, reqUser) =>
  (event.createdByUserId && event.createdByUserId.toString() === reqUser.userId) ||
  (!event.createdByUserId && event.createdBy === reqUser.name);

const app = express();

// =====================
// CORS — restrict to your frontend origin
// =====================
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));

// =====================
// RATE LIMITING
// =====================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many upload requests, please try again later.' },
});

app.use('/api/', apiLimiter);

// =====================
// MIDDLEWARE
// =====================
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  abortOnLimit: true,
  useTempFiles: false,
}));

// =====================
// UPLOADS DIRECTORY
// =====================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// =====================
// MONGODB CONNECTION
// =====================
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goashore';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB error:', err.message));

// =====================
// SCHEMAS
// =====================
const beachSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: { type: String, enum: ['clean', 'dirty', 'help-needed'], default: 'clean' },
  description: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const cleanupEventSchema = new mongoose.Schema({
  beachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beach' },
  beachName: { type: String, trim: true },
  beachLat: Number,
  beachLng: Number,
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  volunteersNeeded: { type: Number, default: 5, min: 1 },
  volunteersJoined: { type: Number, default: 0, min: 0 },
  trashCollected: { type: Number, default: 0, min: 0 },
  beforePhotos: [String],  // stores /uploads/... URLs, not base64
  afterPhotos: [String],   // stores /uploads/... URLs, not base64
  feedback: { type: String, trim: true },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  createdBy:      { type: String, trim: true, default: 'Anonymous' },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  participants:   { type: [String], default: [] }, // names of users who joined
  createdAt: { type: Date, default: Date.now },
});

const statsSchema = new mongoose.Schema({
  totalTrashCollected: { type: Number, default: 0 },
  totalVolunteers: { type: Number, default: 0 },
  totalCleanups: { type: Number, default: 0 },
  totalBeaches: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Beach = mongoose.model('Beach', beachSchema);
const CleanupEvent = mongoose.model('CleanupEvent', cleanupEventSchema);
const Stats = mongoose.model('Stats', statsSchema);
const User = mongoose.model('User', userSchema);

// =====================
// HELPER: get or create the single Stats document
// =====================
const getStats = async () => {
  let stats = await Stats.findOne();
  if (!stats) {
    const beachCount = await Beach.countDocuments();
    stats = new Stats({ totalBeaches: beachCount });
    await stats.save();
  }
  return stats;
};

// =====================
// SEED DATA
// =====================
const seedBeaches = async () => {
  try {
    const beaches = [
      { name: 'Baga Beach', latitude: 15.5803, longitude: 73.8375, description: 'Popular beach near Calangute', status: 'clean' },
      { name: 'Calangute Beach', latitude: 15.5833, longitude: 73.8334, description: 'Famous sandy beach', status: 'clean' },
      { name: 'Anjuna Beach', latitude: 15.5656, longitude: 73.8081, description: 'Rocky beach with flea market', status: 'help-needed' },
      { name: 'Candolim Beach', latitude: 15.5146, longitude: 73.7658, description: 'Quiet beach near Fort Aguada', status: 'clean' },
      { name: 'Vagator Beach', latitude: 15.5977, longitude: 73.7433, description: 'Scenic beach with red cliffs', status: 'clean' },
      { name: 'Colva Beach', latitude: 15.3427, longitude: 73.8035, description: 'Long sandy beach', status: 'help-needed' },
      { name: 'Benaulim Beach', latitude: 15.3142, longitude: 73.8757, description: 'Peaceful South Goa beach', status: 'clean' },
      { name: 'Palolem Beach', latitude: 15.3008, longitude: 73.9461, description: 'Crescent shaped beach', status: 'clean' },
      { name: 'Agonda Beach', latitude: 15.0402, longitude: 74.0006, description: 'Serene and unspoilt beach', status: 'clean' },
      { name: 'Varca Beach', latitude: 15.2627, longitude: 73.9183, description: 'Clean white sand beach', status: 'clean' },
    ];
    // Upsert each beach so new entries are always added without duplicating existing ones
    for (const beach of beaches) {
      await Beach.findOneAndUpdate(
        { name: beach.name },
        { $setOnInsert: beach },
        { upsert: true, new: true }
      );
    }
    const stats = await getStats();
    stats.totalBeaches = await Beach.countDocuments();
    await stats.save();
    console.log('✅ Beaches seeded/verified');
  } catch (error) {
    console.log('ℹ️  Seed error:', error.message);
  }
};

setTimeout(seedBeaches, 1000);

// =====================
// ROUTE: FILE UPLOAD
// =====================
app.post('/api/upload', uploadLimiter, async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.photo;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only image files are allowed (jpg, png, webp, gif)' });
    }

    // Upload to Cloudinary from buffer (no temp file needed)
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'goashore',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.data);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// =====================
// ROUTES: AUTH
// =====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: hashed });
    const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// ROUTES: BEACHES
// =====================
app.get('/api/beaches', async (req, res) => {
  try {
    const beaches = await Beach.find().sort({ name: 1 });
    res.json(beaches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/beaches', async (req, res) => {
  try {
    const { name, latitude, longitude, description, status } = req.body;
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'name, latitude and longitude are required' });
    }

    let beach = await Beach.findOne({ name: name.trim() });
    if (beach) {
      if (status) beach.status = status;
      if (description) beach.description = description;
    } else {
      beach = new Beach({ name: name.trim(), latitude, longitude, description, status: status || 'clean' });
      const stats = await getStats();
      stats.totalBeaches += 1;
      await stats.save();
    }
    await beach.save();
    res.json(beach);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// ROUTES: CLEANUP EVENTS
// =====================
app.get('/api/cleanup-events', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // Optional beach filter
    const query = {};
    if (req.query.beachId && mongoose.Types.ObjectId.isValid(req.query.beachId)) {
      query.beachId = req.query.beachId;
    }

    const total = await CleanupEvent.countDocuments(query);
    const events = await CleanupEvent.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ events, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cleanup-events/:eventId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    const event = await CleanupEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cleanup-events', authenticateToken, async (req, res) => {
  try {
    const { beachId, beachName, beachLat, beachLng, title, description, date, time, volunteersNeeded, beforePhotos } = req.body;

    if (!beachId || !title || !date || !time) {
      return res.status(400).json({ error: 'beachId, title, date and time are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(beachId)) {
      return res.status(400).json({ error: 'Invalid beach ID' });
    }

    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Organizer info always comes from the verified JWT token
    const createdBy = req.user.name;
    const createdByUserId = req.user.userId;

    const event = new CleanupEvent({
      beachId,
      beachName: beachName?.trim(),
      beachLat,
      beachLng,
      title: title.trim(),
      description: description?.trim(),
      date: eventDate,
      time,
      volunteersNeeded: Math.max(1, parseInt(volunteersNeeded) || 5),
      createdBy,
      createdByUserId,
      participants: [createdBy], // organizer is first participant
      beforePhotos: Array.isArray(beforePhotos) ? beforePhotos : [],
    });

    await event.save();
    await Beach.findByIdAndUpdate(beachId, { status: 'help-needed' });
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cleanup-events/:eventId/complete', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Fetch the event first to check ownership
    const existing = await CleanupEvent.findById(req.params.eventId);
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (existing.status !== 'scheduled') return res.status(400).json({ error: 'Event already completed or cancelled' });
    if (!isEventOwner(existing, req.user)) {
      return res.status(403).json({ error: 'Only the event organizer can mark it as complete' });
    }

    const { trashCollected, feedback, afterPhotos } = req.body;
    const trash = Math.max(0, parseFloat(trashCollected) || 0);
    // volunteersJoined = number of registered participants (auto-calculated)
    const volunteers = existing.participants.length;

    const event = await CleanupEvent.findByIdAndUpdate(
      req.params.eventId,
      {
        status: 'completed',
        volunteersJoined: volunteers,
        trashCollected: trash,
        feedback: feedback?.trim() || '',
        afterPhotos: Array.isArray(afterPhotos) ? afterPhotos : [],
      },
      { new: true }
    );

    // Reset beach status to clean after a successful cleanup
    await Beach.findByIdAndUpdate(event.beachId, { status: 'clean' });

    // Update cumulative stats
    const stats = await getStats();
    stats.totalTrashCollected += trash;
    stats.totalVolunteers += volunteers;
    stats.totalCleanups += 1;
    await stats.save();

    res.json(event);
  } catch (error) {
    console.error('Error completing event:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/cleanup-events/:eventId/cancel', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await CleanupEvent.findOneAndUpdate(
      { _id: req.params.eventId, status: 'scheduled' },
      { status: 'cancelled' },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found or not in scheduled status' });
    }

    // Revert beach to clean only if no other scheduled events for this beach
    const otherScheduled = await CleanupEvent.findOne({
      beachId: event.beachId,
      status: 'scheduled',
    });
    if (!otherScheduled) {
      await Beach.findByIdAndUpdate(event.beachId, { status: 'clean' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error cancelling event:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// ROUTE: DELETE EVENT
// =====================
app.delete('/api/cleanup-events/:eventId', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await CleanupEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!isEventOwner(event, req.user)) {
      return res.status(403).json({ error: 'Only the event organizer can delete this event' });
    }

    await CleanupEvent.findByIdAndDelete(req.params.eventId);

    // Revert beach status to clean if no other scheduled events remain
    const otherScheduled = await CleanupEvent.findOne({
      beachId: event.beachId,
      status: 'scheduled',
    });
    if (!otherScheduled) {
      await Beach.findByIdAndUpdate(event.beachId, { status: 'clean' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// ROUTE: JOIN EVENT
// =====================
app.post('/api/cleanup-events/:eventId/join', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await CleanupEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'scheduled') {
      return res.status(400).json({ error: 'Can only join upcoming events' });
    }

    const userName = req.user.name;

    if (event.participants.includes(userName)) {
      return res.status(400).json({ error: 'You have already joined this event' });
    }

    event.participants.push(userName);
    event.volunteersJoined = event.participants.length;
    await event.save();

    res.json(event);
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// ROUTE: LEAVE EVENT
// =====================
app.post('/api/cleanup-events/:eventId/leave', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await CleanupEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'scheduled') {
      return res.status(400).json({ error: 'Can only leave upcoming events' });
    }

    const userName = req.user.name;
    if (event.createdBy === userName) {
      return res.status(400).json({ error: 'Organizers cannot leave their own event' });
    }

    event.participants = event.participants.filter(p => p !== userName);
    event.volunteersJoined = event.participants.length;
    await event.save();

    res.json(event);
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// ROUTE: LEADERBOARD
// =====================
app.get('/api/leaderboard', async (req, res) => {
  try {
    const top = await CleanupEvent.aggregate([
      { $match: { status: 'completed', 'participants.0': { $exists: true } } },
      { $unwind: '$participants' },
      {
        $group: {
          _id: '$participants',
          events: { $sum: 1 },
          totalTrash: { $sum: '$trashCollected' },
        },
      },
      { $sort: { events: -1, totalTrash: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          username: '$_id',
          events: 1,
          totalTrash: 1,
        },
      },
    ]);

    // Fallback for legacy events without participants array
    if (top.length === 0) {
      const fallback = await CleanupEvent.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$createdBy', events: { $sum: 1 }, totalTrash: { $sum: '$trashCollected' } } },
        { $sort: { events: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, username: '$_id', events: 1, totalTrash: 1 } },
      ]);
      return res.json(fallback);
    }

    res.json(top);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// ROUTES: STATS
// =====================
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    stats.totalBeaches = await Beach.countDocuments();
    await stats.save();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// HEALTH CHECK
// =====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend running!' });
});

// =====================
// GLOBAL ERROR HANDLER
// =====================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('GoaShore Backend running on http://localhost:' + PORT);
});
