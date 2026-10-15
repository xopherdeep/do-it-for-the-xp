"""
Foley for the building doors that open in the scene transition (DoorsEffect.vue), rendered with numpy.
Each sound is built from struck metal modes, shaped noise and a small stereo room, and lands its hits on the
same beats as the door's buzz pattern in DoorsEffect.vue's OPENING table.

  vault  the bank: two tumbler clicks, the wheel's ratchet, the bolts throwing with a deep steel CHUNK,
         then the weight of the door swinging on oiled hinges and the plate ringing in a marble lobby
  stone  the town hall: the iron ring lifts and knocks, the latch drops, and the dressed stone slabs
         roll open on the floor with a low, even grind under a tall hall's echo

Usage: python3 tools/sfx/door_sfx.py [vault] [stone]   (writes MP3s into src/assets/audio/doors)
"""
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "audio", "doors")
rng = np.random.default_rng(11)


def silence(seconds):
    return np.zeros(int(SR * seconds))


def place(buf, sound, at, gain=1.0):
    i = int(at * SR)
    end = min(len(buf), i + len(sound))
    buf[i:end] += gain * sound[: end - i]


def shaped_noise(seconds, lo, hi, tilt=0.0):
    """White noise band-passed between lo and hi Hz in the frequency domain, optionally tilted darker."""
    n = int(SR * seconds)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    mask = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    if tilt:
        mask *= (np.maximum(f, 20) / 1000) ** -tilt
    out = np.fft.irfft(spec * mask, n)
    return out / (np.abs(out).max() + 1e-9)


def modes(seconds, partials, attack=0.0008):
    """A struck object: a sum of decaying sines, each (freq Hz, amplitude, decay seconds)."""
    t = np.arange(int(SR * seconds)) / SR
    out = np.zeros_like(t)
    for f, a, d in partials:
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, np.pi)) * np.exp(-t / d)
    out *= np.minimum(1, t / attack)
    return out


def thump(seconds, f0, f1, decay):
    """A low body hit whose pitch falls from f0 to f1, like a heavy mass coming to rest."""
    t = np.arange(int(SR * seconds)) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t / decay) * np.minimum(1, t / 0.002)


def click(bright=4200, body=None, seconds=0.05, decay=0.006):
    """A small precise mechanical click: a bright transient and, optionally, the ring of the part that clicked."""
    n = int(SR * seconds)
    t = np.arange(n) / SR
    out = shaped_noise(seconds, bright * 0.5, bright * 2) * np.exp(-t / decay)
    if body:
        out += 0.6 * modes(seconds, body)
    return out


def env(seconds, points):
    """A piecewise-linear envelope through (time, level) points."""
    t = np.arange(int(SR * seconds)) / SR
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def comb(x, delay, g, damp):
    """A damped feedback comb, processed one delay-length block at a time so numpy does the work."""
    d = int(delay * SR)
    y = np.zeros(len(x))
    prev = np.zeros(d)
    for k in range(0, len(x), d):
        blk = x[k : k + d] + g * prev[: len(x[k : k + d])]
        y[k : k + d] = blk
        # A gentle moving-average in the loop takes the highs off each echo, like air and stone do
        prev = np.convolve(np.concatenate([blk, np.zeros(d - len(blk))]), [damp, 1 - damp], mode="same")
    return y


def allpass(x, delay, g):
    d = int(delay * SR)
    y = np.zeros(len(x))
    buf = np.zeros(len(x) + d)
    for k in range(0, len(x), d):
        seg = x[k : k + d]
        v = seg + g * buf[k : k + len(seg)]
        y[k : k + len(seg)] = -g * v + buf[k : k + len(seg)]
        buf[k + d : k + d + len(seg)] = v
    return y


def room(x, size=1.0, decay=0.8, damp=0.35):
    """A small Schroeder room per ear, with the ears' delays offset so the tail spreads wide."""
    ears = []
    for spread in (1.0, 1.071):
        combs = [0.0297, 0.0371, 0.0411, 0.0437]
        wet = sum(comb(x, c * size * spread, decay, damp) for c in combs) / len(combs)
        for a in (0.005, 0.0017):
            wet = allpass(wet, a * spread, 0.7)
        ears.append(wet)
    return ears


def finish(dry, wet_gain, size, decay, damp, name):
    tail = np.concatenate([dry, silence(0.9)])
    left, right = room(tail, size, decay, damp)
    st = np.stack([tail + wet_gain * left, tail + wet_gain * right], axis=1)
    # Fade the very end so the tail never clips off
    st *= np.minimum(1, np.linspace(6, 0, len(st)))[:, None]
    # A gentle tape-style saturation lifts the body to sit level with the other door sounds without clipping
    st /= np.abs(st).max()
    st = np.tanh(2.2 * st) / np.tanh(2.2) * 0.89
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((st * 32767).astype("<i2").tobytes())
        mp3 = os.path.join(OUT, f"{name}.mp3")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-af", "silenceremove=start_periods=1:start_threshold=-60dB", "-codec:a", "libmp3lame", "-q:a", "3", mp3], check=True)
    os.unlink(tmp.name)
    print("wrote", os.path.relpath(mp3))


