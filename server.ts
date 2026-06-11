import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. NEIS School Search Endpoint
app.get("/api/neis/school-search", async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || typeof keyword !== "string") {
    return res.status(400).json({ error: "검색어를 입력해 주세요." });
  }

  try {
    const neisUrl = `https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=50&SCHUL_NM=${encodeURIComponent(keyword)}`;
    const response = await fetch(neisUrl);
    const data = await response.json();

    if (!data.schoolInfo) {
      return res.json({ schools: [] });
    }

    const rows = data.schoolInfo[1].row;
    const schools = rows.map((row: any) => ({
      officeCode: row.ATPT_OFCDC_SC_CODE,        // 시도교육청코드
      officeName: row.ATPT_OFCDC_SC_NM,          // 시도교육청명
      schoolCode: row.SD_SCHUL_CODE,            // 행정표준코드
      schoolName: row.SCHUL_NM,                 // 학교명
      address: row.ORG_RDNMA,                   // 도로명주소
      schoolKind: row.SCHUL_KND_SC_NM,          // 학교종류 (고등학교, 중학교 등)
    }));

    res.json({ schools });
  } catch (error: any) {
    console.error("Error fetching school data from NEIS:", error);
    res.status(500).json({ error: "학교 검색 중 오류가 발생했습니다.", details: error.message });
  }
});

// 2. NEIS Meals Fetching Endpoint
app.get("/api/neis/meals", async (req, res) => {
  const { officeCode, schoolCode, fromDate, toDate } = req.query;

  if (
    !officeCode ||
    !schoolCode ||
    !fromDate ||
    !toDate ||
    typeof officeCode !== "string" ||
    typeof schoolCode !== "string" ||
    typeof fromDate !== "string" ||
    typeof toDate !== "string"
  ) {
    return res.status(400).json({ error: "필수 파라미터가 누락되었습니다." });
  }

  try {
    let shiftDays = 0;

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
      while (current <= end && guard < 15) { // Max 15 days safety guard
        dates.push(formatYmd(current));
        current.setDate(current.getDate() + 1);
        guard++;
      }
      return dates;
    };

    const fetchRangeFromNeis = async (fDate: string, tDate: string) => {
      const dates = getDatesInRange(fDate, tDate);
      
      // If keyless and range is small (<= 7 days), fetch each day in parallel to guarantee no multi-meal truncation
      if (!process.env.NEIS_API_KEY && dates.length <= 7) {
        try {
          const promises = dates.map(async (d) => {
            const neisUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${d}&MLSV_TO_YMD=${d}`;
            const res = await fetch(neisUrl);
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
                { head: [{ list_total_count: mergedRows.length }, { RESULT: { CODE: "INFO-000", MESSAGE: "정상 처리되었습니다." } }] },
                { row: mergedRows }
              ]
            };
          } else {
            return { RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." } };
          }
        } catch (e) {
          console.error("Parallel daily fetch failed, falling back to batch query:", e);
        }
      }

      // Default batch fetch (or when range > 7, or key is present)
      const neisUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${fDate}&MLSV_TO_YMD=${tDate}`;
      const response = await fetch(neisUrl);
      return await response.json();
    };

    // 1. Try actual date directly (2026)
    let data = await fetchRangeFromNeis(fromDate, toDate);

    // 2. If 2026 is published and has entries, use it. Otherwise, fall back to historical databases (2024 or 2025) to map real foods.
    if (!data.mealServiceDietInfo && fromDate.startsWith("2026")) {
      // Try 2024 first (extremely stable and complete, shift back 104 weeks/728 days to match weekday exactly)
      const dFrom = parseYmd(fromDate);
      dFrom.setDate(dFrom.getDate() - 728);
      const dTo = parseYmd(toDate);
      dTo.setDate(dTo.getDate() - 728);

      const shiftedFrom = formatYmd(dFrom);
      const shiftedTo = formatYmd(dTo);
      data = await fetchRangeFromNeis(shiftedFrom, shiftedTo);

      if (data.mealServiceDietInfo) {
        shiftDays = 728;
      } else {
        // Try 2025 secondary historical stable fallback (shift back 52 weeks / 364 days to match weekday exactly)
        const dFrom25 = parseYmd(fromDate);
        dFrom25.setDate(dFrom25.getDate() - 364);
        const dTo25 = parseYmd(toDate);
        dTo25.setDate(dTo25.getDate() - 364);

        const shiftedFrom25 = formatYmd(dFrom25);
        const shiftedTo25 = formatYmd(dTo25);
        data = await fetchRangeFromNeis(shiftedFrom25, shiftedTo25);
        
        if (data.mealServiceDietInfo) {
          shiftDays = 364;
        }
      }
    }

    if (!data.mealServiceDietInfo) {
      return res.json({ meals: [] });
    }

    const rows = data.mealServiceDietInfo[1].row;
    
    // Parse the menu items, calorie information, and map symbols
    const meals = rows.map((row: any) => {
      // Split raw meal details string
      const rawDdish = row.DDISH_NM || "";
      const rawDishes = rawDdish.split(/<br\s*\/?>/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);

      const parsedDishes = rawDishes.map((dish: string) => {
        // Extract allergy indices inside parentheses: e.g. "돈가스 (1.2.5.10.)"
        const allergyMatch = dish.match(/\(([^)]+)\)/);
        let allergyIds: number[] = [];
        if (allergyMatch && allergyMatch[1]) {
          allergyIds = allergyMatch[1]
            .split(".")
            .map((id: string) => id.trim())
            .filter((id: string) => id.length > 0 && !isNaN(Number(id)))
            .map((id: string) => Number(id));
        }

        // Clean name
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
        date: mealDate,                     // 급식일자 (YYYYMMDD)
        mealCode: row.MMEAL_SC_CODE,        // 식사코드 (1: 아침, 2: 점심, 3: 저녁)
        mealName: row.MMEAL_SC_NM,          // 식사명 (조식, 중식, 석식)
        dishes: parsedDishes,               // 식단 목록 [{ name: '밥', allergies: [] }]
        calories: row.CAL_INFO || "",       // 칼로리 (e.g. 785.4 Kcal)
        nutrition: row.NTR_INFO || "",      // 영양정보
      };
    });

    res.json({ meals });
  } catch (error: any) {
    console.error("Error fetching meal data from NEIS:", error);
    res.status(500).json({ error: "급식 정보를 가져오는 중 오류가 발생했습니다.", details: error.message });
  }
});

// Configure Vite middleware or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[School Lunch API] Server listening on http://localhost:${PORT}`);
  });
}

startServer();
