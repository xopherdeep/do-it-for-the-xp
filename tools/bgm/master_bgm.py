#!/usr/bin/env python3
"""Master the produced soundtrack for the xp-bgm R2 bucket.

The songs arrive as WAVs in ~/Downloads (title case, "(Take 2)" for a second song of a slot). Every song the
game references (song("<name>", ...) in src/assets/fx/index.ts) is matched to its WAV by slug, then:

  report   measures loudness (EBU R128), true peak, silence at either end and the length of the closing fade
  master   trims the silence (and the inaudible end of a long fade) so the loop restarts promptly, evens the
           loudness to one target, and encodes a 128k / 44.1 kHz MP3 into --out
  --upload puts each mastered MP3 into xp-bgm/bgm/<name>.mp3 (wrangler must be logged in)

  python3 tools/bgm/master_bgm.py report
  python3 tools/bgm/master_bgm.py master --upload [name ...]

Standard library only (audioop is deprecated in 3.13; this runs on 3.12).
"""
import argparse
import audioop  # noqa: deprecated, still present in 3.12
import json
import math
import re
import statistics
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX_INDEX = ROOT / "src/assets/fx/index.ts"
BUCKET = "xp-bgm/bgm"
CACHE = "public, max-age=31536000, immutable"

TARGET_LUFS = -16.0  # every song sits at the same level; the in-game music volume does the rest
TARGET_TP = -1.5  # true-peak ceiling for loudnorm
LIMIT = 0.79  # then a -2 dB sample-peak limiter, lowered per song when the MP3 still overshoots
MAX_MP3_TP = -1.0  # ceiling for the encoded MP3's true peak
SILENCE_DB = -50.0  # below this (dBFS, 100 ms windows) a window counts as silent
FADE_FLOOR_DB = 24.0  # a closing fade is cut where it has dropped this far under the body of the song
ENV_RATE = 22050
WINDOW = ENV_RATE // 10  # 100 ms


def slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower().replace("&", " and ")).strip("-")


def referenced_songs() -> list[str]:
    return sorted(set(re.findall(r'song\("([^"]+)"', FX_INDEX.read_text())))


def find_wavs(src: Path) -> dict[str, Path]:
    return {slug(p.stem): p for p in sorted(src.glob("*.wav"))}


def envelope(wav: Path) -> list[float]:
    """Loudness in dBFS per 100 ms window, from a mono 22 kHz decode."""
    pcm = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", str(wav), "-map", "0:a", "-ac", "1", "-ar", str(ENV_RATE),
         "-f", "s16le", "-"], check=True, capture_output=True).stdout
    step = WINDOW * 2
    out = []
    for i in range(0, len(pcm) - step + 1, step):
        rms = audioop.rms(pcm[i:i + step], 2)
        out.append(20 * math.log10(rms / 32768) if rms else -120.0)
    return out


def analyse(wav: Path) -> dict:
    env = envelope(wav)
    sec = WINDOW / ENV_RATE
    loud = [i for i, db in enumerate(env) if db > SILENCE_DB]
    first, last = (loud[0], loud[-1]) if loud else (0, len(env) - 1)
    body = statistics.median(env[first:last + 1])
    # Walk back from the last sound to where the song is still within 6 dB of its body: the fade starts there
    fade_start = last
    while fade_start > first and env[fade_start] < body - 6:
        fade_start -= 1
    # The cut: after the last window of the fade still within FADE_FLOOR_DB of the body (a quiet final chord after
    # a pause stays; only the near-inaudible end of the fade goes)
    cut = 1 + max((i for i in range(fade_start, last + 1) if env[i] >= body - FADE_FLOOR_DB), default=last)
    return {
        "duration": len(env) * sec,
        "lead": first * sec,
        "tail": (len(env) - 1 - last) * sec,
        "fade": (last - fade_start) * sec,
        "start": first * sec,
        "end": cut * sec,
    }


