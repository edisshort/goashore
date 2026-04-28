// One-time script to add missing beaches to MongoDB
// Run with: node add-beaches.js

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://harshsolanki2203_db_user:jPZTFs9S5uziZ3dD@cluster0.yg3ns7w.mongodb.net/?appName=Cluster0';

const beachSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['clean', 'help-needed', 'dirty'], default: 'clean' },
});

const Beach = mongoose.model('Beach', beachSchema);

const beaches = [
  { name: 'Baga Beach',      latitude: 15.5803, longitude: 73.8375, description: 'Popular beach near Calangute',   status: 'clean' },
  { name: 'Calangute Beach', latitude: 15.5833, longitude: 73.8334, description: 'Famous sandy beach',              status: 'clean' },
  { name: 'Anjuna Beach',    latitude: 15.5656, longitude: 73.8081, description: 'Rocky beach with flea market',    status: 'help-needed' },
  { name: 'Candolim Beach',  latitude: 15.5146, longitude: 73.7658, description: 'Quiet beach near Fort Aguada',    status: 'clean' },
  { name: 'Vagator Beach',   latitude: 15.5977, longitude: 73.7433, description: 'Scenic beach with red cliffs',    status: 'clean' },
  { name: 'Colva Beach',     latitude: 15.3427, longitude: 73.8035, description: 'Long sandy beach',                status: 'help-needed' },
  { name: 'Benaulim Beach',  latitude: 15.3142, longitude: 73.8757, description: 'Peaceful South Goa beach',        status: 'clean' },
  { name: 'Palolem Beach',   latitude: 15.3008, longitude: 73.9461, description: 'Crescent shaped beach',           status: 'clean' },
  { name: 'Agonda Beach',    latitude: 15.0402, longitude: 74.0006, description: 'Serene and unspoilt beach',       status: 'clean' },
  { name: 'Varca Beach',     latitude: 15.2627, longitude: 73.9183, description: 'Clean white sand beach',          status: 'clean' },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  let added = 0;
  for (const beach of beaches) {
    const existing = await Beach.findOne({ name: beach.name });
    if (!existing) {
      await Beach.create(beach);
      console.log(`  ➕ Added: ${beach.name}`);
      added++;
    } else {
      console.log(`  ✓  Already exists: ${beach.name}`);
    }
  }

  console.log(`\nDone! ${added} new beach(es) added.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
