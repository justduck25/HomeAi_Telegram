#!/usr/bin/env node

/**
 * Script để thiết lập webhook Telegram
 * Chạy: node scripts/setup-webhook.js
 */

import https from 'https';

// Đọc biến môi trường
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // URL Vercel app của bạn
const SECRET_TOKEN = process.env.TELEGRAM_SECRET;

if (!BOT_TOKEN) {
  console.error('❌ Thiếu TELEGRAM_BOT_TOKEN trong biến môi trường');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('❌ Thiếu WEBHOOK_URL trong biến môi trường');
  console.log('💡 Ví dụ: export WEBHOOK_URL=https://telegram-cache-worker.your-subdomain.workers.dev');
  console.log('💡 Hoặc Vercel: export WEBHOOK_URL=https://your-app.vercel.app/api/tg');
  process.exit(1);
}

if (!SECRET_TOKEN) {
  console.error('❌ Thiếu TELEGRAM_SECRET trong biến môi trường');
  process.exit(1);
}

// Hàm gọi Telegram API
function callTelegramAPI(method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.ok) {
            resolve(result.result);
          } else {
            reject(new Error(`Telegram API Error: ${result.description}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function setupWebhook() {
  try {
    console.log('🚀 Đang thiết lập webhook Telegram...');
    console.log(`📍 URL: ${WEBHOOK_URL}`);
    
    // Thiết lập webhook
    const result = await callTelegramAPI('setWebhook', {
      url: WEBHOOK_URL,
      secret_token: SECRET_TOKEN,
      max_connections: 40,
      allowed_updates: ['message', 'edited_message']
    });
    
    console.log('✅ Webhook đã được thiết lập thành công!');
    console.log('📋 Thông tin webhook:', result);
    
    // Kiểm tra thông tin webhook
    const info = await callTelegramAPI('getWebhookInfo', {});
    console.log('🔍 Trạng thái webhook hiện tại:');
    console.log(`   URL: ${info.url}`);
    console.log(`   Pending updates: ${info.pending_update_count}`);
    console.log(`   Last error: ${info.last_error_message || 'Không có lỗi'}`);
    
  } catch (error) {
    console.error('❌ Lỗi thiết lập webhook:', error.message);
    process.exit(1);
  }
}

async function deleteWebhook() {
  try {
    console.log('🗑️ Đang xóa webhook...');
    await callTelegramAPI('deleteWebhook', {});
    console.log('✅ Đã xóa webhook thành công!');
  } catch (error) {
    console.error('❌ Lỗi xóa webhook:', error.message);
  }
}

async function getWebhookInfo() {
  try {
    console.log('🔍 Đang kiểm tra thông tin webhook...');
    const info = await callTelegramAPI('getWebhookInfo', {});
    
    console.log('📋 Thông tin webhook hiện tại:');
    console.log(`   URL: ${info.url || 'Chưa thiết lập'}`);
    console.log(`   Pending updates: ${info.pending_update_count}`);
    console.log(`   Max connections: ${info.max_connections}`);
    console.log(`   Last error: ${info.last_error_message || 'Không có lỗi'}`);
    
    if (info.last_error_date) {
      const errorDate = new Date(info.last_error_date * 1000);
      console.log(`   Last error date: ${errorDate.toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi kiểm tra webhook:', error.message);
  }
}

// Xử lý command line arguments
const command = process.argv[2];

async function main() {
  if (command === 'delete') {
    await deleteWebhook();
  } else if (command === 'info') {
    await getWebhookInfo();
  } else if (command === 'setup' || !command) {
    await setupWebhook();
  } else {
    console.log('📖 Cách sử dụng:');
    console.log('   node scripts/setup-webhook.js setup   # Thiết lập webhook');
    console.log('   node scripts/setup-webhook.js delete  # Xóa webhook');
    console.log('   node scripts/setup-webhook.js info    # Kiểm tra thông tin webhook');
    console.log('');
    console.log('💡 Hoặc sử dụng npm scripts:');
    console.log('   npm run webhook:setup');
    console.log('   npm run webhook:delete');
    console.log('   npm run webhook:info');
  }
}

main().catch(console.error);
