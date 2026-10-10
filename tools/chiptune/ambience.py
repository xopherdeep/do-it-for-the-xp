"""Ambient weather loops for WeatherFX: shaped noise, rendered seamless. python3 ambience.py"""
import os, subprocess, math
import numpy as np
from chip import SR, lowpass

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "audio", "weather")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(3)
LEN = 20.0
N = int(LEN * SR)
t = np.arange(N) / SR

def highpass(x, cutoff):
    return x - lowpass(x, cutoff)

def seamless(x, fade=1.5):
    """Crossfade the end into the start so the loop has no seam."""
    k = int(fade * SR)
    ramp = np.linspace(0, 1, k)[:, None]
    head = x[:k].copy()
    x[:k] = head * ramp + x[-k:] * (1 - ramp)
    return x[: N - k]

def stereo(mono, width=0.3):
    l = mono + width * np.roll(mono, 97)
    r = mono - width * np.roll(mono, 131)
    return np.stack([l, r], axis=1)

def write(name, x, peak=0.5):
    x = np.tanh(x * 1.2)
    x *= peak / max(1e-9, np.max(np.abs(x)))
    pcm = (x * 32767).astype("<i2")
    import wave
    wav = os.path.join(OUT, f"{name}.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    for ext, args in (("ogg", ["-codec:a", "libvorbis", "-q:a", "3"]), ("mp3", ["-codec:a", "libmp3lame", "-b:a", "96k"])):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, *args, os.path.join(OUT, f"{name}.{ext}")], check=True)
    os.remove(wav)
    print("wrote", name)

def noise(n=N):
    return rng.uniform(-1, 1, n)

# rain: hiss with a steady patter and a slow swell
def rain():
    hiss = highpass(lowpass(noise(), 9000), 900) * 0.6
    patter = np.zeros(N)
    for _ in range(2600):
        i = rng.integers(0, N - 400); d = rng.integers(60, 400)
        patter[i:i + d] += (noise(d) * np.exp(-np.arange(d) / (d / 3))) * rng.uniform(0.2, 0.7)
    swell = 0.8 + 0.2 * np.sin(2 * np.pi * t / 9.0)
    return seamless(stereo((hiss + lowpass(patter, 5000) * 0.8) * swell))

def wind():
    base = lowpass(noise(), 600)
    gust = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.3 + 1) * np.sin(2 * np.pi * t / 3.1))
    whistle = lowpass(highpass(noise(), 1200), 2600) * (0.2 + 0.3 * gust ** 2)
    return seamless(stereo(base * gust + whistle, 0.4))

def ocean():
    base = lowpass(noise(), 500) * 0.5
    waves = np.zeros(N)
    for start in np.arange(0, LEN, 6.2):
        i = int(start * SR); d = int(4.5 * SR)
        env = np.sin(np.linspace(0, math.pi, d)) ** 2
        seg = lowpass(highpass(noise(d), 300), 4000) * env
        end = min(N, i + d)
        waves[i:end] += seg[: end - i]
    return seamless(stereo(base + waves * 0.9, 0.45))

def storm():
    r = rain()
    w = wind()
    n = min(len(r), len(w))
    x = r[:n] * 0.8 + w[:n] * 0.5
    # two rumbles of thunder
    for start in (4.0, 13.5):
        i = int(start * SR); d = int(3.5 * SR)
        env = np.exp(-np.arange(d) / SR * 1.2) * (1 - np.exp(-np.arange(d) / SR * 30))
        rumble = lowpass(noise(d), 120) * env * 2.5
        end = min(n, i + d)
        x[i:end] += np.stack([rumble, rumble * 0.9], axis=1)[: end - i]
    return x

def night():
    # crickets: pulsed high chirps; a low bed
    bed = lowpass(noise(), 300) * 0.15
    chirp = np.zeros(N)
    for voice in range(3):
        rate = rng.uniform(4.5, 7.5); f = rng.uniform(3800, 5200); phase = rng.uniform(0, 1)
        pulse = (np.sin(2 * np.pi * rate * t + phase) > 0.75).astype(float)
        chirp += np.sin(2 * np.pi * f * t) * pulse * (0.5 + 0.5 * np.sin(2 * np.pi * 90 * t)) * 0.08
    owl = np.zeros(N)
    for start in (6.0, 15.0):
        i = int(start * SR); d = int(0.5 * SR)
        env = np.sin(np.linspace(0, math.pi, d))
        owl[i:i + d] += np.sin(2 * np.pi * 390 * np.arange(d) / SR) * env * 0.12
    return seamless(stereo(bed + chirp + owl, 0.5))

def cave():
    bed = lowpass(noise(), 140) * 0.5
    hum = np.sin(2 * np.pi * 55 * t) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 5))
    drips = np.zeros(N)
    for _ in range(14):
        i = rng.integers(0, N - SR); d = int(0.25 * SR); f = rng.uniform(900, 1800)
        env = np.exp(-np.arange(d) / SR * 18)
        drips[i:i + d] += np.sin(2 * np.pi * f * np.arange(d) / SR * (1 - 0.2 * np.arange(d) / d)) * env * 0.35
    return seamless(stereo(bed + hum + drips, 0.6))

for name, fn in (("rain", rain), ("wind", wind), ("ocean", ocean), ("storm", storm), ("night", night), ("cave", cave)):
    write(name, fn())
