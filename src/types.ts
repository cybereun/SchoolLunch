export interface School {
  officeCode: string; // ATPT_OFCDC_SC_CODE (Educational Office Code)
  officeName: string; // ATPT_OFCDC_SC_NM (Educational Office Name)
  schoolCode: string; // SD_SCHUL_CODE (Standard School Code)
  schoolName: string; // SCHUL_NM (School Name)
  address: string;    // ORG_RDNMA (Address)
  schoolKind: string; // SCHUL_KND_SC_NM (School Kind, e.g. 고등학교)
}

export interface Dish {
  name: string;
  allergies: number[]; // Array of allergy ids
}

export interface Meal {
  date: string;       // YYYYMMDD
  mealCode: string;   // 1, 2, 3
  mealName: string;   // 조식, 중식, 석식
  dishes: Dish[];
  calories: string;   // e.g. "812.5 Kcal"
  nutrition: string;  // Detailed nutrient breakdown
}

export interface AllergyInfo {
  id: number;
  name: string;
  emoji: string;
}

export interface SavedSetting {
  school: School | null;
  allergies: number[]; // Set of active allergy IDs
  customEmojis: Record<string, string>; // Maps keyword to emoji
  favorites: string[]; // List of dish names that are marked as favorites!
  mealAlertEnabled?: boolean; // Today's Meal Alert toggle setting
}

// Complete list of NEIS standard allergen details with custom emojis
export const ALLERGENS: AllergyInfo[] = [
  { id: 1, name: "난류", emoji: "🥚" },
  { id: 2, name: "우유", emoji: "🥛" },
  { id: 3, name: "메밀", emoji: "🌾" },
  { id: 4, name: "땅콩", emoji: "🥜" },
  { id: 5, name: "대두", emoji: "🫘" },
  { id: 6, name: "밀", emoji: "🍞" },
  { id: 7, name: "고등어", emoji: "🐟" },
  { id: 8, name: "게", emoji: "🦀" },
  { id: 9, name: "새우", emoji: "🍤" },
  { id: 10, name: "돼지고기", emoji: "🐷" },
  { id: 11, name: "토마토", emoji: "🍅" },
  { id: 12, name: "아황산류", emoji: "🧪" },
  { id: 13, name: "호두", emoji: "🪵" },
  { id: 14, name: "닭고기", emoji: "🍗" },
  { id: 15, name: "쇠고기", emoji: "🥩" },
  { id: 16, name: "오징어", emoji: "🦑" },
  { id: 17, name: "조개류", emoji: "🦪" }, // (굴, 전복, 홍합 포함)
  { id: 18, name: "잣", emoji: "🌲" }
];
