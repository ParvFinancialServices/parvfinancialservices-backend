import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parv-finance', {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in newer versions of Mongoose
      // but kept for compatibility
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

