"""Short stings in the soundtrack's own voice: the battle encounter. python3 stings.py"""
import os, subprocess
import numpy as np
from chip import SR, lowpass, noise, env_adsr
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

write("encounter", encounter())
