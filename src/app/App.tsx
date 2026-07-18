import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  ChefHat,
  ClipboardCopy,
  Layers,
  Lock,
  Minus,
  Plus,
  Save,
  Soup,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import "../styles/index.css";
import "./app.css";

type Mode = "general" | "pro";
type PresetId = "shoyu" | "jiro" | "iekei" | "paitan";
type RightTab = "arrangement" | "soup" | "noodle" | "save" | "manual";
type BowlStyleId = "porcelain" | "black" | "red" | "wood" | "celadon";

type ToppingType =
  | "chashu"
  | "rareChashu"
  | "ajitama"
  | "nori"
  | "naruto"
  | "menma"
  | "moyashi"
  | "spinach"
  | "cabbage"
  | "greenOnion"
  | "corn"
  | "butter"
  | "itoTogarashi"
  | "shiraganegi"
  | "mizuna"
  | "tomato"
  | "kikurage"
  | "eggplant"
  | "redOnion"
  | "redCabbage";

interface ToppingItem {
  id: string;
  type: ToppingType;
  x: number;
  y: number;
  count: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

interface ToppingMeta {
  type: ToppingType;
  jp: string;
  max: number;
  baseScale: number;
  defaultCount: number;
  color: string;
}

interface SavedRamen {
  id: string;
  title: string;
  createdAt: string;
  preset: PresetId;
  soupColor: string;
  bowlStyle: BowlStyleId;
  toppings: ToppingItem[];
  tare: number;
  aromaOil: number;
  noodleHardness: number;
  noodleAmount: number;
}

const SAVE_KEY = "rapla_v3";
const FREE_SAVE_LIMIT = 3;
const BOWL_CX = 150;
const BOWL_CY = 150;
const BOWL_SOUP_R = 114;

const toppingsMeta: ToppingMeta[] = [
  { type: "chashu", jp: "チャーシュー", max: 5, baseScale: 2.2, defaultCount: 2, color: "#b86845" },
  { type: "rareChashu", jp: "レアチャーシュー", max: 5, baseScale: 2.2, defaultCount: 2, color: "#d48a86" },
  { type: "ajitama", jp: "味玉・煮卵", max: 3, baseScale: 2, defaultCount: 1, color: "#f4b145" },
  { type: "nori", jp: "のり", max: 5, baseScale: 1.6, defaultCount: 1, color: "#213327" },
  { type: "naruto", jp: "なると", max: 3, baseScale: 1.8, defaultCount: 1, color: "#ff8db0" },
  { type: "menma", jp: "メンマ", max: 1, baseScale: 1.5, defaultCount: 4, color: "#c9913d" },
  { type: "moyashi", jp: "もやし", max: 1, baseScale: 1.2, defaultCount: 6, color: "#f8f1cd" },
  { type: "spinach", jp: "ほうれん草", max: 1, baseScale: 1.6, defaultCount: 4, color: "#256f43" },
  { type: "cabbage", jp: "キャベツ", max: 1, baseScale: 1.8, defaultCount: 3, color: "#9cc568" },
  { type: "greenOnion", jp: "ネギ", max: 1, baseScale: 1, defaultCount: 8, color: "#6fbf66" },
  { type: "corn", jp: "コーン", max: 1, baseScale: 0.9, defaultCount: 10, color: "#ffd23f" },
  { type: "butter", jp: "バター", max: 2, baseScale: 1.6, defaultCount: 1, color: "#ffe36b" },
  { type: "itoTogarashi", jp: "糸唐辛子", max: 1, baseScale: 1.3, defaultCount: 5, color: "#d92012" },
  { type: "shiraganegi", jp: "白髪ねぎ", max: 1, baseScale: 1.3, defaultCount: 6, color: "#fbfaf0" },
  { type: "mizuna", jp: "水菜", max: 1, baseScale: 1.6, defaultCount: 3, color: "#3f9c61" },
  { type: "tomato", jp: "カットトマト", max: 1, baseScale: 1.8, defaultCount: 2, color: "#e14538" },
  { type: "kikurage", jp: "きくらげ", max: 1, baseScale: 1.6, defaultCount: 3, color: "#26201d" },
  { type: "eggplant", jp: "なす", max: 1, baseScale: 1.8, defaultCount: 2, color: "#5b3a87" },
  { type: "redOnion", jp: "赤玉ねぎ", max: 3, baseScale: 1.8, defaultCount: 2, color: "#b94977" },
  { type: "redCabbage", jp: "レッドキャベツ", max: 1, baseScale: 1.8, defaultCount: 3, color: "#8d3a83" },
];

const presets: Record<PresetId, { jp: string; soup: string; accent: string; toppings: ToppingType[] }> = {
  shoyu: { jp: "中華そば", soup: "#9b5a26", accent: "#f2b800", toppings: ["chashu", "ajitama", "menma", "nori", "greenOnion", "naruto"] },
  jiro: { jp: "ガッツリ系", soup: "#c48a35", accent: "#e8431a", toppings: ["chashu", "moyashi", "cabbage", "greenOnion", "ajitama"] },
  iekei: { jp: "家系", soup: "#b78938", accent: "#2f7d52", toppings: ["chashu", "spinach", "nori", "greenOnion", "ajitama"] },
  paitan: { jp: "白湯", soup: "#ead9af", accent: "#3569a8", toppings: ["rareChashu", "mizuna", "redOnion", "itoTogarashi", "ajitama"] },
};

const bowlStyles: Record<BowlStyleId, { jp: string; outer: string; inner: string; rim: string }> = {
  porcelain: { jp: "白磁", outer: "#fff7ea", inner: "#f8ead2", rim: "#1c1008" },
  black: { jp: "黒釉", outer: "#24201e", inner: "#413731", rim: "#1c1008" },
  red: { jp: "朱赤", outer: "#d83b24", inner: "#ffb04f", rim: "#1c1008" },
  wood: { jp: "木目", outer: "#a46432", inner: "#d69a54", rim: "#1c1008" },
  celadon: { jp: "青磁", outer: "#abd1bd", inner: "#ddf0de", rim: "#1c1008" },
};

function metaOf(type: ToppingType) {
  return toppingsMeta.find((item) => item.type === type) ?? toppingsMeta[0];
}

function clusterPos(count: number, spreadScale: number): { dx: number; dy: number; rot: number }[] {
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return { dx: 0, dy: 0, rot: 0 };
    const a = i * 137.508 * (Math.PI / 180);
    const r = Math.min(Math.sqrt(i) * 9 * spreadScale, 38);
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, rot: (i * 73.7) % 360 };
  });
}

