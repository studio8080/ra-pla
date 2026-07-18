# Ra-Pla — Codex 引き継ぎドキュメント
> 最終更新: 2026-07-18  
> Cursor 引き継ぎは `HANDOFF.md` を参照（同内容・最新）

---

## プロジェクト概要

**Ra-Pla（らーぷら）** — ラーメン開発シミュレーター  
ラーメン店主・開発者向けのビジュアルレシピエディタ。トッピングをドラッグ配置してリアルタイムにどんぶりをデザインし、レシピ・マニュアルを管理できる。

### 技術スタック

React 18 + Vite + TypeScript / Tailwind CSS + CSS変数トークン / pnpm  
単一ファイル構成: `src/app/App.tsx`（約1241行）

### 起動

```bash
pnpm vite --port 5173
```

## ファイル構成

```text
src/
├── app/
│   └── App.tsx          ← 全ロジック・UI（単一ファイル）
├── styles/
│   ├── theme.css        ← CSS変数トークン（Tailwind @theme inline）
│   ├── fonts.css        ← Google Fonts import
│   └── index.css        ← Tailwindベース（編集不要）
HANDOFF.md               ← Cursor向け（最新）
CODEX_HANDOFF.md         ← 本ファイル（Codex向けコピー）
```

## デザインシステム（Neo-Japanese Pop）

| トークン | 値 | 用途 |
| --- | --- | --- |
| `--primary` | `#F2B800` | メインアクション・ハイライト（アンバーゴールド） |
| `--accent` | `#E8431A` | Pro機能・削除・強調（コーラルレッド） |
| `--background` | `#FFFBF0` | ページ背景（温かいクリーム） |
| `--card` | `#FFFEFC` | カード背景 |
| `--foreground` | `#1C1008` | テキスト・アウトライン（ダークブラウン） |
| `--muted` | `#F5EDD0` | 非アクティブ背景 |
| `--border` | `rgba(28,16,8,0.18)` | 細い区切り線 |

フラットシャドウパターン: `shadow-[4px_4px_0px_#1C1008]`
アウトラインパターン: `border-[3px] border-[#1C1008]`
ボタン押下効果: `hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_#1C1008]`

## Google Fonts（fonts.css）

Dela Gothic One / Noto Serif JP / M PLUS 1p / Kosugi Maru / Sawarabi Mincho / JetBrains Mono

## アーキテクチャ

### 型定義（App.tsx 先頭）

```ts
type Mode        = "general" | "pro";
type PresetId    = "shoyu" | "jiro" | "iekei" | "paitan";
type RightTab    = "arrangement" | "soup" | "noodle" | "save" | "manual";
type BowlStyleId = "porcelain" | "black" | "red" | "wood" | "celadon";

type ToppingType =
  | "chashu" | "rareChashu" | "ajitama" | "nori" | "naruto"
  | "menma" | "moyashi" | "spinach" | "cabbage" | "greenOnion"
  | "corn" | "butter" | "itoTogarashi" | "shiraganegi" | "mizuna"
  | "tomato" | "kikurage" | "eggplant" | "redOnion" | "redCabbage";

interface ToppingItem {
  id: string;
  type: ToppingType;
  x: number;        // -1〜1（ボウル内正規化座標）
  y: number;
  count: number;    // ピース数（1〜12）
  scale: number;    // サイズ倍率（0.4〜2.0）
  rotation: number; // クラスター全体回転（-180〜180°）
  zIndex: number;   // 重ね順（1〜20）
}
```

### コンポーネント構成

| コンポーネント | 役割 | 場所 |
| --- | --- | --- |
| `ToppingSprite` | 20種トッピングのSVGスプライト（1ピース単位） | L.182〜398 |
| `CeramicBowl` | 陶器風SVGボウル + ドラッグ可能トッピング | L.410〜523 |
| `Slider` | スライダーUI | L.526〜550 |
| `Card` | カードUI | L.552〜564 |
| `Pill` | ボタンPill | L.566〜576 |
| `ProBadge` / `ProLock` | Pro機能バッジ・ロック | L.578〜587 |
| `IngredientList` | レシピ食材リスト | L.589〜630 |
| `App` | メインコンポーネント | L.632〜 |

## 主要ロジック

### ドラッグシステム（マウス+タッチ）

```ts
// ボウル外でも追従: window にリスナーを登録
useEffect(() => {
  if (!dragId) return;
  const onMove = (e: MouseEvent | TouchEvent) => {
    const rect = bowlRef.current.getBoundingClientRect();
    const normX = ((cx - rect.left) / rect.width) * 2 - 1;  // -1〜1
    const normY = ((cy - rect.top) / rect.height) * 2 - 1;
    // ボウル境界でクランプ（radius 0.87）
    setToppings(p => p.map(t => t.id === dragId ? { ...t, x: fx, y: fy } : t));
  };
  window.addEventListener("touchmove", onMove, { passive: false }); // preventDefault()のために必要
  ...
}, [dragId]);
```

ポイント:

- SVGボウルコンテナに `touchAction: "none"` が必須（CSS）
- SVG `<g>` 要素の `onTouchStart` で `e.preventDefault()` してページスクロールを抑制
- `{ passive: false }` なしだと `e.preventDefault()` がブラウザに無視される

### クラスター配置（ゴールデン角サンフラワー）

```ts
function clusterPos(count: number, spreadScale: number): { dx: number; dy: number; rot: number }[] {
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return { dx: 0, dy: 0, rot: 0 };
    const a = i * 137.508 * (Math.PI / 180); // ゴールデン角
    const r = Math.min(Math.sqrt(i) * 9 * spreadScale, 38);
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, rot: (i * 73.7) % 360 };
  });
}
```

