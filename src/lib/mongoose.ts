import mongoose from 'mongoose';

interface MongooseConnection {
  isConnected: boolean;
}

const connection: MongooseConnection = {
  isConnected: false
};

export async function connectToMongoDB(): Promise<boolean> {
  if (connection.isConnected) {
    return true;
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set');
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB with Mongoose...');
    
    // Parse MONGODB_URI to ensure consistent database name 'telegram-bot'
    const mongoUri = process.env.MONGODB_URI;
    let finalUri = mongoUri;
    
    // Extract base URI without database name and add 'telegram-bot'
    if (mongoUri.includes('mongodb.net/')) {
      // Remove existing database name and query params, then add telegram-bot
      const baseUri = mongoUri.split('mongodb.net/')[0] + 'mongodb.net/';
      const queryParams = mongoUri.includes('?') ? '?' + mongoUri.split('?')[1] : '';
      finalUri = baseUri + 'telegram-bot' + queryParams;
    }
    
    console.log('🔄 Using database: telegram-bot');
    
    await mongoose.connect(finalUri, {
      // Connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    connection.isConnected = true;
    console.log('✅ Connected to MongoDB with Mongoose');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      connection.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      connection.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      connection.isConnected = true;
    });

    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    connection.isConnected = false;
    return false;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (!connection.isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    connection.isConnected = false;
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
}

export function isMongoDBConnected(): boolean {
  return connection.isConnected && mongoose.connection.readyState === 1;
}

// Auto-connect when module is imported
connectToMongoDB().catch(console.error);
