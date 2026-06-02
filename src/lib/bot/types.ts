export type ContextMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

export type TelegramVoice = {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
};

export type TelegramAudio = {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

export type TelegramLocation = {
  longitude: number;
  latitude: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
};

export type TelegramMessage = {
  message_id: number;
  from?: {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
  audio?: TelegramAudio;
  location?: TelegramLocation;
  caption?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

export type DbIntent =
  | { type: "user_daily_status" }
  | { type: "user_location" }
  | { type: "user_memory" }
  | { type: "system_user_count" }
  | { type: "system_admin_list" }
  | { type: "system_daily_on_count" }
  | { type: "system_users_with_location_count" }
  | { type: "system_recent_active" };