## SVGボウル座標系

```text
viewBox="0 0 300 300"
BOWL_CX = 150, BOWL_CY = 150（中心）
BOWL_OUTER_R = 143（外縁）
BOWL_RIM_R   = 124（リム内側）
BOWL_SOUP_R  = 114（スープ面）
```

トッピング座標変換:

```ts
svgX = t.x * (BOWL_SOUP_R - 22) + cx  ← -1〜1 を SVG座標に変換
svgY = t.y * (BOWL_SOUP_R - 22) + cy
```

## localStorage

```ts
const SAVE_KEY = "rapla_v3";
const FREE_SAVE_LIMIT = 3;
// SavedRamen型でJSON保存
// 無料: 最大3件、Pro: 無制限
```

## HTML構造上の重要な制約

❌ `<button>` の中に `<button>` は絶対に入れない

過去に起きたバグパターン2つ:

- トッピング一覧の行（選択ボタン）の中に削除ボタン → `<div onClick>` + 内部 `<button>` に修正済み
- スープカラースウォッチが複数行の `<button ... />` → `<button ...></button>` の明示クローズで修正済み

ルール:

- 外側クリック可能コンテナが `<button>` なら内部に `<button>` を置くな
- 代わりに外側を `<div onClick role="button" tabIndex={0}>` にする
- 自己クローズ `<button ... />` は使わず `<button ...></button>` と書く

## レスポンシブレイアウト

ブレークポイント: `md = 768px`

| 要素 | モバイル | デスクトップ |
| --- | --- | --- |
| ルート | `min-h-dvh` スクロール可 | `md:h-dvh` 固定高さ |
| `<main>` | `flex-col` 縦積み | `md:flex-row` 横並び |
| 左パネル | `w-full` 全幅 + 下ボーダー | `md:w-[44%]` + 右ボーダー |
| 右パネル | `w-full` 全幅 | `md:flex-1` |
| ボウル | `w-[270px] h-[270px]` | `md:w-[300px] md:h-[300px]` |

## 未実装・今後の課題

### 優先度 高

- シェア画像生成: html2canvas でボウル状態をPNG出力
- AIプロンプトコピー: 専用コピー関数に分離

### 優先度 中

- トッピングPNG透過素材: SVGスプライト → 実写風PNG差し替え
- 重ね順ドラッグUI: react-beautiful-dnd等
- レシピエクスポート: JSON or PDF

### 優先度 低

- クラウド保存（Pro）: Supabase連携
- パフォーマンス最適化: React.memo + useMemo
- ボウル3D視点: CSS perspective + scaleY

## トッピング全20種

```ts
{ type: "chashu",       jp: "チャーシュー",    max: 5,  baseScale: 2.2, defaultCount: 2  }
{ type: "rareChashu",   jp: "レアチャーシュー", max: 5,  baseScale: 2.2, defaultCount: 2  }
{ type: "ajitama",      jp: "味玉・煮卵",      max: 3,  baseScale: 2.0, defaultCount: 1  }
{ type: "nori",         jp: "のり",           max: 5,  baseScale: 1.6, defaultCount: 1  }
{ type: "naruto",       jp: "なると",         max: 3,  baseScale: 1.8, defaultCount: 1  }
{ type: "menma",        jp: "メンマ",         max: 1,  baseScale: 1.5, defaultCount: 4  }
{ type: "moyashi",      jp: "もやし",         max: 1,  baseScale: 1.2, defaultCount: 6  }
{ type: "spinach",      jp: "ほうれん草",      max: 1,  baseScale: 1.6, defaultCount: 4  }
{ type: "cabbage",      jp: "キャベツ",       max: 1,  baseScale: 1.8, defaultCount: 3  }
{ type: "greenOnion",   jp: "ネギ",          max: 1,  baseScale: 1.0, defaultCount: 8  }
{ type: "corn",         jp: "コーン",        max: 1,  baseScale: 0.9, defaultCount: 10 }
{ type: "butter",       jp: "バター",        max: 2,  baseScale: 1.6, defaultCount: 1  }
{ type: "itoTogarashi", jp: "糸唐辛子",      max: 1,  baseScale: 1.3, defaultCount: 5  }
{ type: "shiraganegi",  jp: "白髪ねぎ",      max: 1,  baseScale: 1.3, defaultCount: 6  }
{ type: "mizuna",       jp: "水菜",         max: 1,  baseScale: 1.6, defaultCount: 3  }
{ type: "tomato",       jp: "カットトマト",  max: 1,  baseScale: 1.8, defaultCount: 2  }
{ type: "kikurage",     jp: "きくらげ",     max: 1,  baseScale: 1.6, defaultCount: 3  }
{ type: "eggplant",     jp: "なす",        max: 1,  baseScale: 1.8, defaultCount: 2  }
{ type: "redOnion",     jp: "赤玉ねぎ",    max: 3,  baseScale: 1.8, defaultCount: 2  }
{ type: "redCabbage",   jp: "レッドキャベツ", max: 1, baseScale: 1.8, defaultCount: 3 }
```

## よくある落とし穴

- `<button>` ネスト → HTML構造上の重要な制約参照
- タッチドラッグが動かない → `{ passive: false }` と `touchAction: "none"` の両方が必要
- SVGサイズ変更時に座標ずれ → `getBoundingClientRect()` で実際サイズ取得するので `viewBox` 変更時も変換式はそのまま
- スープ色 → `lighten()` は `#RRGGBB` 形式のみ対応

## パッケージ

```json
{ "react": "^18", "tailwindcss": "latest", "lucide-react": "latest", "motion": "latest", "recharts": "latest" }
```

パッケージマネージャー: pnpm