def loudness(wav: Path, trim: str) -> dict:
    """First loudnorm pass over the trimmed song: its integrated loudness, true peak, range and gate."""
    err = subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-i", str(wav), "-map", "0:a",
         "-af", f"{trim},loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:print_format=json", "-f", "null", "-"],
        check=True, capture_output=True, text=True).stderr
    return json.loads(err[err.rindex("{"):err.rindex("}") + 1])


def trim_filter(a: dict) -> str:
    length = a["end"] - a["start"]
    return (f"atrim=start={a['start']:.3f}:end={a['end']:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:d=0.02,afade=t=out:st={max(0.0, length - 0.6):.3f}:d=0.6")


def measure(name: str, wav: Path) -> dict:
    a = analyse(wav)
    a["name"], a["wav"] = name, wav
    a["loud"] = loudness(wav, trim_filter(a))
    return a


def true_peak(path: Path) -> float:
    err = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true:framelog=quiet",
                          "-f", "null", "-"], check=True, capture_output=True, text=True).stderr
    return float(re.findall(r"Peak:\s+(-?[\d.]+|-inf)", err)[-1])


def master(a: dict, out: Path) -> Path:
    m = a["loud"]
    norm = (f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    mp3 = out / f"{a['name']}.mp3"
    limit = LIMIT
    for _ in range(3):
        subprocess.run(
            ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(a["wav"]), "-map", "0:a", "-vn",
             "-af", f"{trim_filter(a)},{norm},alimiter=limit={limit:.3f}:level=disabled", "-ar", "44100",
             "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3)],
            check=True)
        over = true_peak(mp3) - MAX_MP3_TP
        if over <= 0:
            break
        limit = max(0.0625, limit * 10 ** (-(over + 0.3) / 20))  # the encoder overshot: limit harder and encode again
    return mp3


def upload(mp3: Path) -> str:
    subprocess.run(
        ["npx", "-y", "wrangler", "r2", "object", "put", f"{BUCKET}/{mp3.name}", "--file", str(mp3), "--remote",
         "--content-type", "audio/mpeg", "--cache-control", CACHE],
        check=True, capture_output=True, stdin=subprocess.DEVNULL)
    return mp3.name


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("action", choices=["report", "master"])
    ap.add_argument("names", nargs="*", help="song slugs (default: every song() in src/assets/fx/index.ts)")
    ap.add_argument("--src", type=Path, default=Path.home() / "Downloads")
    ap.add_argument("--out", type=Path, default=Path.home() / "Downloads/xp-bgm-mastered")
    ap.add_argument("--upload", action="store_true")
    args = ap.parse_args()

    wavs = find_wavs(args.src)
    names = args.names or referenced_songs()
    missing = [n for n in names if n not in wavs]
    if missing:
        print("no WAV for:", ", ".join(missing), file=sys.stderr)
    names = [n for n in names if n in wavs]

    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(lambda n: measure(n, wavs[n]), names))

    print(f"{'song':34} {'len':>5} {'LUFS':>6} {'peak':>5} {'lead':>5} {'tail':>5} {'fade':>5} {'cut':>5}")
    for a in results:
        cut = a["duration"] - a["end"] - a["tail"]
        print(f"{a['name'][:34]:34} {a['duration']:5.0f} {float(a['loud']['input_i']):6.1f} "
              f"{float(a['loud']['input_tp']):5.1f} {a['lead']:5.1f} {a['tail']:5.1f} {a['fade']:5.1f} {cut:5.1f}")
    levels = [float(a["loud"]["input_i"]) for a in results]
    if levels:
        print(f"loudness spread {min(levels):.1f} .. {max(levels):.1f} LUFS -> {TARGET_LUFS} for all")

    if args.action == "master":
        args.out.mkdir(parents=True, exist_ok=True)
        with ThreadPoolExecutor(8) as pool:
            mp3s = list(pool.map(lambda a: master(a, args.out), results))
        print(f"mastered {len(mp3s)} songs into {args.out}")
        if args.upload:
            with ThreadPoolExecutor(4) as pool:
                for name in pool.map(upload, mp3s):
                    print("uploaded", name)


if __name__ == "__main__":
    main()
