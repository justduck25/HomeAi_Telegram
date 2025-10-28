import { MongoClient, Db, Collection } from 'mongodb';

// Types
export interface User {
  _id?: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user';
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  preferences: {
    dailyWeather: boolean;
    weatherTime?: string; // HH:mm format
    timezone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}

export interface ChatMemory {
  _id?: string;
  telegramId: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Database connection
let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('telegram-bot');
    
    // Create indexes
    await createIndexes();
    
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

async function createIndexes() {
  if (!db) return;

  const users = db.collection('users');
  const memories = db.collection('memories');

  // Create unique index on telegramId for users
  await users.createIndex({ telegramId: 1 }, { unique: true });
  
  // Create index on telegramId for memories
  await memories.createIndex({ telegramId: 1 });
  
  // Create index on updatedAt for cleanup
  await memories.createIndex({ updatedAt: 1 });
}

// User operations
export async function getUserCollection(): Promise<Collection<User>> {
  const database = await connectToDatabase();
  return database.collection<User>('users');
}

export async function getMemoryCollection(): Promise<Collection<ChatMemory>> {
  const database = await connectToDatabase();
  return database.collection<ChatMemory>('memories');
}

// User CRUD operations
export async function createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'lastActive'>): Promise<User> {
  const users = await getUserCollection();
  
  const user: User = {
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActive: new Date(),
  };

  const result = await users.insertOne(user);
  return { ...user, _id: result.insertedId.toString() };
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const users = await getUserCollection();
  return await users.findOne({ telegramId });
}

export async function updateUser(telegramId: number, updates: Partial<User>): Promise<User | null> {
  const users = await getUserCollection();
  
  const result = await users.findOneAndUpdate(
    { telegramId },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date(),
        lastActive: new Date()
      } 
    },
    { returnDocument: 'after' }
  );

  return result || null;
}

export async function updateUserLastActive(telegramId: number): Promise<void> {
  const users = await getUserCollection();
  await users.updateOne(
    { telegramId },
    { $set: { lastActive: new Date() } }
  );
}

export async function getAllUsers(): Promise<User[]> {
  const users = await getUserCollection();
  return await users.find({}).toArray();
}

export async function getUsersByRole(role: 'admin' | 'user'): Promise<User[]> {
  const users = await getUserCollection();
  return await users.find({ role }).toArray();
}

export async function deleteUser(telegramId: number): Promise<boolean> {
  const users = await getUserCollection();
  const result = await users.deleteOne({ telegramId });
  return result.deletedCount > 0;
}

// Initialize user if not exists
export async function initializeUser(telegramId: number, userData: {
  username?: string;
  firstName?: string;
  lastName?: string;
}): Promise<User> {
  let user = await getUserByTelegramId(telegramId);
  
  if (!user) {
    // Check if this is the first user (make them admin)
    const users = await getUserCollection();
    const userCount = await users.countDocuments();
    
    user = await createUser({
      telegramId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userCount === 0 ? 'admin' : 'user', // First user becomes admin
      preferences: {
        dailyWeather: false,
      },
    });
  } else {
    // Update last active and user info
    await updateUser(telegramId, {
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });
  }
  
  return user;
}

// Check if user is admin
export async function isUserAdmin(telegramId: number): Promise<boolean> {
  const user = await getUserByTelegramId(telegramId);
  return user?.role === 'admin';
}

// Memory operations (existing functionality)
export async function saveMemory(telegramId: number, messages: ChatMemory['messages']): Promise<void> {
  const memories = await getMemoryCollection();
  
  await memories.updateOne(
    { telegramId },
    {
      $set: {
        messages,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function getMemory(telegramId: number): Promise<ChatMemory['messages']> {
  const memories = await getMemoryCollection();
  const memory = await memories.findOne({ telegramId });
  return memory?.messages || [];
}

export async function clearMemory(telegramId: number): Promise<void> {
  const memories = await getMemoryCollection();
  await memories.deleteOne({ telegramId });
}

// Cleanup old memories (optional)
export async function cleanupOldMemories(daysOld: number = 30): Promise<number> {
  const memories = await getMemoryCollection();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await memories.deleteMany({
    updatedAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
}

// Close connection
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