# A big steel plate: low, widely spaced, inharmonic modes that ring a long time
STEEL = [(97, 0.5, 0.5), (233, 0.45, 0.38), (391, 0.3, 0.3), (587, 0.22, 0.22), (911, 0.12, 0.16), (1347, 0.07, 0.11), (2210, 0.04, 0.07)]
# A tumbler pin: small and bright
PIN = [(2870, 0.4, 0.02), (4410, 0.25, 0.012), (6230, 0.12, 0.008)]
# The iron door ring: medium weight, slightly out of tune with itself
IRON_RING = [(412, 0.6, 0.24), (1093, 0.4, 0.15), (1873, 0.25, 0.09), (2741, 0.12, 0.06), (3912, 0.06, 0.04)]


def vault():
    """The bank vault. Beats match the buzz: tick at 0, tick at 80 ms, thud at 200 ms."""
    out = silence(1.3)
    place(out, click(5200, PIN, decay=0.004), 0.0, 0.5)
    place(out, click(4800, PIN, decay=0.004), 0.08, 0.55)
    # The wheel's ratchet: a quick run of pawl clicks that slows into the bolts
    t = 0.095
    for i in range(7):
        place(out, click(3600, [(1900 + 90 * i, 0.3, 0.01)], decay=0.003), t, 0.22 + 0.03 * i)
        t += 0.012 + 0.0035 * i
    # The bolts throw: a deep body thump, the plate ringing, and the hard edge of steel on steel
    place(out, thump(0.6, 140, 52, 0.16), 0.2, 1.0)
    place(out, modes(1.1, STEEL), 0.2, 0.55)
    place(out, click(2500, decay=0.009, seconds=0.08), 0.2, 0.45)
    place(out, click(3200, decay=0.006), 0.232, 0.25)  # the second bank of bolts, a hair behind
    # The heavy door swings on oiled hinges: a soft breath of air with a low hum under it
    swing = shaped_noise(0.9, 120, 1400, tilt=0.6) * env(0.9, [(0, 0), (0.25, 0.22), (0.6, 0.12), (0.9, 0)])
    hum = modes(0.9, [(61, 0.12, 0.5), (122, 0.05, 0.35)]) * env(0.9, [(0, 0), (0.2, 1), (0.9, 0.3)])
    place(out, swing + hum, 0.28, 1.0)
    # The door seats against its stop with a muffled final clunk
    place(out, thump(0.3, 95, 60, 0.07), 0.82, 0.35)
    place(out, modes(0.4, STEEL[:4]), 0.82, 0.1)
    finish(out, wet_gain=0.32, size=1.25, decay=0.78, damp=0.45, name="vault-open")


def stone():
    """The town hall. Beats match the buzz: slam at 0, ticks at 140 and 280 ms."""
    out = silence(1.5)
    # The iron ring knocks against its plate, then settles with a smaller tap
    place(out, modes(0.7, IRON_RING), 0.0, 0.55)
    place(out, thump(0.4, 180, 85, 0.06), 0.0, 0.6)
    place(out, click(1800, decay=0.007), 0.0, 0.4)
    place(out, modes(0.4, [(f * 1.004, a * 0.5, d * 0.6) for f, a, d in IRON_RING]), 0.07, 0.25)
    # The latch drops at the first tick
    place(out, click(2600, [(760, 0.4, 0.05), (1520, 0.2, 0.03)], decay=0.005), 0.14, 0.45)
    place(out, thump(0.25, 150, 90, 0.04), 0.14, 0.35)
    # The slabs roll open: a low, even grind of stone on stone, the dark weight of them under it,
    # and small grains catching as they go; it swells in on the second tick and eases out
    grind_len = 1.0
    grind = shaped_noise(grind_len, 60, 900, tilt=0.9)
    # A slow, uneven roughness so it reads as stone dragging rather than wind
    rough = 0.75 + 0.25 * np.interp(np.arange(len(grind)), np.linspace(0, len(grind), 24), rng.uniform(0, 1, 24))
    grind *= rough * env(grind_len, [(0, 0), (0.12, 0.55), (0.55, 0.45), (1.0, 0)])
    weight = modes(grind_len, [(48, 0.35, 0.6), (73, 0.2, 0.5)]) * env(grind_len, [(0, 0), (0.15, 1), (1.0, 0)])
    place(out, grind + weight, 0.24, 0.9)
    for i in range(9):
        place(out, click(rng.uniform(1400, 2600), decay=0.003, seconds=0.03), 0.3 + rng.uniform(0, 0.7), rng.uniform(0.05, 0.12))
    place(out, click(1500, decay=0.008), 0.28, 0.3)
    # The slabs come to rest against the walls
    place(out, thump(0.45, 120, 55, 0.12), 1.12, 0.45)
    finish(out, wet_gain=0.55, size=1.9, decay=0.84, damp=0.4, name="hall-open")


if __name__ == "__main__":
    wanted = sys.argv[1:] or ["vault", "stone"]
    for w in wanted:
        {"vault": vault, "stone": stone}[w]()
