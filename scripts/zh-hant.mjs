// 簡體 → 台灣正體轉換（OpenCC cn→twp 片語級轉換，再套幾條本站用語修正）
import * as OpenCC from 'opencc-js';

const convert = OpenCC.Converter({ from: 'cn', to: 'twp' });
// OpenCC 的正式用字與台灣日常介面用語不同的地方，在這裡統一修正
const fixes = [
  ['臺', '台'],
  ['型別', '類型'],
  ['賬號', '帳號'],
  ['賬戶', '帳戶'],
  ['獲取', '取得'],
  ['當前', '目前'],
  ['配置', '設定'],
  ['“', '「'],
  ['”', '」'],
  ['‘', '『'],
  ['’', '』'],
  ['質量', '品質'],
  ['服務地址', '服務網址'],
  ['圖片地址', '圖片網址'],
  ['原圖地址', '原圖網址'],
  ['介面地址', '介面網址'],
];
export function toTw(text) {
  let out = convert(text);
  for (const [from, to] of fixes) out = out.split(from).join(to);
  return out;
}
