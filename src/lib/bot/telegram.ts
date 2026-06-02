import type { TelegramUpdate, TelegramMessage } from "./types";

export function getMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? update.edited_message ?? null;
}

export async function requestLocationMessage(chatId: string, message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [
              {
                text: "📍 Chia sẻ vị trí hiện tại",
                request_location: true,
              },
            ],
            [
              {
                text: "❌ Hủy",
              },
            ],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending location request:", error);
    return false;
  }
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: Record<string, unknown>,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const maxLength = 4000;
  const messages: string[] = [];

  if (text.length <= maxLength) {
    messages.push(text);
  } else {
    const chunks = text.split("\n\n");
    let currentMessage = "";

    for (const chunk of chunks) {
      if ((currentMessage + chunk).length <= maxLength) {
        currentMessage += (currentMessage ? "\n\n" : "") + chunk;
      } else if (currentMessage) {
        messages.push(currentMessage);
        currentMessage = chunk;
      } else {
        const sentences = chunk.split(". ");
        for (const sentence of sentences) {
          if ((currentMessage + sentence).length <= maxLength) {
            currentMessage += (currentMessage ? ". " : "") + sentence;
          } else if (currentMessage) {
            messages.push(currentMessage);
            currentMessage = sentence;
          } else {
            messages.push(sentence.substring(0, maxLength));
          }
        }
      }
    }

    if (currentMessage) {
      messages.push(currentMessage);
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    try {
      let response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Telegram Markdown send failed ${i + 1}/${messages.length}:`, errorText);

        if (errorText.includes("can't parse entities") || errorText.includes("Bad Request")) {
          response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              disable_web_page_preview: true,
              ...options,
            }),
          });

          if (!response.ok) {
            console.error(`Telegram plain text send failed ${i + 1}/${messages.length}:`, await response.text());
          }
        }
      }

      if (i < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Telegram connection error for message ${i + 1}/${messages.length}:`, error);
    }
  }
}

export async function sendTypingAction(chatId: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    });
  } catch (error) {
    console.error("Error sending typing action:", error);
  }
}

export async function downloadTelegramImage(fileId: string): Promise<Buffer | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  try {
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
    );
    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      console.error("Could not get Telegram file info:", fileInfo);
      return null;
    }

    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
    const imageResponse = await fetch(fileUrl);

    if (!imageResponse.ok) {
      console.error("Could not download Telegram image:", imageResponse.statusText);
      return null;
    }

    return Buffer.from(await imageResponse.arrayBuffer());
  } catch (error) {
    console.error("Telegram image download error:", error);
    return null;
  }
}

export function convertImageToGroqFormat(imageBuffer: Buffer, mimeType: string = "image/jpeg") {
  return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
}

export function detectMimeType(buffer: Buffer): string {
  const header = buffer.subarray(0, 4);

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }

  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    return "image/png";
  }

  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
    return "image/gif";
  }

  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    return "image/webp";
  }

  return "image/jpeg";
}
