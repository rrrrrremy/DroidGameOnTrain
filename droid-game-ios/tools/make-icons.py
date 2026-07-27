from PIL import Image, ImageDraw

BG   = (17, 18, 19)
TILE = (34, 197, 94)      # --indigo, the game's accent green
EDGE = (22, 163, 74)      # --indigo-dark

GRID = [[0,0,1,0,0],[1,1,1,1,1],[0,1,1,1,0],[0,1,1,1,0],[0,1,0,1,0]]

def render(size, scale, rounded=False):
    """Draw the 'droid' board shape centred on the app background."""
    img = Image.new('RGB', (size, size), BG)
    d = ImageDraw.Draw(img)
    span = size * scale
    gap = span / 5 * 0.11
    cell = (span - gap * 4) / 5
    ox = oy = (size - span) / 2
    for y, row in enumerate(GRID):
        for x, on in enumerate(row):
            if not on:
                continue
            x0 = ox + x * (cell + gap)
            y0 = oy + y * (cell + gap)
            d.rounded_rectangle(
                [x0, y0, x0 + cell, y0 + cell],
                radius=cell * 0.16, fill=TILE, outline=EDGE,
                width=max(1, int(cell * 0.05)),
            )
    return img

import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

base = 'ios/App/App/Assets.xcassets'
render(1024, 0.70).save(f'{base}/AppIcon.appiconset/AppIcon-512@2x.png')
splash = render(2732, 0.22)
for n in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    splash.save(f'{base}/Splash.imageset/{n}')

# Web favicons / PWA icons for the same build served in a browser.
render(192, 0.70).save('public/logo192.png')
render(512, 0.70).save('public/logo512.png')
render(64, 0.68).save('public/favicon.ico', sizes=[(64,64),(32,32),(16,16)])
print('icons written')
