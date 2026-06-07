const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn('MongoDB connection error:', error.message);
    console.warn('Server running without database. Database features will not work.');
  }
};

module.exports = connectDB;
