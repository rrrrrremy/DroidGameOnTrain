#!/usr/bin/env python3
"""Generate the iOS app icon and launch splash from the game's own logo.

Source of truth is public/favicon.svg — the same droid mark the web app uses —
so the app icon never drifts from the brand. Requires cairosvg and Pillow:

    pip install cairosvg pillow
    python3 tools/make-icons.py && npx cap sync ios

App icons may not carry their own transparency or rounded corners (iOS applies
the squircle mask itself), so the mark is composited onto an opaque background.
"""

import io
import os
import sys

try:
    import cairosvg
    from PIL import Image
except ImportError:
    sys.exit('Missing dependencies. Run: pip install cairosvg pillow')

HERE = os.path.dirname(os.path.abspath(__file__))
IOS = os.path.dirname(HERE)

BG = (17, 18, 19)          # --bg, matches the app's background
LOGO = os.path.join(IOS, 'public/favicon.svg')
ASSETS = os.path.join(IOS, 'ios/App/App/Assets.xcassets')


# App-icon layout of the same droid mark as public/favicon.svg: the logo's own
# rounded frame is dropped and the gradient runs edge to edge, because iOS
# applies its own squircle mask and a second frame inside it reads as a badge
# within a badge. The glyph is the favicon's, scaled up to fill the tile.
# If the logo changes, mirror the change here.
ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="url(#screen)"/>
  <g transform="translate(32 32) scale(1.32) translate(-32 -32)">
    <path d="M23 19h14v5h5v16h-5v5H23V19Z" fill="#07110b"/>
    <path d="M28 24h8v5h4v6h-4v5h-8V24Z" fill="#86efac"/>
    <rect x="18" y="29" width="5" height="5" fill="#07110b"/>
    <rect x="42" y="29" width="5" height="5" fill="#07110b"/>
    <rect x="29" y="15" width="6" height="4" fill="#86efac"/>
  </g>
  <defs>
    <linearGradient id="screen" x1="0" x2="64" y1="0" y2="64"
                    gradientUnits="userSpaceOnUse">
      <stop stop-color="#4ade80"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
</svg>"""


def rasterize(svg, width, url=None):
    kwargs = {'output_width': width, 'output_height': width}
    if url:
        png = cairosvg.svg2png(url=url, **kwargs)
    else:
        png = cairosvg.svg2png(bytestring=svg.encode(), **kwargs)
    return Image.open(io.BytesIO(png)).convert('RGBA')


def render_icon(size):
    """Full-bleed app icon; iOS rounds the corners itself."""
    return rasterize(ICON_SVG, size).convert('RGB')


def render_splash(size, scale):
    """The game's logo, small and centred on the app background."""
    inner = int(size * scale)
    mark = rasterize(None, inner, url=LOGO)
    canvas = Image.new('RGB', (size, size), BG)
    offset = ((size - inner) // 2, (size - inner) // 2)
    canvas.paste(mark, offset, mark)
    return canvas


def main():
    if not os.path.exists(LOGO):
        sys.exit(f'Cannot find the logo at {LOGO}')

    render_icon(1024).save(f'{ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png')

    # The splash canvas is square and far larger than the visible area, so the
    # mark sits small in the middle.
    splash = render_splash(2732, 0.16)
    for name in ('splash-2732x2732.png',
                 'splash-2732x2732-1.png',
                 'splash-2732x2732-2.png'):
        splash.save(f'{ASSETS}/Splash.imageset/{name}')

    print('Wrote app icon and splash from public/favicon.svg')


if __name__ == '__main__':
    main()
