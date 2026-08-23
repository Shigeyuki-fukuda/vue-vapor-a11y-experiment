/**
 * 2系統 (lane) のビルド設定。Vite がこの値をそのまま使う。
 *
 * ソースコードは source/components/ から両 lane へバイト単位で同一のものが
 * 配られる (scripts/sources.mjs が保証する)。したがって観測された
 * アクセシビリティ上の差分は、下記 `vapor` フラグと
 * apps/{lane}/src/main.js のマウント関数以外に原因を持ち得ない。
 *
 * 注意: ここは「実際にビルドに使われる設定」であって「あるべき姿」ではない。
 * あるべき姿は scripts/verify-vapor-mode.mjs が独立に宣言しており、
 * 両者がずれていれば verify が失敗する。この二重定義は意図的なもので、
 * このファイルを書き換えただけで検証が黙って通ってしまう事故を防いでいる。
 */
export const LANES = {
  classic: { vapor: false, devPort: 5173, previewPort: 4173 },
  vapor: { vapor: true, devPort: 5174, previewPort: 4174 },
}

export const LANE_NAMES = Object.keys(LANES)

export function getLane(name) {
  const lane = LANES[name]
  if (!lane) {
    throw new Error(`未知の lane: ${name} (有効な値: ${LANE_NAMES.join(', ')})`)
  }
  return lane
}
