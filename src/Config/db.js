


import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error("❌ Error: MONGO_URI not found in environment variables");
      process.exit(1);
    }

    console.log("🔄 Attempting to connect to MongoDB Atlas...");

    const conn = await mongoose.connect(mongoUri, {
      // Connection options for better reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    
    // Provide specific troubleshooting guidance
    if (error.message.includes('ENOTFOUND') || error.message.includes('could not connect to any servers')) {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check if your IP (175.157.163.135) is whitelisted in MongoDB Atlas');
      console.log('2. Verify your MongoDB Atlas cluster is running');
      console.log('3. Check your network connection');
      console.log('4. Verify the MONGO_URI in your .env file is correct');
      console.log('\n📋 MongoDB Atlas Whitelist Instructions:');
      console.log('   1. Go to https://cloud.mongodb.com/');
      console.log('   2. Navigate to your cluster (divineshajeeth123.th8xyvn)');
      console.log('   3. Go to Network Access → IP Access List');
      console.log('   4. Add IP: 175.157.163.135');
      console.log('   5. For development, you can also add 0.0.0.0/0');
    }
    
    process.exit(1);
  }
};

export default connectDB;
