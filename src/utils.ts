import { Dish } from "./types";

// Dynamic keywords mapping for school lunch items in Korea
const EMOJI_MAP: Record<string, string> = {
  // Rice & Grains
  "밥": "🍚",
  "비빔밥": "🍚",
  "볶음밥": "🍳",
  "리조또": "🍛",
  "오므라이스": "🍳",
  "덮밥": "🍛",
  "짜장밥": "🍛",
  "카레밥": "🍛",
  "누룽지": "🥣",
  "스시": "🍣",
  "삼각김밥": "🍙",
  "김밥": "🍙",

  // Stews & Soups
  "찌개": "🍲",
  "국": "🍲",
  "탕": "🍲",
  "수제비": "🍲",
  "짬뽕": "🍜",
  "짜장면": "🍜",
  "우동": "🍜",
  "라면": "🍜",
  "국수": "🍜",
  "칼국수": "🍜",
  "스프": "🥣",

  // Meat types
  "돈까스": "🐷",
  "돈가스": "🐷",
  "커틀릿": "🥩",
  "스테이크": "🥩",
  "삼겹살": "🐷",
  "보쌈": "🐷",
  "족발": "🐷",
  "탕수육": "🐷",
  "제육": "🐷",
  "갈비": "🍖",
  "너비아니": "🍖",
  "함박": "🥩",
  "미트볼": "🥩",
  "닭강정": "🍗",
  "치킨": "🍗",
  "백숙": "🍗",
  "닭갈비": "🍗",
  "소고기": "🥩",
  "쇠고기": "🥩",
  "돼지고기": "🐷",
  "오리": "🦆",
  "미역국": "🍲",

  // Seafood
  "생선": "🐟",
  "갈치": "🐟",
  "고등어": "🐟",
  "참치": "🐟",
  "낙지": "🦑",
  "오징어": "🦑",
  "주꾸미": "🦑",
  "새우": "🍤",
  "게": "🦀",
  "조개": "🦪",
  "굴": "🦪",

  // Fast food & Snacks
  "피자": "🍕",
  "햄버거": "🍔",
  "샌드위치": "🥪",
  "핫도그": "🌭",
  "떡볶이": "🍢",
  "만두": "🥟",
  "김말이": "🥟",
  "튀김": "🍤",
  "감자튀김": "🍟",
  "타코야끼": "🐙",
  "소시지": "🌭",
  "순대": "🟤",

  // Banchan & Dairy
  "김치": "🥬",
  "깍두기": "🥬",
  "단무지": "🟡",
  "나물": "🌿",
  "무침": "🥗",
  "샐러드": "🥗",
  "양상추": "🥗",
  "계란": "🍳",
  "달걀": "🍳",
  "메추리알": "🥚",
  "두부": "⬜",
  "치즈": "🧀",
  "요구르트": "🧃",
  "요플레": "🍨",
  "우유": "🥛",
  "주스": "🥤",
  "에이드": "🍹",

  // Fruit & Veggies
  "딸기": "🍓",
  "바나나": "🍌",
  "사과": "🍎",
  "수박": "🍉",
  "멜론": "🍈",
  "포도": "🍇",
  "토마토": "🍅",
  "파인애플": "🍍",
  "체리": "🍒",
  "복숭아": "🍑",
  "배": "🍐",
  "감": "🍊",
  "오렌지": "🍊",
  "귤": "🍊",

  // Desserts
  "와플": "🧇",
  "도넛": "🍩",
  "케이크": "🍰",
  "마카롱": "🍪",
  "쿠키": "🍪",
  "푸딩": "🍮",
  "젤리": "🍬",
  "초콜릿": "🍫",
  "츄러스": "🥖",
  "빵": "🍞",
  "떡": "🍡",
  "빙수": "🍧",
  "아이스크림": "🍦"
};

/**
 * Automatically assigns a cute, relevant emoji based on the dish name keywords.
 */
export function getEmojiForDish(dishName: string): string {
  const cleanName = dishName.trim();
  for (const keyword of Object.keys(EMOJI_MAP)) {
    if (cleanName.includes(keyword)) {
      return EMOJI_MAP[keyword];
    }
  }
  // Generic defaults based on simple keywords if not matched
  if (cleanName.includes("구이") || cleanName.includes("전")) return "🍳";
  if (cleanName.includes("무침") || cleanName.includes("잡채")) return "🥗";
  if (cleanName.includes("조림") || cleanName.includes("볶음")) return "🥘";
  if (cleanName.includes("소스") || cleanName.includes("드레싱")) return "🍶";

  return "🍽️"; // Fallback emoji
}

/**
 * Formats a date string (YYYYMMDD) into a cool, readable Kr format e.g. "6월 10일 (수)"
 */
export function formatDateString(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);

  const date = new Date(year, month - 1, day);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = weekDays[date.getDay()];

  return `${month}월 ${day}일 (${dayName})`;
}

/**
 * Check if the given date string matches today's date
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString();
}

/**
 * Get current date string formatted as YYYYMMDD
 */
export function getTodayString(offsetDays = 0): string {
  const date = new Date();
  if (offsetDays !== 0) {
    date.setDate(date.getDate() + offsetDays);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Formats YYYYMMDD to clean ISO month block for fetching, e.g. fromDate & toDate for a whole month
 * given a Date object, returns range [fromDateString, toDateString] for that calendar month.
 */
export function getMonthDateRange(date: Date): [string, string] {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0); // last day of this month

  const fromDate = `${year}${String(month + 1).padStart(2, '0')}01`;
  const toDate = `${year}${String(month + 1).padStart(2, '0')}${String(lastDay.getDate()).padStart(2, '0')}`;

  return [fromDate, toDate];
}

/**
 * Default to Lunch (2) as almost 100% of middle and high schools offer lunch,
 * whereas breakfast (1) and dinner (3) are rare (only boarding schools).
 * This prevents empty screens on launch.
 */
export function getAutoMealCode(): string {
  return "2"; // 100% safe default to 중식
}

/**
 * Returns the YYYYMMDD string for Monday through Friday of the week containing dateStr.
 */
export function getWeekDatesOfDate(dateStr: string): string[] {
  if (dateStr.length !== 8) return [];
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay(); // 0 is Sun, 1 is Mon
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const week = [];
  for (let i = 0; i < 5; i++) {
    const refDate = new Date(year, month, day);
    refDate.setDate(refDate.getDate() + mondayOffset + i);
    const yyyy = refDate.getFullYear();
    const mm = String(refDate.getMonth() + 1).padStart(2, "0");
    const dd = String(refDate.getDate()).padStart(2, "0");
    week.push(`${yyyy}${mm}${dd}`);
  }
  return week;
}

