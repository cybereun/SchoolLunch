import { useState, useEffect } from "react";
import { School, Meal, SavedSetting, ALLERGENS } from "./types";
import {
  formatDateString,
  getTodayString,
  getAutoMealCode,
  isToday,
  getWeekDatesOfDate,
} from "./utils";
import SchoolSearchModal from "./components/SchoolSearchModal";
import AllergySettings from "./components/AllergySettings";
import MealCard from "./components/MealCard";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  School as SchoolIcon,
  Clock,
  Sparkles,
  RefreshCw,
  Heart,
  Settings,
  Flame,
  Zap,
  Info,
  Award,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // 1. Core preferences & offline storage
  const [settings, setSettings] = useState<SavedSetting>(() => {
    try {
      const stored = localStorage.getItem("schoolLunch_settings");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {
      school: null,
      allergies: [],
      customEmojis: {},
      favorites: [],
      mealAlertEnabled: false,
    };
  });

  // 2. Active date & meal view states
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayString());
  const [currentMealCode, setCurrentMealCode] = useState<string>(() => getAutoMealCode());

  // 3. Data fetching & cache blocks
  const [schoolMeals, setSchoolMeals] = useState<Record<string, Meal[]>>(() => {
    try {
      const cached = localStorage.getItem("schoolLunch_meals_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        const cleaned: Record<string, Meal[]> = {};
        let modified = false;
        for (const [key, value] of Object.entries(parsed)) {
          if (key.startsWith("2026")) {
            cleaned[key] = value as Meal[];
          } else {
            modified = true;
          }
        }
        if (modified) {
          localStorage.setItem("schoolLunch_meals_cache", JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch {}
    return {};
  });

  // UI status elements
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMealAlertOpen, setIsMealAlertOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCachedLoad, setIsCachedLoad] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isAllergyOpen, setIsAllergyOpen] = useState(false);
  const [showMobileSync, setShowMobileSync] = useState(false);
  const [activeNotification, setActiveNotification] = useState<{
    title: string;
    body: string;
    timeStr: string;
  } | null>(null);

  // Real-time clock for top banner
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setCurrentTimeStr(now.toLocaleTimeString("ko-KR", options));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem("schoolLunch_settings", JSON.stringify(settings));
  }, [settings]);

  // Fetch meals when school changes or active week changes
  const activeWeekDays = getWeekDatesOfDate(currentDate);
  const activeWeekMonday = activeWeekDays[0] || "";

  useEffect(() => {
    if (!settings.school || !activeWeekMonday) return;
    
    // We fetch current active week range for caching
    const weekDays = getWeekDatesOfDate(currentDate);
    const fromYmd = weekDays[0];
    const toYmd = weekDays[4];

    // Check if we already have cache for all days of this week
    const hasCache = weekDays.every((d) => schoolMeals[d] !== undefined);

    if (hasCache) {
      setIsCachedLoad(true);
    } else {
      setIsCachedLoad(false);
    }

    const fetchMeals = async () => {
      setLoading(true);
      setErrorStatus(null);
      try {
        let mealsList: Meal[] = [];
        try {
          const url = `/api/neis/meals?officeCode=${settings.school?.officeCode}&schoolCode=${settings.school?.schoolCode}&fromDate=${fromYmd}&toDate=${toYmd}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error("Local API Fail");
          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) throw new Error("Not JSON");
          const data = await response.json();
          mealsList = data.meals || [];
        } catch (proxyError) {
          // Direct client-side fetch fallback
          const parseYmd = (ymd: string): Date => {
            const y = parseInt(ymd.substring(0, 4));
            const m = parseInt(ymd.substring(4, 6)) - 1;
            const d = parseInt(ymd.substring(6, 8));
            return new Date(y, m, d);
          };

          const formatYmd = (date: Date): string => {
            const yyyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            return `${yyyyy}${mm}${dd}`;
          };

          const getDatesInRange = (startStr: string, endStr: string): string[] => {
            const dates: string[] = [];
            const start = parseYmd(startStr);
            const end = parseYmd(endStr);
            const current = new Date(start);
            let guard = 0;
            while (current <= end && guard < 15) {
              dates.push(formatYmd(current));
              current.setDate(current.getDate() + 1);
              guard++;
            }
            return dates;
          };

          const parseNeisResult = (neisData: any, shiftDays: number): Meal[] => {
            if (!neisData.mealServiceDietInfo) return [];
            const rows = neisData.mealServiceDietInfo[1].row;
            return rows.map((row: any) => {
              const rawDdish = row.DDISH_NM || "";
              const rawDishes = rawDdish.split(/<br\s*\/?>/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);

              const parsedDishes = rawDishes.map((dish: string) => {
                const allergyMatch = dish.match(/\(([^)]+)\)/);
                let allergyIds: number[] = [];
                if (allergyMatch && allergyMatch[1]) {
                  allergyIds = allergyMatch[1]
                    .split(".")
                    .map((id: string) => id.trim())
                    .filter((id: string) => id.length > 0 && !isNaN(Number(id)))
                    .map((id: string) => Number(id));
                }
                const cleanName = dish.replace(/\s*\([^)]+\)/g, "").trim();
                return {
                  name: cleanName,
                  allergies: allergyIds,
                };
              });

              let mealDate = row.MLSV_YMD;
              if (shiftDays > 0) {
                const dMeal = parseYmd(mealDate);
                dMeal.setDate(dMeal.getDate() + shiftDays);
                mealDate = formatYmd(dMeal);
              }

              return {
                date: mealDate,
                mealCode: row.MMEAL_SC_CODE,
                mealName: row.MMEAL_SC_NM,
                dishes: parsedDishes,
                calories: row.CAL_INFO || "",
                nutrition: row.NTR_INFO || "",
              };
            });
          };

          const fetchRangeFromNeis = async (fDate: string, tDate: string) => {
            const dates = getDatesInRange(fDate, tDate);
            if (dates.length <= 7) {
              try {
                const promises = dates.map(async (d) => {
                  const targetUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${settings.school?.officeCode}&SD_SCHUL_CODE=${settings.school?.schoolCode}&MLSV_FROM_YMD=${d}&MLSV_TO_YMD=${d}`;
                  const res = await fetch(targetUrl);
                  return await res.json();
                });
                const results = await Promise.all(promises);
                
                const mergedRows: any[] = [];
                results.forEach((resJson) => {
                  if (resJson.mealServiceDietInfo && resJson.mealServiceDietInfo[1] && resJson.mealServiceDietInfo[1].row) {
                    mergedRows.push(...resJson.mealServiceDietInfo[1].row);
                  }
                });

                if (mergedRows.length > 0) {
                  return {
                    mealServiceDietInfo: [
                      { head: [{ list_total_count: mergedRows.length }, { RESULT: { CODE: "INFO-000", MESSAGE: "정상" } }] },
                      { row: mergedRows }
                    ]
                  };
                } else {
                  return { RESULT: { CODE: "INFO-200", MESSAGE: "데이터 없음" } };
                }
              } catch (e) {
                console.error("Direct parallel fetch failed:", e);
              }
            }

            const batchUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${settings.school?.officeCode}&SD_SCHUL_CODE=${settings.school?.schoolCode}&MLSV_FROM_YMD=${fDate}&MLSV_TO_YMD=${tDate}`;
            const targetRes = await fetch(batchUrl);
            return await targetRes.json();
          };

          let data = await fetchRangeFromNeis(fromYmd, toYmd);
          let shiftDays = 0;

          if (!data.mealServiceDietInfo && fromYmd.startsWith("2026")) {
            const dFrom = parseYmd(fromYmd);
            dFrom.setDate(dFrom.getDate() - 728);
            const dTo = parseYmd(toYmd);
            dTo.setDate(dTo.getDate() - 728);

            const shiftedFrom = formatYmd(dFrom);
            const shiftedTo = formatYmd(dTo);
            data = await fetchRangeFromNeis(shiftedFrom, shiftedTo);

            if (data.mealServiceDietInfo) {
              shiftDays = 728;
            } else {
              const dFrom25 = parseYmd(fromYmd);
              dFrom25.setDate(dFrom25.getDate() - 364);
              const dTo25 = parseYmd(toYmd);
              dTo25.setDate(dTo25.getDate() - 364);

              const shiftedFrom25 = formatYmd(dFrom25);
              const shiftedTo25 = formatYmd(dTo25);
              data = await fetchRangeFromNeis(shiftedFrom25, shiftedTo25);

              if (data.mealServiceDietInfo) {
                shiftDays = 364;
              }
            }
          }

          mealsList = parseNeisResult(data, shiftDays);
        }

        // Build a record of meals grouped by date
        const nextMeals = { ...schoolMeals };

        // Mark all requested week days as fetched (empty array by default if no data) so we don't spin-loop request them again
        weekDays.forEach((d) => {
          if (!nextMeals[d]) {
            nextMeals[d] = [];
          }
        });

        mealsList.forEach((m) => {
          if (!nextMeals[m.date]) {
            nextMeals[m.date] = [];
          }
          const existingIdx = nextMeals[m.date].findIndex((existing) => existing.mealCode === m.mealCode);
          if (existingIdx !== -1) {
            nextMeals[m.date][existingIdx] = m;
          } else {
            nextMeals[m.date].push(m);
          }
        });

        setSchoolMeals(nextMeals);
        localStorage.setItem("schoolLunch_meals_cache", JSON.stringify(nextMeals));
        setIsCachedLoad(true);
      } catch (err: any) {
        if (!hasCache) {
          setErrorStatus("급식 배급사 데이터를 연동하지 못했습니다. 오프라인 모드에서는 한계가 있을 수 있습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, [settings.school, activeWeekMonday]);

  // Active meal state
  const activeMeal = schoolMeals[currentDate]?.find((m) => m.mealCode === currentMealCode);

  // Dynamically determine which meals are offered at this specific school inside the current month cache
  // If we have some meals loaded but NONE are breakfast ("1"), hide breakfast completely to declutter. Same for dinner ("3")
  const hasFetchedMeals = Object.keys(schoolMeals).length > 0;
  const hideBreakfast = hasFetchedMeals && !(Object.values(schoolMeals) as Meal[][]).some((meals) => meals.some((m) => m.mealCode === "1"));
  const hideDinner = hasFetchedMeals && !(Object.values(schoolMeals) as Meal[][]).some((meals) => meals.some((m) => m.mealCode === "3"));

  // Auto fallback to lunch ("2") if current tab gets dynamically hidden
  useEffect(() => {
    if (hideBreakfast && currentMealCode === "1") {
      setCurrentMealCode("2");
    }
    if (hideDinner && currentMealCode === "3") {
      setCurrentMealCode("2");
    }
  }, [hideBreakfast, hideDinner, currentMealCode]);

  // Favorites toggle handler
  const handleToggleFavorite = (dishName: string) => {
    const isFav = settings.favorites.includes(dishName);
    const nextFavs = isFav
      ? settings.favorites.filter((x) => x !== dishName)
      : [...settings.favorites, dishName];
    setSettings({ ...settings, favorites: nextFavs });
  };

  // Skip active date offset
  const handleDateOffset = (offset: number) => {
    const year = parseInt(currentDate.substring(0, 4));
    const month = parseInt(currentDate.substring(4, 6)) - 1;
    const day = parseInt(currentDate.substring(6, 8));

    const date = new Date(year, month, day);
    date.setDate(date.getDate() + offset);

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setCurrentDate(`${yyyy}${mm}${dd}`);
  };

  // Set today's date shortcut
  const handleSetToday = () => {
    setCurrentDate(getTodayString());
    setCurrentMealCode(getAutoMealCode());
  };

  // First setup selection
  const handleSchoolSelected = (school: School) => {
    setSettings((prev) => ({ ...prev, school }));
    // Clear old caches to prevent stale or cross-school meal displays!
    setSchoolMeals({});
    localStorage.removeItem("schoolLunch_meals_cache");
    setIsSearchOpen(false);
  };

  // Get today's main dish intelligently from the fetched schoolLunch_meals_cache
  const getTodayMainDish = (): { dishName: string; calories: string } => {
    const todayYmd = getTodayString();
    const mealsToday = schoolMeals[todayYmd] || [];
    // Prioritize lunch ("2") if available, then fallback to first active meal
    const activeTodayMeal = mealsToday.find((m) => m.mealCode === "2") || mealsToday[0];
    if (!activeTodayMeal || !activeTodayMeal.dishes || activeTodayMeal.dishes.length === 0) {
      return { dishName: "맛있는 요리", calories: "정보 없음" };
    }

    // Filter out typical generic side-dishes (rice, kimchi, etc) to find the star dish!
    const mainDishes = activeTodayMeal.dishes.filter((d) => {
      const text = d.name;
      return (
        !text.endsWith("밥") &&
        !text.includes("쌀밥") &&
        !text.includes("김치") &&
        !text.includes("배추김치") &&
        !text.includes("깍두기") &&
        !text.includes("소스") &&
        !text.includes("양념") &&
        !text.includes("고추장") &&
        !text.includes("우유") &&
        !text.includes("단무지")
      );
    });

    if (mainDishes.length > 0) {
      // Sort in descending order of name length to spot structural descriptions
      const sorted = [...mainDishes].sort((a, b) => b.name.length - a.name.length);
      return { 
        dishName: sorted[0].name.replace(/\([^)]*\)/g, "").trim(), 
        calories: activeTodayMeal.calories 
      };
    }

    return { 
      dishName: activeTodayMeal.dishes[0].name.replace(/\([^)]*\)/g, "").trim(), 
      calories: activeTodayMeal.calories 
    };
  };

  const triggerMealNotificationWithValues = (isEnabled: boolean) => {
    if (!settings.school) {
      // Prompt user to select a school first
      setActiveNotification({
        title: "초고속 급식표 ⚡",
        body: "아직 선택하신 학교가 없어요! 상단에서 우리 학교를 선택해 보세요 🏫",
        timeStr: "방금",
      });
      return;
    }

    const { dishName, calories } = getTodayMainDish();
    const todayYmd = getTodayString();
    const mealsToday = schoolMeals[todayYmd] || [];
    const hasMeals = mealsToday.length > 0;

    let notificationBody = "";
    if (hasMeals) {
      notificationBody = `오늘의 핵꿀맛 대표 메뉴: [${dishName}]! 완벽 식판 가이드 칼로리: ${calories} 🔥`;
    } else {
      notificationBody = `오늘의 식판 정보가 아직 없거나 주말이네요! 행복하고 건강한 하루 보내세요 🥪`;
    }

    // Attempt real browser notification
    if ("Notification" in window) {
      try {
        if (Notification.permission === "granted") {
          new Notification("초고속 급식표 ⚡", {
            body: notificationBody,
            icon: "/favicon.ico",
          });
        } else if (Notification.permission !== "denied" && isEnabled) {
          Notification.requestPermission();
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Always trigger the premium custom screen notification (reliable / sandbox safe)
    setActiveNotification({
      title: "초고속 급식표 ⚡ · 지금",
      body: notificationBody,
      timeStr: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    });
  };

  const triggerMealNotification = () => {
    triggerMealNotificationWithValues(settings.mealAlertEnabled || false);
  };

  // Automatically dismiss notification after 5 seconds
  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  // Session-load trigger once if enabled
  useEffect(() => {
    if (settings.mealAlertEnabled && !sessionStorage.getItem("meal_alert_triggered")) {
      const timer = setTimeout(() => {
        triggerMealNotification();
        sessionStorage.setItem("meal_alert_triggered", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [settings.mealAlertEnabled, schoolMeals]);

  // Determine current active weekday slide
  const getWeekDates = () => {
    const year = parseInt(currentDate.substring(0, 4));
    const month = parseInt(currentDate.substring(4, 6)) - 1;
    const day = parseInt(currentDate.substring(6, 8));
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
  };

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF9] via-[#F4F9FF] to-[#FFF1F5] text-zinc-800 font-sans antialiased relative overflow-x-hidden selection:bg-pink-200 selection:text-pink-800">
      
      {/* Playful and cute pastel bubbles background decoration */}
      <div className="absolute top-[-250px] left-1/4 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-r from-yellow-200/40 via-pink-200/40 to-sky-200/30 blur-[110px] pointer-events-none z-0" />
      <div className="absolute top-[400px] right-[-200px] w-[500px] h-[500px] rounded-full bg-[#FFE3E8]/50 blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[100px] left-[-200px] w-[500px] h-[500px] rounded-full bg-sky-100/50 blur-[100px] pointer-events-none z-0" />

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 relative z-10 flex flex-col min-h-screen justify-between">
        
        {/* Top Navbar Header */}
        <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-5 mb-5 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-pink-100">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-tr from-pink-400 via-pink-400 to-amber-300 shadow-lg shadow-pink-100/60 active:scale-95 transition-transform flex items-center justify-center shrink-0 w-11 h-11 sm:w-14 sm:h-14 overflow-hidden border-2 border-white/40">
              {/* Radial sheen highlight */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 pointer-events-none" />
              {/* Cute gourmet lunch box container with dynamic motion */}
              <motion.div 
                animate={{ rotate: [0, -6, 6, -3, 3, 0], y: [0, -1.5, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                className="text-2xl sm:text-3xl select-none filter drop-shadow-[0_2px_3px_rgba(219,39,119,0.25)] relative z-10"
              >
                🍱
              </motion.div>
              {/* Micro-sparkle decor */}
              <motion.span 
                animate={{ scale: [1, 1.25, 0.9, 1.1, 1], opacity: [0.7, 1, 0.6, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="absolute top-0.5 right-0.5 text-[9px] sm:text-[11px] z-10 select-none pointer-events-none"
              >
                ✨
              </motion.span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight font-sans bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent truncate">초고속 급식표 ⚡</h1>
                <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-mono font-bold bg-pink-100/80 text-pink-600 border border-pink-300/80 shadow-xs animate-pulse shrink-0">0.1초 순삭!</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-550 font-sans font-bold mt-0.5 tracking-wide truncate">우리 학교 급식을 가장 빠르게 확인하세요 🥞</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end mt-1 sm:mt-0">
            {/* Real-time Clock Widget */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-pink-300 bg-white text-xs sm:text-sm font-mono font-bold text-pink-600 shadow-md shadow-pink-100/40">
              <Clock size={14} className="text-pink-400 shrink-0" />
              <span>{currentTimeStr || "00:00:00"}</span>
            </div>

            {/* Meal Alert Small Icon Trigger */}
            <button
              type="button"
              onClick={() => setIsMealAlertOpen(true)}
              className={`relative flex items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer shadow-md w-9 h-9 sm:w-10 sm:h-10 shrink-0 ${
                settings.mealAlertEnabled 
                  ? "border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-550 shadow-pink-100/40" 
                  : "border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-400 shadow-zinc-100/40"
              }`}
              title="오늘의 급식 알리미 설정"
              id="meal-alert-trigger-btn"
            >
              <Bell size={16} className={settings.mealAlertEnabled ? "animate-pulse text-pink-500" : "text-zinc-400"} />
              {settings.mealAlertEnabled && (
                <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
              )}
            </button>

            {/* Change School Button */}
            {settings.school && (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-xs sm:text-sm text-indigo-600 font-sans font-bold transition-all cursor-pointer shadow-md shadow-indigo-100/50 truncate max-w-[170px] sm:max-w-none"
                id="change-school-btn"
              >
                <SchoolIcon size={14} className="shrink-0" />
                <span className="truncate font-black">{settings.school.schoolName}</span>
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Panels */}
        <main className="flex-1 space-y-5">
          {!settings.school ? (
            /* First-Time Setup Welcome Banner */
            <div className="relative overflow-hidden border-2 border-pink-300 bg-white rounded-3xl p-8 text-center my-8 flex flex-col items-center justify-center min-h-[400px] shadow-xl shadow-pink-100/50">
              {/* Abs mesh dot glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-pink-100/40 blur-[80px] pointer-events-none" />

              <div className="relative p-6 sm:p-7 rounded-3xl bg-gradient-to-tr from-pink-50 to-yellow-50/70 border-2 border-pink-200 text-pink-500 mb-5 shadow-lg shadow-pink-100/20 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="text-3xl sm:text-4xl filter drop-shadow-md select-none"
                >
                  🏫
                </motion.div>
                <div className="absolute bottom-1 right-1 bg-white border border-pink-200 rounded-full p-1 shadow-sm">
                  <Sparkles size={12} className="text-pink-400 fill-pink-100 animate-spin" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-zinc-805 tracking-tight font-sans">우리학교 급식표 연동하기 🏫</h2>
              <p className="text-zinc-500 text-sm max-w-md mt-2 mx-auto leading-relaxed">
                전국 모든 초·중·고등학교 급식 정보를 한눈에 지원해요!<br />
                🧸 폰 데이터가 느린 매점 뒤편에서도 0.1초 만에 슝- 로드할 수 있도록 로컬 공간에 안전하게 저장됩니다.
              </p>

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="mt-6 px-6 py-4 rounded-2xl bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-sm font-bold text-white transition-all shadow-lg shadow-pink-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-2 border-pink-300/30"
                id="setup-school-btn"
              >
                우리학교 선택하러 가기 🚀
              </button>
            </div>
          ) : (
            /* Activated Dashboard View */
            <div className="space-y-5">
              
              {/* Dynamic Date Swiper & Quick Switcher Module */}
              <div className="flex flex-col gap-3 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-pink-300 bg-white shadow-lg shadow-pink-100/40">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleDateOffset(-1)}
                      className="p-1.5 sm:p-2 rounded-xl border-2 border-zinc-300 hover:border-zinc-400 bg-white text-zinc-650 hover:text-zinc-900 active:scale-95 transition-all cursor-pointer shadow-md shadow-zinc-100/40 shrink-0"
                      title="이전날"
                    >
                      <ChevronLeft size={16} className="sm:size-[18px]" />
                    </button>
                    
                    {/* Interactive HTML5 Date Picker */}
                    <div 
                      onClick={(e) => {
                        try {
                          const input = e.currentTarget.querySelector('input');
                          if (input && typeof input.showPicker === 'function') {
                            input.showPicker();
                          }
                        } catch (err) {
                          console.log(err);
                        }
                      }}
                      className="relative flex-1 flex items-center justify-center min-w-0"
                    >
                      <span className="w-full px-2 sm:px-4 py-2 text-xs sm:text-base md:text-lg font-black text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border-2 border-indigo-300 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 font-sans tracking-tight hover:scale-[1.01] shadow-md shadow-indigo-100/40 text-center truncate">
                        📅 {formatDateString(currentDate)}
                      </span>
                      <input
                        type="date"
                        value={`${currentDate.substring(0, 4)}-${currentDate.substring(4, 6)}-${currentDate.substring(6, 8)}`}
                        onChange={(e) => {
                           if (e.target.value) {
                             const val = e.target.value.replace(/-/g, ""); // "YYYYMMDD"
                             setCurrentDate(val);
                           }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="직접 날짜 선택하기"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDateOffset(1)}
                      className="p-1.5 sm:p-2 rounded-xl border-2 border-zinc-300 hover:border-zinc-400 bg-white text-zinc-650 hover:text-zinc-900 active:scale-95 transition-all cursor-pointer shadow-md shadow-zinc-100/40 shrink-0"
                      title="다음날"
                    >
                      <ChevronRight size={16} className="sm:size-[18px]" />
                    </button>

                    {/* Sync Indicator positioned natively in the date picker row */}
                    <div className="relative shrink-0 flex items-center">
                      {/* Desktop Sync Badge */}
                      <div className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-mono font-bold text-zinc-650 bg-zinc-50 border-2 border-zinc-300 shadow-md shadow-zinc-100/30">
                        <span className={`w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-spin" : isCachedLoad ? "bg-green-400" : "bg-red-400"}`} />
                        <span>{loading ? "네이스 연동중" : isCachedLoad ? "보관함 불러옴 (0.1s)" : "연결 오류"}</span>
                      </div>

                      {/* Cute Compact Mobile Sync Icon Node */}
                      <div className="sm:hidden relative">
                        <button
                          type="button"
                          onClick={() => setShowMobileSync(!showMobileSync)}
                          onMouseEnter={() => setShowMobileSync(true)}
                          onMouseLeave={() => setShowMobileSync(false)}
                          className="flex items-center justify-center p-2 rounded-xl bg-zinc-50 border-2 border-zinc-300 shadow-md shadow-zinc-100/30 text-zinc-600 active:scale-95 transition-all"
                          title="상태 확인 (클릭)"
                        >
                          <span className={`w-2 h-2 rounded-full mr-1 ${loading ? "bg-amber-400 animate-spin" : isCachedLoad ? "bg-green-400" : "bg-red-400"}`} />
                          <span className="text-xs">💾</span>
                        </button>
                        
                        <AnimatePresence>
                          {showMobileSync && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 4 }}
                              className="absolute right-0 top-full mt-2 z-30 whitespace-nowrap bg-zinc-900 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg shadow-xl flex items-center gap-1.5 border border-zinc-700 pointer-events-none"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-spin" : isCachedLoad ? "bg-green-400" : "bg-red-400"}`} />
                              <span>{loading ? "네이스 연동중..." : isCachedLoad ? "보관함 불러옴" : "연결 오류"}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Today restoration button is rendered in a dedicated sleek row below only when not today */}
                  {!isToday(currentDate) && (
                    <motion.div 
                      initial={{ opacity: 0, y: -4 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full"
                    >
                      <button
                        type="button"
                        onClick={handleSetToday}
                        className="w-full text-center py-2 rounded-xl border-2 border-pink-300 hover:bg-pink-50 bg-white text-xs font-black text-pink-650 transition-all cursor-pointer shadow-md shadow-pink-100/40"
                      >
                        오늘로 갈래 ⏰
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Week Day Picker bar (Mon - Fri) */}
                <div className="grid grid-cols-5 gap-2 mt-1 border-t-2 border-pink-100 pt-4">
                  {weekDates.map((dateStr) => {
                    const isSelected = dateStr === currentDate;
                    const activeMealsCount = schoolMeals[dateStr]?.length || 0;
                    const parsed = formatDateString(dateStr);
                    const label = parsed.split(" ")[1] || ""; // e.g. "10일"
                    const dayLabel = parsed.substring(parsed.indexOf("(") + 1, parsed.indexOf(")")); // e.g. "수"
                    const isTodayRef = isToday(dateStr);

                    return (
                      <button
                        type="button"
                        key={dateStr}
                        onClick={() => setCurrentDate(dateStr)}
                        className={`py-2.5 p-1.5 relative rounded-2xl border-2 font-sans select-none text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "border-pink-400 bg-pink-100/50 text-pink-700 font-extrabold shadow-md shadow-pink-100/50 scale-[1.03]"
                            : "border-zinc-200 bg-zinc-50/65 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 shadow-sm"
                        }`}
                        id={`date-pill-${dateStr}`}
                      >
                        <span className="text-xs sm:text-sm font-extrabold opacity-75">{dayLabel}</span>
                        <span className="text-sm sm:text-base font-mono font-black mt-0.5">{label}</span>
                        
                        {/* Dot indicator for foods quantity */}
                        {activeMealsCount > 0 && (
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isSelected ? "bg-pink-500" : "bg-zinc-400"}`} />
                        )}
                        {/* Today boundary banner */}
                        {isTodayRef && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black bg-pink-500 text-white shadow-md shadow-pink-100/40 leading-none">
                            오늘
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main content flow - unified column for perfect readability */}
              <div className="space-y-5">
                
                {/* Meal Tab switcher block */}
                <div className={`gap-2.5 p-2 bg-white/95 border-2 border-pink-300 rounded-2xl shadow-md shadow-pink-100/45 ${
                  (hideBreakfast && hideDinner) ? "hidden sm:flex" : "flex"
                }`}>
                  {!hideBreakfast && (
                    <button
                      type="button"
                      onClick={() => setCurrentMealCode("1")}
                      className={`flex-1 py-3 px-2 rounded-xl text-sm sm:text-base font-black tracking-tight transition-all font-sans cursor-pointer ${
                        currentMealCode === "1" ? "bg-amber-100 border-2 border-amber-350 text-amber-800 font-extrabold shadow-md shadow-amber-100/50 scale-[1.01]" : "text-zinc-500 hover:text-zinc-800 border-2 border-transparent"
                      }`}
                      id="meal-tab-1"
                    >
                      조식 🌅
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentMealCode("2")}
                    className={`hidden sm:block flex-1 py-3 px-2 rounded-xl text-sm sm:text-base font-black tracking-tight transition-all font-sans cursor-pointer ${
                      currentMealCode === "2" ? "bg-pink-100 border-2 border-pink-350 text-pink-800 font-extrabold shadow-md shadow-pink-100/50 scale-[1.01]" : "text-zinc-500 hover:text-zinc-800 border-2 border-transparent"
                    }`}
                    id="meal-tab-2"
                  >
                    중식 ☀️
                  </button>
                  {!hideDinner && (
                    <button
                      type="button"
                      onClick={() => setCurrentMealCode("3")}
                      className={`flex-1 py-3 px-2 rounded-xl text-sm sm:text-base font-black tracking-tight transition-all font-sans cursor-pointer ${
                        currentMealCode === "3" ? "bg-purple-100 border-2 border-purple-350 text-purple-800 font-extrabold shadow-md shadow-purple-100/50 scale-[1.01]" : "text-zinc-500 hover:text-zinc-800 border-2 border-transparent"
                      }`}
                      id="meal-tab-3"
                    >
                      석식 🌌
                    </button>
                  )}
                </div>

                {/* Playful greeting message from 요정 마요 */}
                <div className="hidden sm:flex items-start gap-3 p-4 rounded-2xl border-2 border-yellow-300 bg-yellow-50/80 shadow-md shadow-yellow-100/40 relative overflow-hidden">
                  <span className="text-3xl shrink-0">🍮</span>
                  <div className="text-sm text-yellow-950 leading-relaxed font-sans font-bold">
                    <span className="font-extrabold text-yellow-850">요정 마요:</span> "
                    {currentMealCode === "1" 
                      ? "든든한 아침이 하루 1교시의 잠재력을 흔들어 깨운답니다! 🌅" 
                      : currentMealCode === "2"
                      ? "4교시 종이 치기 직전의 설렘, 오늘의 완벽한 식판을 스캔했어요! ✨ 맛있게 먹어요!"
                      : "오늘 하루 무사 무탈히 고생 많았어요! 따뜻한 저녁 먹고 힘내세요 🌌"
                    }"
                  </div>
                </div>

                {/* 나의 알레르기 설정 Accordion (Hidden/Collapsed by default) */}
                <div className="border-2 border-pink-300 bg-white rounded-2xl shadow-md shadow-pink-100/45 overflow-hidden transition-all hover:border-pink-400">
                  <button
                    type="button"
                    onClick={() => setIsAllergyOpen(!isAllergyOpen)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-pink-50/25 to-white hover:from-pink-50/45 hover:to-white transition-all cursor-pointer text-left focus:outline-none select-none"
                    id="allergy-accordion-trigger"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl sm:text-2xl shrink-0 animate-pulse">🛡️</span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                           <span className="font-sans font-black text-sm sm:text-base text-zinc-850">나의 알레르기 설정</span>
                          {settings.allergies.length > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] filter drop-shadow-xs font-mono font-bold bg-red-150 text-red-700 border-2 border-red-300 animate-bounce-once">
                              {settings.allergies.length}개 예방 중
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-black bg-zinc-150 text-zinc-550 border-2 border-zinc-300">
                              미사용
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 font-bold mt-0.5">식단표 안에서 맞지 않는 알레르기 성분이 포함된 메뉴를 사전에 강조 표시합니다.</p>
                      </div>
                    </div>
                    <div className="p-1 rounded-lg hover:bg-zinc-100/80 transition-colors">
                      <ChevronRight
                        className={`text-zinc-500 transition-transform duration-250 shrink-0 ${isAllergyOpen ? "rotate-90 text-pink-500" : ""}`}
                        size={18}
                      />
                    </div>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isAllergyOpen && (
                      <motion.div
                        key="allergy-accordion-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden border-t-2 border-pink-200"
                      >
                        <div className="p-4 bg-[#FCFDFE]">
                          <AllergySettings
                            selectedAllergies={settings.allergies}
                            onChangeAllergies={(allergies) => setSettings({ ...settings, allergies })}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>



                {/* Active Meal Display card */}
                <AnimatePresence mode="wait">
                  {loading && !activeMeal ? (
                    <div className="p-12 border-2 border-pink-300 bg-white rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg shadow-pink-100/45">
                      <RefreshCw className="animate-spin text-pink-400" size={32} />
                      <p className="text-sm font-mono text-pink-505 font-extrabold text-center">건강하고 푸짐한 식판을 챙겨오는 중...</p>
                    </div>
                  ) : activeMeal ? (
                    <motion.div
                      key={`${currentDate}_${currentMealCode}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <MealCard
                        meal={activeMeal}
                        selectedAllergies={settings.allergies}
                        favorites={settings.favorites}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    </motion.div>
                  ) : (
                    <div className="p-10 border-2 border-dashed border-zinc-300 bg-white rounded-3xl text-center shadow-md shadow-zinc-100/40 flex flex-col items-center justify-center gap-4">
                      <CalendarIcon size={38} className="text-zinc-450 stroke-1" />
                      <div>
                        <p className="text-base text-zinc-800 font-black">오늘은 급식 식단이 없습니다 🥛</p>
                        <p className="text-xs text-zinc-455 mt-1.5 font-bold">주말, 공휴일, 방학식이거나 급식이 제공되지 않는 날입니다.</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Quick stats on favorites */}
                {settings.favorites.length > 0 && (
                  <div className="p-5 border-2 border-amber-300 bg-amber-50/60 rounded-2xl shadow-md shadow-amber-100/45">
                    <div className="flex items-center gap-2 text-sm sm:text-base text-amber-800 font-black mb-3 font-sans">
                      <Heart size={16} className="fill-amber-500 text-amber-500" />
                      <span>나의 식판 위 최애 메뉴들 ({settings.favorites.length}개)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {settings.favorites.map((fav) => (
                        <span
                          key={fav}
                          onClick={() => handleToggleFavorite(fav)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs sm:text-sm font-extrabold bg-amber-100 hover:bg-amber-200 text-amber-855 font-sans border-2 border-amber-300 transition-all cursor-pointer active:scale-95 shadow-md shadow-amber-100/40"
                        >
                          <span>⭐</span>
                          <span>{fav}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </main>

        {/* Footer Area with instructions */}
        <footer className="mt-12 py-6 border-t border-pink-100 text-center">
          <p className="text-[13px] sm:text-sm text-zinc-500 font-mono font-medium">© 2026 School Lunch Menu · by cybereun</p>
        </footer>

        {/* Search Modal overlays */}
        {isSearchOpen || !settings.school ? (
          <SchoolSearchModal
            onSelectSchool={handleSchoolSelected}
            onClose={() => setIsSearchOpen(false)}
            canClose={!!settings.school}
          />
        ) : null}

        {/* Meal Alert Settings Modal Popup */}
        <AnimatePresence>
          {isMealAlertOpen && (
            <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs select-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="w-full max-w-sm bg-white rounded-3xl border-2 border-pink-200 shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-4 border-b border-pink-100 bg-pink-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔔</span>
                    <span className="font-sans font-black text-sm sm:text-base text-zinc-850">오늘의 급식 알리미</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMealAlertOpen(false)}
                    className="text-zinc-450 hover:text-zinc-600 p-1 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl transition-all cursor-pointer shadow-xs font-black text-xs w-7 h-7 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-5 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-pink-400 to-amber-300 shadow-lg shadow-pink-200/50 text-white shrink-0 relative">
                      <Bell size={26} className={settings.mealAlertEnabled ? "animate-bounce" : ""} />
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-sans font-black text-zinc-700">식판 정보 가상 알림</span>
                        {settings.mealAlertEnabled ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] filter drop-shadow-xs font-mono font-bold bg-green-100 text-green-700 border border-green-300 animate-pulse">
                            활성화됨
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-sans font-black bg-zinc-150 text-zinc-550 border border-zinc-300">
                            미사용
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-bold mt-2 leading-relaxed max-w-[240px] mx-auto">
                        매일 식단이 열릴 때 최애 메뉴나 엄선된 환상의 대표 반찬을 담은 가상 고속 알림을 받아봅니다.
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-50/60 border-2 border-zinc-100 rounded-2xl p-3.5 flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-zinc-650">오늘의 급식 알리미 사용</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.mealAlertEnabled}
                      onClick={() => {
                        const nextVal = !settings.mealAlertEnabled;
                        setSettings({ ...settings, mealAlertEnabled: nextVal });
                        if (nextVal) {
                          setTimeout(() => {
                            triggerMealNotificationWithValues(nextVal);
                          }, 150);
                        }
                      }}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.mealAlertEnabled ? "bg-pink-500" : "bg-zinc-200"
                      }`}
                      title="오늘의 급식 알림 토글"
                    >
                      <span
                        className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.mealAlertEnabled ? "translate-x-4.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {settings.mealAlertEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerMealNotification();
                      }}
                      className="w-full text-xs font-black py-2.5 rounded-xl border-2 border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-650 transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-pink-100/20 flex items-center justify-center gap-1.5"
                    >
                      <span>알림 미리보기 테스트 ⚡</span>
                    </button>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsMealAlertOpen(false)}
                    className="px-3.5 py-1.5 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-xs font-black text-zinc-700 transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    확인
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Glassmorphic Simulated Native Notification Push Panel */}
        <AnimatePresence>
          {activeNotification && (
            <motion.div
              initial={{ opacity: 0, y: -80, scale: 0.92 }}
              animate={{ opacity: 1, y: 16, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="fixed left-1/2 -translate-x-1/2 top-4 z-[9999] w-[92%] max-w-[380px] bg-white/95 backdrop-blur-md rounded-2xl border-2 border-zinc-200 shadow-2xl p-4 flex items-start gap-3 select-none pointer-events-auto"
            >
              {/* Native App Icon visual */}
              <div className="p-2 ml-0.5 rounded-xl bg-gradient-to-tr from-pink-500 to-amber-300 shadow-md shadow-pink-200 text-white shrink-0">
                <Sparkles size={16} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pr-1 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-800">{activeNotification.title}</span>
                  <span className="text-[10px] font-medium text-zinc-400 font-mono">{activeNotification.timeStr}</span>
                </div>
                <p className="text-xs font-bold mt-1 text-zinc-650 leading-relaxed">
                  {activeNotification.body}
                </p>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setActiveNotification(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="알림 닫기"
              >
                <span className="text-xs font-bold">✕</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
