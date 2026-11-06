# 依主題把原站樣式表的顏色整批重新對應（中性灰階、主色、淡主色、陰影分開處理；紅綠橘狀態色保留）
import re, colorsys, sys, json

def hex2rgba(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h); a = 1.0
    elif len(h) == 6: a = 1.0
    elif len(h) == 8: a = int(h[6:8], 16) / 255; h = h[:6]
    else: return None
    return (int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255, a)

def rgba2hex(r,g,b,a):
    s = '#%02x%02x%02x' % tuple(max(0,min(255,round(x*255))) for x in (r,g,b))
    if a < 0.999: s += '%02x' % max(0,min(255,round(a*255)))
    return s

def mix(c1, c2, t):  # t=0 → c1, t=1 → c2
    return tuple(c1[i]*(1-t) + c2[i]*t for i in range(3))

def lum(rgb):
    return colorsys.rgb_to_hls(*rgb)[1]

ORIG_INK_L, ORIG_BG_L = 0.18, 0.964

def remap(rgba, th):
    r,g,b,a = rgba
    h, l, s = colorsys.rgb_to_hls(r,g,b)
    hd = h*360
    ink, bg, paper = th['ink'], th['bg'], th['paper']
    acc, acc_soft = th['accent'], th['accent_soft']
    # 狀態色（紅、綠、橘）保留
    if s > 0.3 and (hd < 20 or hd > 335 or 80 < hd < 170 or 20 <= hd < 55) and 0.2 < l < 0.85:
        return (r,g,b,a)
    is_blue = 200 <= hd <= 262 and s >= 0.35
    # 陰影：暗色 + 透明
    if a < 0.6 and l < 0.4:
        base = th['shadow']
        return (*base, a * th.get('shadow_boost', 1.0))
    if is_blue and l <= 0.85:
        # 主色：以原主色 #3d5bd9 (L≈0.545) 為基準做明度位移
        dl = l - 0.545
        ah, al, as_ = colorsys.rgb_to_hls(*acc)
        nl = max(0.0, min(1.0, al + dl * th.get('accent_l_scale', 1.0)))
        return (*colorsys.hls_to_rgb(ah, nl, as_), a)
    if is_blue and l > 0.85:
        t = (l - 0.85) / 0.15  # 0 → 濃淡主色，1 → 紙色
        return (*mix(acc_soft, paper, t), a)
    # 中性灰階：墨色 → 底色 → 紙色 三段漸變
    if l <= ORIG_BG_L:
        t = max(0.0, (l - ORIG_INK_L) / (ORIG_BG_L - ORIG_INK_L))
        if l < ORIG_INK_L: t = 0.0
        return (*mix(ink, bg, t), a)
    t = (l - ORIG_BG_L) / (1 - ORIG_BG_L)
    return (*mix(bg, paper, t), a)

def theme_css(css, th):
    T = {k: (hex2rgba(v)[:3] if isinstance(v,str) and v.startswith('#') else v) for k,v in th.items()}
    def sub(m):
        rgba = hex2rgba(m.group(0))
        if not rgba: return m.group(0)
        return rgba2hex(*remap(rgba, T))
    out = re.sub(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', sub, css)
    return out + '\n' + th.get('extra', '')

if __name__ == '__main__':
    src, themes_json, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
    css = open(src, encoding='utf-8').read()
    for name, th in json.load(open(themes_json, encoding='utf-8')).items():
        open(f'{outdir}/{name}.css', 'w', encoding='utf-8').write(theme_css(css, th))
        print('wrote', name)
