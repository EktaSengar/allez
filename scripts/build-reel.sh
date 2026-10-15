#!/usr/bin/env bash
# ---------------------------------------------------------
# build-reel.sh — the homepage film, from our own footage.
#
# Originals live in reel-source/<city>/, which git ignores. Every shot
# comes out the same shape: 4:5 at 1080x1350, 2.6s, 30fps, no audio,
# H.264 capped at 1.8 Mb/s (about 600 KB a shot), with its first frame
# as a JPEG poster. Phone footage is shot tall, so 4:5 keeps it at
# native resolution instead of a soft 16:9 crop.
#
# Each shot is first corrected on its own (white balance, exposure,
# noise, a level horizon), then all of them get the same grade and the
# same light grain, so eight phone clips cut together read as one film.
#
# Usage:  scripts/build-reel.sh
# ---------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=reel-source
OUT=reel
FRAME="scale=1080:-2"
CROP() { echo "crop=1080:1350:0:(ih-1350)*$1"; }

# The shared look: a little contrast, blacks lifted off the floor,
# warm mids, saturation pulled back, then fine grain.
GRADE="eq=contrast=1.06:saturation=0.9,curves=all='0/0.035 0.5/0.51 1/0.97',colorbalance=rm=0.025:gm=0.005:bm=-0.03,noise=alls=5:allf=t,format=yuv420p"
X264=(-an -r 30 -c:v libx264 -crf 22 -maxrate 1.8M -bufsize 3.6M -preset slow -pix_fmt yuv420p -movflags +faststart)

# Many phone clips here were saved with each frame repeated six or seven
# times and then a jump, so they move at about 4 fps however they're cut.
# Drop the repeats and rebuild the motion in between.
SMOOTH="mpdecimate=hi=64*24:lo=64*8:frac=0.5,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"

clip() { # name source start "per-shot filters"
  ffmpeg -loglevel error -y -ss "$3" -t 2.6 -i "$SRC/$2" -vf "$4,$GRADE" "${X264[@]}" "$OUT/$1.mp4"
  ffmpeg -loglevel error -y -i "$OUT/$1.mp4" -frames:v 1 -q:v 3 "$OUT/$1.jpg"
}
still() { # name source focus "per-shot filters" — a slow push-in on a photograph
  # Phone JPEGs stand upright only through their EXIF tag; bake it in first.
  local upright; upright="$(mktemp -t reel).jpg"
  python3 -c 'import sys; from PIL import Image, ImageOps; ImageOps.exif_transpose(Image.open(sys.argv[1])).save(sys.argv[2], quality=95)' "$SRC/$2" "$upright"
  ffmpeg -loglevel error -y -loop 1 -framerate 30 -i "$upright" -t 2.6 \
    -vf "scale=1080:-2,$(CROP "$3"),$4,scale=4320:5400,zoompan=z='1+0.07*on/78':x='iw/2-(iw/zoom/2)':y='ih*0.45-(ih/zoom*0.45)':d=1:s=1080x1350:fps=30,$GRADE" \
    "${X264[@]}" "$OUT/$1.mp4"
  rm -f "$upright"
  ffmpeg -loglevel error -y -i "$OUT/$1.mp4" -frames:v 1 -q:v 3 "$OUT/$1.jpg"
}

# Stanford: the phone saved this one with every frame doubled and a jump
# every quarter second, so the duplicates are dropped and the motion
# rebuilt between the frames that remain.
clip bay-stanford bay-area/2026-09-19-stanford.mp4 0 \
  "$SMOOTH,$FRAME,$(CROP 0.65),colorbalance=rs=0.02:bs=-0.03"
still ny-brooklyn-bridge new-york/2026-05-29-brooklyn-bridge-walk.jpg 0.3 "colorbalance=rs=0.02:bs=-0.02"
# Golden Gate: the horizon rises 1.3° to the right; level it, and the
# slight zoom that costs hides the rotated corners.
clip bay-golden-gate bay-area/2026-09-17-golden-gate-boat.mp4 1 \
  "$SMOOTH,$FRAME,rotate=1.3*PI/180,scale=iw*1.05:-2,$(CROP 0.5)"
clip paris-canal paris/2026-08-17-canal-blue-hour.mp4 1 "$SMOOTH,$FRAME,$(CROP 0.6),hqdn3d=2:2:5:5"
still delhi-india-gate delhi/2026-05-15-india-gate-night.jpg 0.5 "hqdn3d=1.5:1.5:3:3"
clip paris-eiffel paris/2026-09-05-eiffel-sparkle.mp4 2 "$SMOOTH,$FRAME,$(CROP 0.5),eq=saturation=0.88"
# Olive: candlelight on a phone is orange, soft and noisy. Cool it, clean
# it, lift the shadows, then give back a little edge.
clip delhi-olive delhi/2025-08-30-olive-lamp.mp4 3 \
  "$FRAME,$(CROP 0.5),hqdn3d=4:3:8:6,colortemperature=temperature=5200,eq=gamma=1.12,unsharp=5:5:0.5"
# ZLB23: a dark room; open the shadows so the band reads.
clip bengaluru-jazz bengaluru/2025-06-17-zlb-leela-live-jazz.mp4 3 \
  "$SMOOTH,$FRAME,$(CROP 0.5),hqdn3d=3:2:6:5,colortemperature=temperature=5600,eq=gamma=1.25,unsharp=5:5:0.4"

ls -l "$OUT"/*.mp4 | awk '{s+=$5} END {printf "reel: %.1f MB of video\n", s/1048576}'
