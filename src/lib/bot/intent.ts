import type { DbIntent } from "./types";

export function shouldSearchWeb(text: string): boolean {
  const searchKeywords = [
    "tìm kiếm",
    "search",
    "tìm",
    "kiếm",
    "tra cứu",
    "research",
    "nghiên cứu",
    "tin tức",
    "tin mới",
    "thời sự",
    "báo chí",
    "sự kiện",
    "mới nhất",
    "cập nhật",
    "hiện tại",
    "hôm nay",
    "tuần này",
    "giá",
    "bao nhiêu tiền",
    "chi phí",
    "thị trường",
    "cổ phiếu",
    "bitcoin",
    "vàng",
    "USD",
    "tỷ giá",
    "giá cả",
    "mua",
    "bán",
    "sản phẩm",
    "review",
    "đánh giá",
    "so sánh",
    "tốt nhất",
    "khuyến mãi",
    "ưu đãi",
    "học",
    "trường",
    "đại học",
    "khóa học",
    "thi cử",
    "tuyển sinh",
    "học bổng",
    "giáo dục",
    "thời tiết",
    "nhiệt độ",
    "mưa",
    "nắng",
    "bão",
    "đường đi",
    "địa chỉ",
    "quán ăn",
    "nhà hàng",
    "du lịch",
    "phim",
    "nhạc",
    "ca sĩ",
    "diễn viên",
    "concert",
    "lễ hội",
    "triển lãm",
    "show",
    "bóng đá",
    "world cup",
    "euro",
    "sea games",
    "olympic",
    "thể thao",
    "tỷ số",
    "kết quả",
  ];

  const lowerText = text.toLowerCase();
  return searchKeywords.some((keyword) => lowerText.includes(keyword));
}

export function shouldSearchImages(text: string): boolean {
  const imageKeywords = [
    "hình ảnh",
    "ảnh",
    "photo",
    "picture",
    "image",
    "xem ảnh",
    "cho xem",
    "hiển thị",
    "show me",
    "như thế nào",
    "trông ra sao",
    "hình dáng",
  ];

  const lowerText = text.toLowerCase();
  return imageKeywords.some((keyword) => lowerText.includes(keyword));
}

export function parseImageCount(text: string): number {
  const patterns = [
    /(\d+)\s*(?:ảnh|hình|photo|image|picture)/i,
    /(?:ảnh|hình|photo|image|picture)\s*(\d+)/i,
    /(?:cho|show|hiển thị|xem)\s*(?:tôi|me)?\s*(\d+)\s*(?:ảnh|hình|photo|image)/i,
    /(\d+)\s*(?:cái|tấm|bức)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1]);
      return Math.min(Math.max(count, 1), 3);
    }
  }

  return 3;
}

export function isGreeting(text: string): boolean {
  const greetings = [
    "xin chào",
    "chào",
    "hello",
    "hi",
    "hey",
    "chào bạn",
    "chào bot",
    "bạn khỏe không",
    "có ai không",
    "alo",
    "hế lô",
  ];

  const lowerText = text.toLowerCase().trim();
  return greetings.some(
    (greeting) =>
      lowerText === greeting ||
      lowerText.startsWith(greeting + " ") ||
      lowerText.endsWith(" " + greeting),
  );
}

export function isAskingAboutOrigin(text: string): boolean {
  const originKeywords = [
    "ai tạo ra bạn",
    "ai làm ra bạn",
    "ai phát triển bạn",
    "bạn được tạo bởi ai",
    "bạn được làm bởi ai",
    "bạn được phát triển bởi ai",
    "nguồn gốc",
    "xuất xứ",
    "tác giả",
    "người tạo",
    "who created you",
    "who made you",
    "who developed you",
    "created by",
    "made by",
    "developed by",
    "bot này của ai",
    "ai sở hữu bot này",
    "chủ sở hữu bot",
    "justduck",
    "tác giả bot",
    "người viết bot",
  ];

  const lowerText = text.toLowerCase();
  return originKeywords.some((keyword) => lowerText.includes(keyword));
}

export function needsSystemInfo(text: string): boolean {
  const systemKeywords = [
    "bot",
    "hệ thống",
    "tính năng",
    "hoạt động",
    "lịch trình",
    "thời gian",
    "nhớ",
    "memory",
    "thông báo",
    "weather",
    "thời tiết",
    "cron",
    "tự động",
    "bao lâu",
    "khi nào",
    "làm sao",
    "cách nào",
    "chức năng",
    "service",
  ];

  const lowerText = text.toLowerCase();
  return systemKeywords.some((keyword) => lowerText.includes(keyword));
}

export function detectDbQueryIntent(text: string): DbIntent | null {
  const t = text.toLowerCase();

  if (
    /(daily|thông\s+báo\s+hàng\s+ngày|dự\s+báo\s+hàng\s+ngày).*(bật|tắt|trạng\s+thái|status)|\btrạng\s+thái\b.*(daily|thông\s+báo)/.test(
      t,
    )
  ) {
    return { type: "user_daily_status" };
  }

  if (
    /(vị\s+trí|location|tọa\s+độ|toạ\s+độ|thành\s+phố|city).*(của\s+tôi|mình|đang\s+lưu|đã\s+lưu)|\b(vị\s+trí|location)\b\??$/.test(
      t,
    )
  ) {
    return { type: "user_location" };
  }

  if (/(bộ\s+nhớ|memory|lưu.*bao\s+nhiêu|đang\s+lưu|context|ngữ\s+cảnh)/.test(t)) {
    return { type: "user_memory" };
  }

  if (/(bao\s+nhiêu|số).*(người\s+dùng|user)s?/i.test(t)) {
    return { type: "system_user_count" };
  }

  if (/(admin).*(là\s+ai|danh\s+sách|list|ai)/.test(t)) {
    return { type: "system_admin_list" };
  }

  if (/(bao\s+nhiêu|số).*(bật|đang\s+bật).*(daily|thông\s+báo\s+hàng\s+ngày)/.test(t)) {
    return { type: "system_daily_on_count" };
  }

  if (/(bao\s+nhiêu|số).*(đã\s+lưu|có).*(vị\s+trí|location)/.test(t)) {
    return { type: "system_users_with_location_count" };
  }

  if (/(ai|những\s+ai|bao\s+nhiêu).*(hoạt\s+động|active).*(hôm\s+nay|24h|24\s+giờ|trong\s+ngày)/.test(t)) {
    return { type: "system_recent_active" };
  }

  return null;
}
