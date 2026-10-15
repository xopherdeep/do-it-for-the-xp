"""Short stings in the soundtrack's own voice: the battle encounter and the cloud travel flourish.
python3 stings.py [encounter] [travel]   (no names renders them all)"""
import os, subprocess, sys
import numpy as np
from chip import SR, lowpass, noise, env_adsr, hz, midi
import snes

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "audio", "chiptune", "sfx")
os.makedirs(OUT, exist_ok=True)

def write(name, x, peak=0.85):
    x = np.tanh(x * 1.1)
    x *= peak / max(1e-9, np.max(np.abs(x)))
    pcm = (x * 32767).astype("<i2")
    import wave
    wav = os.path.join(OUT, f"{name}.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    for ext, args in (("ogg", ["-codec:a", "libvorbis", "-q:a", "4"]), ("mp3", ["-codec:a", "libmp3lame", "-b:a", "128k"])):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, *args, os.path.join(OUT, f"{name}.{ext}")], check=True)
    os.remove(wav)
    print("wrote", name)

def encounter():
    """A beast steps out: a rising whoosh, three brass hits climbing a minor third, a low thud under the last."""
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # the whoosh: filtered noise with a rising sweep over 0.6 s
    sweep = lowpass(noise(n), 3000) * np.exp(-((t - 0.45) ** 2) / 0.05) * 0.5
    out += sweep
    # three hits: D3 F3 A3 with the brass voice, each 0.28 s apart
    for i, freq in enumerate((146.8, 174.6, 220.0)):
        start = int((0.55 + i * 0.28) * SR); d = int(0.5 * SR)
        hit = snes.brass(freq, d) * 0.7 + snes.brass(freq * 2, d) * 0.25
        out[start:start + d] += hit[: n - start]
    # the thud under the last hit, and a low pad that swells and dies
    start = int(1.11 * SR); d = n - start
    tt = np.arange(d) / SR
    out[start:] += np.sin(2 * np.pi * (70 * np.exp(-tt * 6) + 42) * tt) * np.exp(-tt * 3) * 0.9
    pad = snes.darkpad(73.4, n) * np.exp(-t * 1.2) * 0.5
    out += pad
    st = np.stack([out, out], axis=1)
    st = snes.snes_echo(st, delay_s=0.14, feedback=0.35, wet=0.22, taps=4)
    st = snes.hall(st, wet=0.22)
    return st

def travel(notes=("D5", "F#5", "A5", "D6")):
    """Riding the clouds between places: a clean, quiet marimba flourish that climbs a D major arpeggio over the
    cover sweep. No noise, no bell ring, almost no reverb: it plays, it is gone."""
    n = int(0.9 * SR)
    out = np.zeros((n, 2))
    for i, name in enumerate(notes):
        freq = hz(midi(name))
        start = int((0.02 + i * 0.085) * SR); d = int(0.5 * SR)
        note = snes.marimba(freq, d) * (0.55 + 0.1 * i)
        # the notes step across the field, left to right, so the flourish moves like the clouds do
        pan = 0.3 + 0.4 * i / max(1, len(notes) - 1)
        out[start:start + d, 0] += note[: n - start] * (1 - pan)
        out[start:start + d, 1] += note[: n - start] * pan
    out = snes.snes_echo(out, delay_s=0.11, feedback=0.3, wet=0.12, taps=2)
    return snes.highshelf_cut(out, cutoff=5200, amount=0.4)

SONGS = {"encounter": encounter, "travel": travel}
LEVELS = {"travel": 0.6}   # a quiet one: it plays every time the hero moves between places
for name in (sys.argv[1:] or SONGS):
    write(name, SONGS[name](), peak=LEVELS.get(name, 0.85))
