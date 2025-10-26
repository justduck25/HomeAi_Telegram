import { MongoClient, Db, Collection } from 'mongodb';

// Interface cho tin nhắn trong context
export interface ContextMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
  timestamp: number;
}

// Interface cho document trong MongoDB
export interface ChatContext {
  _id?: string;
  chatId: string;
  userId?: number; // Telegram user ID
  messages: ContextMessage[];
  lastUpdated: Date;
}

// Interface cho user preferences
export interface UserPreferences {
  dailyWeatherNotification?: boolean;
}

// Interface cho location
export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

// Interface cho user document
export interface User {
  _id?: string;
  telegramId: string;
  preferences?: UserPreferences;
  location?: UserLocation;
  lastUpdated: Date;
}

class MongoDB {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  constructor() {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not found - Memory feature disabled');
      return;
    }
  }

  async connect(): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true;
    }

    try {
      if (!process.env.MONGODB_URI) {
        return false;
      }

      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db('telegram-bot');
      this.isConnected = true;
      
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
    }
  }

  private getCollection(): Collection<ChatContext> | null {
    if (!this.db) return null;
    return this.db.collection<ChatContext>('chat_contexts');
  }

  async saveContext(chatId: string, messages: ContextMessage[], userId?: number): Promise<boolean> {
    try {
      if (!await this.connect()) return false;
      
      const collection = this.getCollection();
      if (!collection) return false;

      // Xóa tin nhắn cũ hơn 12 tiếng (43200 giây)
      const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
      const filteredMessages = messages.filter(msg => msg.timestamp > twelveHoursAgo);

      const updateData: any = {
        chatId,
        messages: filteredMessages,
        lastUpdated: new Date()
      };

      // Chỉ cập nhật userId nếu được cung cấp
      if (userId !== undefined) {
        updateData.userId = userId;
      }

      await collection.updateOne(
        { chatId },
        { $set: updateData },
        { upsert: true }
      );

      return true;
    } catch (error) {
      console.error('❌ Error saving context:', error);
      return false;
    }
  }

  async getContext(chatId: string): Promise<ContextMessage[]> {
    try {
      if (!await this.connect()) return [];
      
      const collection = this.getCollection();
      if (!collection) return [];

      const doc = await collection.findOne({ chatId });
      if (!doc) return [];

      // Lọc tin nhắn cũ hơn 12 tiếng
      const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
      const filteredMessages = doc.messages.filter(msg => msg.timestamp > twelveHoursAgo);

      // Nếu có tin nhắn bị lọc, cập nhật lại database
      if (filteredMessages.length !== doc.messages.length) {
        await this.saveContext(chatId, filteredMessages);
      }

      return filteredMessages;
    } catch (error) {
      console.error('❌ Error getting context:', error);
      return [];
    }
  }

  async getChatInfo(chatId: string): Promise<ChatContext | null> {
    try {
      if (!await this.connect()) return null;
      
      const collection = this.getCollection();
      if (!collection) return null;

      const doc = await collection.findOne({ chatId });
      return doc;
    } catch (error) {
      console.error('❌ Error getting chat info:', error);
      return null;
    }
  }

  async clearContext(chatId: string): Promise<boolean> {
    try {
      if (!await this.connect()) return false;
      
      const collection = this.getCollection();
      if (!collection) return false;

      await collection.deleteOne({ chatId });
      return true;
    } catch (error) {
      console.error('❌ Error clearing context:', error);
      return false;
    }
  }

  async getMemoryStats(chatId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    oldestMessageTime: number | null;
  }> {
    try {
      const messages = await this.getContext(chatId);
      const userMessages = messages.filter(msg => msg.role === 'user').length;
      const oldestTime = messages.length > 0 ? Math.min(...messages.map(m => m.timestamp)) : null;

      return {
        totalMessages: messages.length,
        userMessages,
        oldestMessageTime: oldestTime
      };
    } catch (error) {
      console.error('❌ Error getting memory stats:', error);
      return { totalMessages: 0, userMessages: 0, oldestMessageTime: null };
    }
  }

  isAvailable(): boolean {
    return !!process.env.MONGODB_URI;
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }
}

// Singleton instance
export const mongodb = new MongoDB();

// Hàm helper để lấy user collection
async function getUserCollection() {
  await mongodb.connect();
  const db = mongodb.getDb();
  return db.collection<User>('users');
}

// Hàm cập nhật preferences của user
export async function updateUserPreferences(telegramId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
  try {
    const collection = await getUserCollection();
    
    await collection.updateOne(
      { telegramId },
      { 
        $set: { 
          preferences: preferences,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
    
    return true;
  } catch (error) {
    console.error('❌ Error updating user preferences:', error);
    return false;
  }
}

// Hàm lấy thông tin user theo ID
export async function getUserById(telegramId: string): Promise<User | null> {
  try {
    const collection = await getUserCollection();
    const user = await collection.findOne({ telegramId });
    return user;
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    return null;
  }
}

// Hàm lưu vị trí user
export async function saveUserLocation(telegramId: string, location: UserLocation): Promise<boolean> {
  try {
    const collection = await getUserCollection();
    
    await collection.updateOne(
      { telegramId },
      { 
        $set: { 
          location: location,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
    
    return true;
  } catch (error) {
    console.error('❌ Error saving user location:', error);
    return false;
  }
}

// Hàm lấy vị trí đã lưu của user
export async function getUserLocation(telegramId: string): Promise<UserLocation | null> {
  try {
    const user = await getUserById(telegramId);
    return user?.location || null;
  } catch (error) {
    console.error('❌ Error getting user location:', error);
    return null;
  }
}