function lighten(hex: string, ratio = 0.18) {
  const source = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!source) return hex;
  const n = Number.parseInt(source[1], 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + 255 * ratio));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + 255 * ratio));
  const b = Math.min(255, Math.round((n & 255) + 255 * ratio));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function ToppingSprite({ type, size = 30 }: { type: ToppingType; size?: number }) {
  const meta = metaOf(type);
  const stroke = "#1c1008";

  if (type === "nori") {
    return <rect x="-11" y="-17" width="22" height="34" rx="2" fill={meta.color} stroke={stroke} strokeWidth="2" />;
  }
  if (type === "ajitama") {
    return (
      <g>
        <ellipse cx="0" cy="0" rx="13" ry="16" fill="#fff0c2" stroke={stroke} strokeWidth="2" />
        <circle cx="2" cy="1" r="7" fill={meta.color} stroke={stroke} strokeWidth="1.5" />
      </g>
    );
  }
  if (type === "naruto") {
    return (
      <g>
        <circle r="14" fill="#fff7fb" stroke={stroke} strokeWidth="2" />
        <path d="M-5 1c2-9 16-4 9 5-5 6-15 1-8-7" fill="none" stroke={meta.color} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "itoTogarashi" || type === "shiraganegi") {
    return (
      <g stroke={meta.color} strokeWidth="2.4" strokeLinecap="round">
        <path d="M-15 8 C-5 -11 3 -9 15 -14" />
        <path d="M-12 -3 C1 2 8 -4 16 7" />
        <path d="M-8 13 C-3 1 7 2 12 -8" />
      </g>
    );
  }
  if (type === "corn") {
    return <circle r="7" fill={meta.color} stroke={stroke} strokeWidth="1.8" />;
  }
  if (type === "butter") {
    return <rect x="-12" y="-10" width="24" height="20" rx="4" fill={meta.color} stroke={stroke} strokeWidth="2" />;
  }
  if (["menma", "moyashi", "greenOnion", "mizuna", "spinach"].includes(type)) {
    return <rect x="-4" y="-17" width="8" height="34" rx="4" fill={meta.color} stroke={stroke} strokeWidth="1.5" transform="rotate(18)" />;
  }
  if (["tomato", "eggplant", "redOnion", "redCabbage", "cabbage", "kikurage"].includes(type)) {
    return <path d="M-14-4C-12-17 10-16 15-3 20 11 4 19-9 12-17 8-17 1-14-4Z" fill={meta.color} stroke={stroke} strokeWidth="2" />;
  }
  return (
    <g>
      <ellipse cx="0" cy="0" rx={size * 0.48} ry={size * 0.34} fill={meta.color} stroke={stroke} strokeWidth="2" />
      <path d="M-12-1C-5-8 7-8 13 0" fill="none" stroke={lighten(meta.color, 0.24)} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="slider">
      <span>
        {label}
        <strong>
          {value}
          {suffix}
        </strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CeramicBowl({
  toppings,
  selectedId,
  soupColor,
  bowlStyle,
  onSelect,
  onMove,
}: {
  toppings: ToppingItem[];
  selectedId: string | null;
  soupColor: string;
  bowlStyle: BowlStyleId;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const bowlRef = useRef<SVGSVGElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const style = bowlStyles[bowlStyle];

  useEffect(() => {
    if (!dragId) return;
    const onMoveWindow = (event: MouseEvent | TouchEvent) => {
      const rect = bowlRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = "touches" in event ? event.touches[0] : event;
      if (!point) return;
      event.preventDefault();
      const normX = ((point.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((point.clientY - rect.top) / rect.height) * 2 - 1;
      const len = Math.hypot(normX, normY);
      const cap = 0.87;
      const fx = len > cap ? (normX / len) * cap : normX;
      const fy = len > cap ? (normY / len) * cap : normY;
      onMove(dragId, Number(fx.toFixed(3)), Number(fy.toFixed(3)));
    };
    const onUp = () => setDragId(null);
    window.addEventListener("mousemove", onMoveWindow);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMoveWindow, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMoveWindow);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMoveWindow);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragId, onMove]);

  return (
    <svg ref={bowlRef} viewBox="0 0 300 300" className="bowl" style={{ touchAction: "none" }} aria-label="ラーメンどんぶり">
      <defs>
        <radialGradient id="soup" cx="50%" cy="43%">
          <stop offset="0%" stopColor={lighten(soupColor, 0.16)} />
          <stop offset="100%" stopColor={soupColor} />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="4" dy="5" stdDeviation="1.2" floodColor="#1c1008" floodOpacity="0.28" />
        </filter>
      </defs>
      <circle cx="150" cy="150" r="143" fill={style.outer} stroke="#1c1008" strokeWidth="5" filter="url(#softShadow)" />
      <circle cx="150" cy="150" r="124" fill={style.inner} stroke={style.rim} strokeWidth="4" />
      <circle cx="150" cy="150" r={BOWL_SOUP_R} fill="url(#soup)" stroke="#1c1008" strokeWidth="2" />
      <path d="M58 137C86 116 212 114 241 139" fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="10" strokeLinecap="round" />
      {[...toppings].sort((a, b) => a.zIndex - b.zIndex).map((topping) => {
        const meta = metaOf(topping.type);
        const svgX = topping.x * (BOWL_SOUP_R - 22) + BOWL_CX;
        const svgY = topping.y * (BOWL_SOUP_R - 22) + BOWL_CY;
        const pieces = clusterPos(topping.count, topping.scale);
        return (
          <g
            key={topping.id}
            transform={`translate(${svgX} ${svgY}) rotate(${topping.rotation}) scale(${meta.baseScale * topping.scale * 0.42})`}
            className={selectedId === topping.id ? "topping selected" : "topping"}
            role="button"
            tabIndex={0}
            onMouseDown={() => {
              onSelect(topping.id);
              setDragId(topping.id);
            }}
            onTouchStart={(event) => {
              event.preventDefault();
              onSelect(topping.id);
              setDragId(topping.id);
            }}
          >
            {pieces.map((piece, index) => (
              <g key={index} transform={`translate(${piece.dx} ${piece.dy}) rotate(${piece.rot})`}>
                <ToppingSprite type={topping.type} />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>("general");
  const [preset, setPreset] = useState<PresetId>("shoyu");
  const [rightTab, setRightTab] = useState<RightTab>("arrangement");
  const [soupColor, setSoupColor] = useState(presets.shoyu.soup);
  const [bowlStyle, setBowlStyle] = useState<BowlStyleId>("porcelain");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toppings, setToppings] = useState<ToppingItem[]>(() => createPresetToppings("shoyu"));
  const [saved, setSaved] = useState<SavedRamen[]>([]);
  const [title, setTitle] = useState("試作ラーメン 01");
  const [tare, setTare] = useState(42);
  const [aromaOil, setAromaOil] = useState(12);
  const [noodleHardness, setNoodleHardness] = useState(55);
  const [noodleAmount, setNoodleAmount] = useState(160);

  useEffect(() => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      setSaved(JSON.parse(raw) as SavedRamen[]);
    } catch {
      setSaved([]);
    }
  }, []);

  const selected = useMemo(() => toppings.find((item) => item.id === selectedId) ?? null, [selectedId, toppings]);
  const prompt = useMemo(() => {
    const names = toppings.map((item) => `${metaOf(item.type).jp}${item.count > 1 ? ` x${item.count}` : ""}`).join("、");
    return `${presets[preset].jp}。スープ色 ${soupColor}、タレ ${tare}ml、香味油 ${aromaOil}ml、麺量 ${noodleAmount}g。具材: ${names}`;
  }, [aromaOil, noodleAmount, preset, soupColor, tare, toppings]);

  function createPresetToppings(nextPreset: PresetId) {
    return presets[nextPreset].toppings.map((type, index) => {
      const angle = (index / presets[nextPreset].toppings.length) * Math.PI * 2 - Math.PI / 2;
      const radius = index === 0 ? 0.08 : 0.42;
      const meta = metaOf(type);
      return {
        id: `${type}-${Date.now()}-${index}`,
        type,
        x: Number((Math.cos(angle) * radius).toFixed(3)),
        y: Number((Math.sin(angle) * radius).toFixed(3)),
        count: meta.defaultCount,
        scale: 1,
        rotation: index * 18 - 20,
        zIndex: index + 4,
      };
    });
  }

  function applyPreset(nextPreset: PresetId) {
    setPreset(nextPreset);
    setSoupColor(presets[nextPreset].soup);
    const nextToppings = createPresetToppings(nextPreset);
    setToppings(nextToppings);
    setSelectedId(nextToppings[0]?.id ?? null);
  }

  function addTopping(type: ToppingType) {
    const meta = metaOf(type);
    const sameCount = toppings.filter((item) => item.type === type).length;
    if (sameCount >= meta.max) return;
    const next: ToppingItem = {
      id: `${type}-${Date.now()}`,
      type,
      x: Number(((Math.random() - 0.5) * 0.45).toFixed(3)),
      y: Number(((Math.random() - 0.5) * 0.45).toFixed(3)),
      count: meta.defaultCount,
      scale: 1,
      rotation: 0,
      zIndex: Math.max(0, ...toppings.map((item) => item.zIndex)) + 1,
    };
    setToppings((items) => [...items, next]);
    setSelectedId(next.id);
  }

  function updateSelected(patch: Partial<ToppingItem>) {
    if (!selectedId) return;
    setToppings((items) => items.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)));
  }

  function persist(nextSaved: SavedRamen[]) {
    setSaved(nextSaved);
    localStorage.setItem(SAVE_KEY, JSON.stringify(nextSaved));
  }

  function saveCurrent() {
    if (mode === "general" && saved.length >= FREE_SAVE_LIMIT) return;
    const record: SavedRamen = {
      id: `ramen-${Date.now()}`,
      title: title.trim() || "無題のラーメン",
      createdAt: new Date().toLocaleString("ja-JP"),
      preset,
      soupColor,
      bowlStyle,
      toppings,
      tare,
      aromaOil,
      noodleHardness,
      noodleAmount,
    };
    persist([record, ...saved]);
  }

  function loadSaved(item: SavedRamen) {
    setTitle(item.title);
    setPreset(item.preset);
    setSoupColor(item.soupColor);
    setBowlStyle(item.bowlStyle);
    setToppings(item.toppings);
    setTare(item.tare);
    setAromaOil(item.aromaOil);
    setNoodleHardness(item.noodleHardness);
    setNoodleAmount(item.noodleAmount);
    setSelectedId(item.toppings[0]?.id ?? null);
  }

  function copyPrompt() {
    void navigator.clipboard?.writeText(prompt);
  }

  return (
    <main className="app-shell">
      <section className="stage-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Ra-Pla</p>
            <h1>らーぷら</h1>
          </div>
          <div className="mode-switch" aria-label="モード切り替え">
            <button className={mode === "general" ? "active" : ""} onClick={() => setMode("general")}>
              一般
            </button>
            <button className={mode === "pro" ? "active pro" : "pro"} onClick={() => setMode("pro")}>
              Pro
            </button>
          </div>
        </header>

        <div className="bowl-wrap">
          <CeramicBowl
            toppings={toppings}
            selectedId={selectedId}
            soupColor={soupColor}
            bowlStyle={bowlStyle}
            onSelect={setSelectedId}
            onMove={(id, x, y) => setToppings((items) => items.map((item) => (item.id === id ? { ...item, x, y } : item)))}
          />
        </div>

        <div className="preset-grid">
          {(Object.keys(presets) as PresetId[]).map((id) => (
            <button key={id} className={preset === id ? "preset-card active" : "preset-card"} onClick={() => applyPreset(id)}>
              <span style={{ backgroundColor: presets[id].accent }} />
              {presets[id].jp}
            </button>
          ))}
        </div>
      </section>

      <section className="control-panel">
        <nav className="tabs">
          <button className={rightTab === "arrangement" ? "active" : ""} onClick={() => setRightTab("arrangement")} title="盛り付け">
            <Layers size={18} />
            盛り
          </button>
          <button className={rightTab === "soup" ? "active" : ""} onClick={() => setRightTab("soup")} title="スープ">
            <Soup size={18} />
            スープ
          </button>
          <button className={rightTab === "noodle" ? "active" : ""} onClick={() => setRightTab("noodle")} title="麺">
            <Utensils size={18} />
            麺
          </button>
          <button className={rightTab === "save" ? "active" : ""} onClick={() => setRightTab("save")} title="保存">
            <Save size={18} />
            保存
          </button>
          <button className={rightTab === "manual" ? "active" : ""} onClick={() => setRightTab("manual")} title="手順">
            <BookOpen size={18} />
            手順
          </button>
        </nav>

        {rightTab === "arrangement" && (
          <div className="panel-content">
            <div className="section-title">
              <ChefHat size={20} />
              <h2>トッピング</h2>
            </div>
            <div className="topping-palette">
              {toppingsMeta.map((meta) => {
                const used = toppings.filter((item) => item.type === meta.type).length;
                const disabled = used >= meta.max;
                return (
                  <button key={meta.type} disabled={disabled} onClick={() => addTopping(meta.type)} className="palette-item">
                    <svg viewBox="-24 -24 48 48">
                      <ToppingSprite type={meta.type} />
                    </svg>
                    <span>{meta.jp}</span>
                    <small>
                      {used}/{meta.max}
                    </small>
                  </button>
                );
              })}
            </div>

            <div className="editor-box">
              {selected ? (
                <>
                  <div className="selected-head">
                    <strong>{metaOf(selected.type).jp}</strong>
                    <button
                      className="icon-button danger"
                      title="削除"
                      onClick={() => {
                        setToppings((items) => items.filter((item) => item.id !== selected.id));
                        setSelectedId(null);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <Slider label="数" min={1} max={12} value={selected.count} onChange={(count) => updateSelected({ count })} />
                  <Slider label="サイズ" min={0.4} max={2} step={0.1} value={selected.scale} onChange={(scale) => updateSelected({ scale })} />
                  <Slider label="回転" min={-180} max={180} value={selected.rotation} onChange={(rotation) => updateSelected({ rotation })} suffix="°" />
                  <Slider label="重ね順" min={1} max={20} value={selected.zIndex} onChange={(zIndex) => updateSelected({ zIndex })} />
                </>
              ) : (
                <p className="empty">どんぶり上の具材を選ぶと、数・サイズ・重ね順を調整できます。</p>
              )}
            </div>
          </div>
        )}

        {rightTab === "soup" && (
          <div className="panel-content">
            <div className="section-title">
              <Soup size={20} />
              <h2>スープ設計</h2>
            </div>
            <div className="swatches">
              {["#9b5a26", "#c48a35", "#ead9af", "#7f3b1f", "#31302c", "#d65f38"].map((color) => (
                <button key={color} className={soupColor === color ? "swatch active" : "swatch"} style={{ backgroundColor: color }} onClick={() => setSoupColor(color)} title={color}></button>
              ))}
            </div>
            <Slider label="タレ" min={20} max={70} value={tare} onChange={setTare} suffix="ml" />
            <Slider label="香味油" min={0} max={30} value={aromaOil} onChange={setAromaOil} suffix="ml" />
            <div className="bowl-style-grid">
              {(Object.keys(bowlStyles) as BowlStyleId[]).map((id) => (
                <button key={id} className={bowlStyle === id ? "bowl-style active" : "bowl-style"} onClick={() => setBowlStyle(id)}>
                  <span style={{ backgroundColor: bowlStyles[id].outer }} />
                  {bowlStyles[id].jp}
                </button>
              ))}
            </div>
          </div>
        )}

        {rightTab === "noodle" && (
          <div className="panel-content">
            <div className="section-title">
              <Utensils size={20} />
              <h2>麺と仕上げ</h2>
            </div>
            <Slider label="麺の硬さ" min={0} max={100} value={noodleHardness} onChange={setNoodleHardness} />
            <Slider label="麺量" min={90} max={280} value={noodleAmount} onChange={setNoodleAmount} suffix="g" />
            <div className="prompt-box">
              <div>
                <Sparkles size={18} />
                <strong>AIプロンプト</strong>
              </div>
              <p>{prompt}</p>
              <button className="primary-button" onClick={copyPrompt}>
                <ClipboardCopy size={18} />
                コピー
              </button>
            </div>
          </div>
        )}

        {rightTab === "save" && (
          <div className="panel-content">
            <div className="section-title">
              <Save size={20} />
              <h2>レシピ保存</h2>
            </div>
            <input className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="レシピ名" />
            <button className="primary-button" onClick={saveCurrent} disabled={mode === "general" && saved.length >= FREE_SAVE_LIMIT}>
              {mode === "general" && saved.length >= FREE_SAVE_LIMIT ? <Lock size={18} /> : <Save size={18} />}
              保存する
            </button>
            <p className="limit-note">一般モードは最大 {FREE_SAVE_LIMIT} 件まで。Pro モードは無制限です。</p>
            <div className="saved-list">
              {saved.length === 0 ? (
                <p className="empty">保存したレシピはまだありません。</p>
              ) : (
                saved.map((item) => (
                  <div key={item.id} className="saved-item" role="button" tabIndex={0} onClick={() => loadSaved(item)}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.createdAt}</span>
                    </div>
                    <button
                      className="icon-button"
                      title="削除"
                      onClick={(event) => {
                        event.stopPropagation();
                        persist(saved.filter((record) => record.id !== item.id));
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {rightTab === "manual" && (
          <div className="panel-content">
            <div className="section-title">
              <BookOpen size={20} />
              <h2>調理マニュアル</h2>
            </div>
            <ol className="manual-list">
              <li>
                <strong>スープ</strong>
                <span>タレ {tare}ml、香味油 {aromaOil}ml を温めた丼に合わせる。</span>
              </li>
              <li>
                <strong>麺</strong>
                <span>麺量 {noodleAmount}g。硬さ指標 {noodleHardness}/100 で茹で時間を調整。</span>
              </li>
              <li>
                <strong>盛り付け</strong>
                <span>{toppings.length} 種の具材を、どんぶり上の配置どおりに重ねる。</span>
              </li>
            </ol>
            <div className="stepper">
              <button onClick={() => setNoodleAmount((value) => Math.max(90, value - 10))}>
                <Minus size={18} />
              </button>
              <strong>{noodleAmount}g</strong>
              <button onClick={() => setNoodleAmount((value) => Math.min(280, value + 10))}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
