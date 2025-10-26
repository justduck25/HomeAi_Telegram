import mongoose from 'mongoose';

export interface IUser {
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    updatedAt: Date;
  };
  preferences: {
    dailyWeatherNotification: boolean;
    notificationTime: string; // Format: "HH:mm" (24h format)
    timezone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  firstName: String,
  lastName: String,
  username: String,
  location: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    },
    city: String,
    country: String,
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  preferences: {
    dailyWeatherNotification: {
      type: Boolean,
      default: false
    },
    notificationTime: {
      type: String,
      default: "06:00" // 6:00 AM
    },
    timezone: {
      type: String,
      default: "Asia/Ho_Chi_Minh"
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ 'preferences.dailyWeatherNotification': 1 });
userSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
