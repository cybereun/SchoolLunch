import { useState } from "react";
import { Meal, AllergyInfo, ALLERGENS, Dish } from "../types";
import { getEmojiForDish } from "../utils";
import { Flame, Heart, Info, Sparkles, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MealCardProps {
  meal: Meal;
  selectedAllergies: number[];
  favorites: string[];
  onToggleFavorite: (dishName: string) => void;
}

export default function MealCard({ meal, selectedAllergies, favorites, onToggleFavorite }: MealCardProps) {
  const [showNutrition, setShowNutrition] = useState(false);
  const [explosionDish, setExplosionDish] = useState<string | null>(null);

  const handleDishClick = (dishName: string) => {
    onToggleFavorite(dishName);
    
    // Trigger fun micro explosion animation!
    setExplosionDish(dishName);
    setTimeout(() => {
      setExplosionDish(null);
    }, 850);
  };

  // Safe checks for allergen matches
  const getViolatedAllergens = (dish: Dish): AllergyInfo[] => {
    const list: AllergyInfo[] = [];
    for (const allergenId of dish.allergies) {
      if (selectedAllergies.includes(allergenId)) {
        const found = ALLERGENS.find((a) => a.id === allergenId);
        if (found) list.push(found);
      }
    }
    return list;
  };

  const getMealTheme = (code: string) => {
    switch (code) {
      case "1": // Breakfast
        return {
          title: "아침 (조식) 🌅",
          border: "border-2 border-amber-300",
          glow: "shadow-lg shadow-amber-100/50",
          bg: "bg-amber-50/40",
          badge: "bg-amber-105 text-amber-700 border-2 border-amber-300/50",
          btn: "hover:bg-amber-100/80 hover:text-amber-750 text-amber-600 border-2 border-amber-300 bg-amber-50/40 font-sans"
        };
      case "2": // Lunch
        return {
          title: "점심 (중식) ☀️",
          border: "border-2 border-pink-300",
          glow: "shadow-lg shadow-pink-100/50",
          bg: "bg-pink-50/40",
          badge: "bg-pink-105 text-pink-700 border-2 border-pink-300/50",
          btn: "hover:bg-pink-100/80 hover:text-pink-750 text-pink-600 border-2 border-pink-300 bg-pink-50/40 font-sans"
        };
      case "3": // Dinner
        return {
          title: "저녁 (석식) 🌌",
          border: "border-2 border-purple-300",
          glow: "shadow-lg shadow-purple-100/50",
          bg: "bg-purple-50/40",
          badge: "bg-purple-105 text-purple-700 border-2 border-purple-300/50",
          btn: "hover:bg-purple-100/80 hover:text-purple-750 text-purple-600 border-2 border-purple-300 bg-purple-50/40 font-sans"
        };
      default:
        return {
          title: "급식 🍽️",
          border: "border-2 border-zinc-300",
          glow: "shadow-md shadow-zinc-100/50",
          bg: "bg-zinc-50/50",
          badge: "bg-zinc-101 text-zinc-700 border-2 border-zinc-200",
          btn: "hover:bg-zinc-100 text-zinc-650 border-2 border-zinc-300 bg-white font-sans"
        };
    }
  };

  const theme = getMealTheme(meal.mealCode);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-white p-5 ${theme.border} ${theme.glow} flex flex-col justify-between`} id={`meal-card-${meal.mealCode}`}>
      
      {/* Decorative background grid subtle overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#fda4af0b_1px,transparent_1px),linear-gradient(to_bottom,#fda4af0b_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <span className={`px-4 py-1.5 rounded-full text-sm sm:text-base font-extrabold ${theme.badge} font-sans`}>
            {theme.title}
          </span>
          {meal.calories && (
            <div className="flex items-center gap-1.5 text-sm sm:text-base text-amber-500 font-mono font-extrabold">
              <Flame size={17} className="fill-amber-500/10 text-amber-500 animate-pulse" />
              <span>{meal.calories}</span>
            </div>
          )}
        </div>

        {/* Dishes list */}
        <div className="space-y-3 my-4">
          {meal.dishes.map((dish) => {
            const violated = getViolatedAllergens(dish);
            const isAllergyHit = violated.length > 0;
            const isFav = favorites.includes(dish.name);
            const dishEmoji = getEmojiForDish(dish.name);

            return (
              <div
                key={dish.name}
                onClick={() => handleDishClick(dish.name)}
                className={`relative group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
                  isAllergyHit
                    ? "border-red-405 bg-red-50/80 hover:bg-red-100/80 shadow-md shadow-red-150/40"
                    : isFav
                    ? "border-amber-305 bg-amber-50/80 hover:bg-amber-100/85 shadow-md shadow-amber-150/55 scale-[1.01]"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-white hover:border-pink-300 shadow-sm hover:shadow-md shadow-zinc-100/40"
                }`}
              >
                {/* Visual left bar highlight for allergy */}
                {isAllergyHit && (
                  <div className="absolute top-0 bottom-0 left-0 w-2 bg-red-400 rounded-l-2xl" />
                )}

                <div className="flex items-center gap-4.5 min-w-0 pr-2">
                  <span className="text-2xl sm:text-3xl shrink-0 group-hover:scale-110 transition-transform">{dishEmoji}</span>
                  <div className="min-w-0">
                    <span className={`text-base sm:text-lg tracking-normal font-black block leading-snug ${isAllergyHit ? "text-red-700" : isFav ? "text-amber-900" : "text-zinc-805 group-hover:text-pink-600 transition-colors"}`}>
                      {dish.name}
                    </span>
                    
                    {/* Alergen tag list */}
                    {isAllergyHit && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {violated.map((all) => (
                          <span key={all.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold bg-red-100 text-red-650 font-sans border-2 border-red-200 shadow-sm shadow-red-100/30">
                            <span>{all.emoji}</span>
                            <span>{all.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Heart / Star toggle feedback */}
                <div className="flex items-center gap-2 shrink-0">
                  <AnimatePresence mode="popLayout">
                    {isFav && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="text-pink-500"
                      >
                        <Heart size={16} className="fill-pink-500 text-pink-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button
                    type="button"
                    className={`p-2 rounded-xl border-2 transition-all ${
                      isFav
                        ? "border-amber-300 bg-amber-100 text-amber-600 shadow-md shadow-amber-100/30 font-sans"
                        : "border-zinc-205 bg-white text-zinc-400 group-hover:text-zinc-500 shadow-sm hover:border-zinc-300 font-sans"
                    }`}
                  >
                    <Star size={14} className={isFav ? "fill-amber-400 text-amber-500" : ""} />
                  </button>
                </div>

                {/* Particle explosion effect context */}
                <AnimatePresence>
                  {explosionDish === dish.name && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.1 }}
                      exit={{ opacity: 0, scale: 1.3 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-white/20 backdrop-blur-[1px] rounded-2xl"
                    >
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-pink-600 bg-white border-2 border-pink-350 py-2 px-4 rounded-full shadow-lg shadow-pink-100/40">
                        <Sparkles size={13} className="text-pink-500 animate-spin" />
                        <span>{isFav ? "최애 해제!" : "내 식판에 쏙! 💖"}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t-2 border-zinc-100 pt-3">
        {/* Toggleable nutrient breakdowns */}
        <button
          type="button"
          onClick={() => setShowNutrition(!showNutrition)}
          className={`w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold cursor-pointer transition-all shadow-md ${theme.btn}`}
        >
          <Info size={14} />
          {showNutrition ? "칼로리 보고서 접기 ▲" : "영양 성분 분석표 보기 ▼"}
        </button>

        <AnimatePresence>
          {showNutrition && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-3 bg-zinc-50/50 p-4 rounded-2xl border-2 border-zinc-200 space-y-4 shadow-inner shadow-zinc-100/50"
            >
              <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-100">
                <span className="text-xs sm:text-sm font-extrabold text-zinc-700 font-sans flex items-center gap-1.5">
                  🥗 정밀 영양 분석표
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                  1회 급식 기준
                </span>
              </div>

              {(() => {
                const nutrients = (() => {
                  if (!meal.nutrition) return [];
                  const rawParts = meal.nutrition.split(/<br\s*\/?>/i);
                  const result = [];
                  for (const part of rawParts) {
                    const cleanPart = part.trim();
                    if (!cleanPart) continue;
                    const match = cleanPart.match(/^([^(\s:]+)\s*(?:\(([^)]+)\))?\s*:\s*([\d.]+)/);
                    if (match) {
                      result.push({
                        name: match[1].trim(),
                        unit: match[2] ? match[2].trim() : "",
                        value: parseFloat(match[3]),
                      });
                    } else {
                      const simpleMatch = cleanPart.match(/^([^:]+)\s*:\s*(.+)/);
                      if (simpleMatch) {
                        result.push({
                          name: simpleMatch[1].trim(),
                          unit: "",
                          value: parseFloat(simpleMatch[2]) || 0,
                        });
                      }
                    }
                  }
                  return result;
                })();

                if (nutrients.length === 0) {
                  return (
                    <p className="text-xs text-zinc-455 font-bold text-center py-2">
                      상세 영양 성분 정보가 마련되지 않았습니다.
                    </p>
                  );
                }

                // Nutrient Metadata Mapping
                const NUTRIENT_METADA: Record<string, { emoji: string; textClass: string; bgClass: string; barColor: string; limit: number }> = {
                  "탄수화물": { emoji: "🍚", textClass: "text-amber-850", bgClass: "bg-amber-50/60 border-2 border-amber-300 shadow-sm shadow-amber-100/30", barColor: "bg-amber-450", limit: 110 },
                  "단백질": { emoji: "🥩", textClass: "text-red-850", bgClass: "bg-red-50/60 border-2 border-red-300 shadow-sm shadow-red-100/30", barColor: "bg-red-400", limit: 30 },
                  "지방": { emoji: "🥑", textClass: "text-yellow-850", bgClass: "bg-yellow-50/60 border-2 border-yellow-300 shadow-sm shadow-yellow-100/30", barColor: "bg-yellow-400", limit: 25 },
                  "비타민A": { emoji: "🥕", textClass: "text-orange-700", bgClass: "bg-orange-50/40 border-2 border-orange-300 shadow-sm shadow-orange-100/20", barColor: "bg-orange-400", limit: 300 },
                  "티아민": { emoji: "🍞", textClass: "text-yellow-750", bgClass: "bg-amber-50/30 border-2 border-amber-300 shadow-sm shadow-amber-100/20", barColor: "bg-amber-500", limit: 0.5 },
                  "리보플라빈": { emoji: "🥛", textClass: "text-blue-700", bgClass: "bg-blue-50/40 border-2 border-blue-300 shadow-sm shadow-blue-100/20", barColor: "bg-blue-400", limit: 0.6 },
                  "비타민C": { emoji: "🍋", textClass: "text-yellow-650", bgClass: "bg-yellow-50/40 border-2 border-yellow-300 shadow-sm shadow-yellow-100/20", barColor: "bg-yellow-400", limit: 30 },
                  "칼슘": { emoji: "🥛", textClass: "text-zinc-700", bgClass: "bg-zinc-50 border-2 border-zinc-300 shadow-sm shadow-zinc-150/20", barColor: "bg-zinc-400", limit: 300 },
                  "철분": { emoji: "🍳", textClass: "text-red-750", bgClass: "bg-red-50/20 border-2 border-red-300 shadow-sm shadow-red-100/20", barColor: "bg-red-500", limit: 5 },
                };

                const majorKeys = ["탄수화물", "단백질", "지방"];
                const majors = nutrients.filter((n) => majorKeys.includes(n.name));
                const minors = nutrients.filter((n) => !majorKeys.includes(n.name));

                return (
                  <div className="space-y-4">
                    {/* 3대 영양소 (Macronutrients) */}
                    {majors.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-[11px] font-extrabold text-zinc-400 font-sans tracking-tight">
                          💡 3대 열량 영양소
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {majors.map((nut) => {
                            const meta = NUTRIENT_METADA[nut.name] || {
                              emoji: "🥗",
                              textClass: "text-zinc-700",
                              bgClass: "bg-zinc-50 border border-zinc-100",
                              barColor: "bg-zinc-400",
                              limit: 50,
                            };
                            return (
                              <div
                                key={nut.name}
                                className={`p-2.5 rounded-xl ${meta.bgClass} flex flex-col justify-between`}
                              >
                                <div className="text-xs font-black text-zinc-800 flex items-center gap-1">
                                  <span>{meta.emoji}</span>
                                  <span className="truncate">{nut.name}</span>
                                </div>
                                <div className="mt-2.5 text-right">
                                  <span className="text-sm font-black text-zinc-805 tracking-tight">
                                    {nut.value}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-zinc-400 ml-0.5">
                                    {nut.unit || "g"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 비타민 & 미네랄 (Micronutrients) */}
                    {minors.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-extrabold text-zinc-400 font-sans tracking-tight pt-1">
                          🍊 비타민 & 무기질 성분
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {minors.map((nut) => {
                            const meta = NUTRIENT_METADA[nut.name] || {
                              emoji: "🥗",
                              textClass: "text-zinc-700",
                              bgClass: "bg-zinc-50 border border-zinc-100/30",
                              barColor: "bg-zinc-400",
                              limit: 10,
                            };
                            return (
                              <div
                                key={nut.name}
                                className={`flex items-center justify-between p-2 rounded-xl ${meta.bgClass}`}
                              >
                                <span className="text-xs font-bold text-zinc-650 flex items-center gap-1">
                                  <span>{meta.emoji}</span>
                                  <span className="truncate">{nut.name}</span>
                                </span>
                                <span className="text-xs font-black text-zinc-800 shrink-0 font-mono">
                                  {nut.value}
                                  <span className="text-[9px] font-bold text-zinc-400 ml-0.5 font-sans">
                                    {nut.unit}
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
