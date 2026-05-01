"use client";

interface SectionMetaFieldsProps {
  difficultyLevel?: string;
  ageRangeMin?: number | null;
  ageRangeMax?: number | null;
  durationMinutes?: number | null;
  onChange: (field: string, value: string | number | null) => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
  EXPERT: "Experto",
};

export function SectionMetaFields({
  difficultyLevel,
  ageRangeMin,
  ageRangeMax,
  durationMinutes,
  onChange,
}: SectionMetaFieldsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-bg rounded-xl">
      <div>
        <label className="text-xs text-text-muted block mb-1">Nivel</label>
        <select
          defaultValue={difficultyLevel ?? "BEGINNER"}
          onChange={(e) => onChange("difficultyLevel", e.target.value)}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface"
        >
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">Edad min.</label>
        <input
          type="number"
          defaultValue={ageRangeMin ?? ""}
          placeholder="5"
          onChange={(e) => onChange("ageRangeMin", e.target.value ? Number(e.target.value) : null)}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5"
        />
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">Edad max.</label>
        <input
          type="number"
          defaultValue={ageRangeMax ?? ""}
          placeholder="18"
          onChange={(e) => onChange("ageRangeMax", e.target.value ? Number(e.target.value) : null)}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5"
        />
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">Duración (min)</label>
        <input
          type="number"
          defaultValue={durationMinutes ?? ""}
          placeholder="45"
          onChange={(e) => onChange("durationMinutes", e.target.value ? Number(e.target.value) : null)}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5"
        />
      </div>
    </div>
  );
}
