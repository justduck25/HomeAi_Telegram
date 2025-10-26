'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 font-sans dark:from-gray-900 dark:to-gray-800">
      <main className="flex w-full max-w-4xl flex-col items-center justify-center px-8 py-16">
        <div className="text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">🤖</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Telegram Gemini Bot
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
              Bot Telegram thông minh được hỗ trợ bởi Google Gemini 2.5 Flash
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Trò chuyện thông minh
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Giao tiếp tự nhiên bằng tiếng Việt với AI Gemini
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ghi nhớ ngữ cảnh
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Lưu trữ lịch sử hội thoại để trả lời chính xác hơn
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Phản hồi nhanh
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Xử lý và trả lời tin nhắn trong thời gian thực
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="mt-12 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 dark:text-green-300 font-medium">
                Bot đang hoạt động
              </span>
            </div>
            <p className="text-green-600 dark:text-green-400 mt-2">
              Webhook API sẵn sàng nhận tin nhắn từ Telegram
            </p>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Cách sử dụng
            </h3>
            <div className="text-left space-y-2 text-blue-800 dark:text-blue-200">
              <p>1. Tìm bot của bạn trên Telegram</p>
              <p>2. Gửi <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">/start</code> để bắt đầu</p>
              <p>3. Nhắn tin bình thường, bot sẽ trả lời bằng AI</p>
              <p>4. Gửi <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">/reset</code> để xóa lịch sử hội thoại</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
