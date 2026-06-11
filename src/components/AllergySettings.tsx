import { ALLERGENS, AllergyInfo } from "../types";
import { Sparkles, Shield, RefreshCw } from "lucide-react";

interface AllergySettingsProps {
  selectedAllergies: number[];
  onChangeAllergies: (allergies: number[]) => void;
}

export default function AllergySettings({ selectedAllergies, onChangeAllergies }: AllergySettingsProps) {
  
  const handleToggle = (id: number) => {
    if (selectedAllergies.includes(id)) {
      onChangeAllergies(selectedAllergies.filter((x) => x !== id));
    } else {
      onChangeAllergies([...selectedAllergies, id]);
    }
  };

  const handleClear = () => {
    onChangeAllergies([]);
  };

  return (
    <div id="allergy-settings-pane" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-pink-50">
        <p className="text-xs sm:text-sm text-zinc-500 font-bold">
          {selectedAllergies.length > 0 
            ? `⚠️ 현재 ${selectedAllergies.length}개 위험 물질 감지 필터 작동 중` 
            : "✔️ 식품 성분을 선택해 알레르기 강조 표시를 작동시키세요."}
        </p>
        {selectedAllergies.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold text-pink-500 hover:text-pink-600 bg-pink-50 hover:bg-pink-100 transition-all cursor-pointer shadow-md shadow-pink-100/40 border-2 border-pink-300 self-start sm:self-auto"
          >
            <RefreshCw size={11} className="shrink-0" />
            선택 초기화 ({selectedAllergies.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ALLERGENS.map((allergen) => {
          const isSelected = selectedAllergies.includes(allergen.id);
          return (
            <button
              type="button"
              key={allergen.id}
              onClick={() => handleToggle(allergen.id)}
              className={`py-2 px-1 relative overflow-hidden rounded-xl border-2 text-center transition-all cursor-pointer font-sans select-none flex flex-col items-center gap-1 ${
                isSelected
                  ? "border-red-400 bg-red-50 text-red-655 shadow-md shadow-red-100/50 scale-[1.03]"
                  : "border-zinc-200 bg-zinc-50/30 hover:bg-white hover:border-pink-350 hover:scale-[1.01] text-zinc-500 hover:text-zinc-850 shadow-sm"
              }`}
              id={`allergen-toggle-${allergen.id}`}
            >
              <span className="text-lg sm:text-xl">{allergen.emoji}</span>
              <span className="text-xs font-black tracking-tight truncate w-full px-0.5">{allergen.name}</span>
              {isSelected && (
                <div className="absolute top-1 right-0.5 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>
      
      {selectedAllergies.length > 0 && (
        <div className="py-2.5 px-3.5 rounded-xl bg-red-100/30 border-2 border-red-350 flex gap-2 items-center shadow-md shadow-red-100/40">
          <div className="text-xs sm:text-sm text-red-700 leading-relaxed font-bold">
            💡 위 선택 성분이 표기된 급식 반찬은 빨간색 강조 테두리 및 아이콘🛡️으로 표시되어 위험 요소를 미리 볼 수 있습니다:{" "}
            <span className="font-extrabold text-red-800 underline">
              {selectedAllergies.map(id => ALLERGENS.find(a => a.id === id)?.name).join(", ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
