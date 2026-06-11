import React, { useState } from "react";
import { Search, MapPin, School as SchoolIcon, Loader2, Sparkles, X } from "lucide-react";
import { School } from "../types";

interface SchoolSearchModalProps {
  onSelectSchool: (school: School) => void;
  onClose?: () => void;
  canClose: boolean;
}

export default function SchoolSearchModal({ onSelectSchool, onClose, canClose }: SchoolSearchModalProps) {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let schoolsList: School[] = [];
      try {
        const response = await fetch(`/api/neis/school-search?keyword=${encodeURIComponent(keyword)}`);
        if (!response.ok) throw new Error("Local API Fail");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) throw new Error("Not JSON");
        const data = await response.json();
        schoolsList = data.schools || [];
      } catch (proxyError) {
        // Fallback to direct client-side fetch to NEIS API (CORS is open on open.neis.go.kr)
        const neisUrl = `https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=50&SCHUL_NM=${encodeURIComponent(keyword)}`;
        const neisRes = await fetch(neisUrl);
        if (!neisRes.ok) throw new Error("NEIS API Direct Fail");
        const neisData = await neisRes.json();
        if (neisData.schoolInfo && neisData.schoolInfo[1] && neisData.schoolInfo[1].row) {
          const rows = neisData.schoolInfo[1].row;
          schoolsList = rows.map((row: any) => ({
            officeCode: row.ATPT_OFCDC_SC_CODE,        // 시도교육청코드
            officeName: row.ATPT_OFCDC_SC_NM,          // 시도교육청명
            schoolCode: row.SD_SCHUL_CODE,            // 행정표준코드
            schoolName: row.SCHUL_NM,                 // 학교명
            address: row.ORG_RDNMA,                   // 도로명주소
            schoolKind: row.SCHUL_KND_SC_NM,          // 학교종류 (고등학교, 중학교 등)
          }));
        }
      }

      setSchools(schoolsList);
      if (schoolsList.length === 0) {
        setError("검색 결과가 없습니다. 학교 이름을 정확하게 입력해 주세요! 🧸 (예: '대구고', '서울과고')");
      }
    } catch (err: any) {
      setError("학교를 찾는 도중 오류가 났어요. 잠시 후에 다시 검색해 주세요 🥺");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden border-2 border-pink-300 bg-white/95 rounded-3xl shadow-2xl shadow-pink-150/40 p-6">
        
        {/* Cute Top Accent Border */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-pink-300 via-purple-300 to-amber-300" />
        
        {canClose && onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X size={18} />
          </button>
        )}

        <div className="flex items-center gap-2 mb-5">
          <div className="p-2.5 rounded-2xl bg-pink-100 text-pink-500">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-800 font-sans tracking-tight">급식표 불러오기 🏫</h2>
            <p className="text-xs text-zinc-400 font-semibold mt-0.5">첫 1회 학교 설정 후, 매점가듯 번개속도로 확인하세요! 🚀</p>
          </div>
        </div>

        {/* Search Field */}
        <form onSubmit={handleSearch} className="relative flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="학교 이름 검색 (예: 경기고, 여의도중)"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-zinc-300 bg-zinc-50/70 text-sm text-zinc-805 placeholder:text-zinc-400 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100/50 transition-all font-sans font-bold"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-amber-300 border-2 border-pink-300 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center gap-1 shrink-0 font-sans cursor-pointer shadow-lg shadow-pink-100 hover:scale-[1.02] active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "검색"}
          </button>
        </form>

        {/* Results Stream */}
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {error && (
            <p className="text-xs text-red-600 leading-normal bg-red-50 border border-red-100 p-3 rounded-2xl font-bold">
              {error}
            </p>
          )}
          
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="animate-spin text-pink-400" size={28} />
              <p className="text-xs font-mono font-bold">가장 빠른 급식 노선을 탐색 중...</p>
            </div>
          )}

          {!loading && schools.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-400 font-mono font-extrabold tracking-wider">검색 결과 ({schools.length}개)</p>
              {schools.map((sch) => (
                <button
                  type="button"
                  key={sch.schoolCode}
                  onClick={() => onSelectSchool(sch)}
                  className="w-full text-left p-3.5 rounded-2xl border-2 border-zinc-200 bg-zinc-50/30 hover:bg-pink-50/20 hover:border-pink-300 hover:scale-[1.01] transition-all group flex gap-3 items-start outline-none focus:border-pink-400 shadow-md shadow-zinc-100/40 cursor-pointer"
                  id={`school-item-${sch.schoolCode}`}
                >
                  <div className="p-2 rounded-xl bg-zinc-100 border-2 border-zinc-200 text-zinc-400 group-hover:bg-pink-100 group-hover:text-pink-500 group-hover:border-pink-300 transition-all shrink-0">
                    <SchoolIcon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-zinc-700 group-hover:text-pink-600 transition-colors tracking-tight leading-none">{sch.schoolName}</span>
                      <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-500 border-2 border-zinc-205 font-mono">{sch.schoolKind}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-zinc-400 text-xs font-medium">
                      <MapPin size={12} className="shrink-0 text-pink-400" />
                      <span className="truncate">{sch.address}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">교육청: {sch.officeName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && schools.length === 0 && !error && (
            <div className="py-12 text-center text-zinc-400">
              <SchoolIcon size={32} className="mx-auto text-pink-200 mb-2 stroke-1" />
              <p className="text-xs font-bold text-zinc-400">우리들의 학교 이름을 위 칸에 쓰고 검색해 보세요! 🍭</p>
              <p className="text-[10px] opacity-70 mt-1 font-medium">예: 서울중, 한성고, 동래중, 여의도초 등</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
