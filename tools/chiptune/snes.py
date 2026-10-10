"""
SNES-flavoured instruments for chip.py: the SPC700 played samples, not square waves, so these are
additive / FM / plucked-string voices with the slow attacks, vibrato and echo that make Chrono
Trigger sound like Chrono Trigger. Every voice takes (freq, n) and returns a float array in -1..1.
"""
import math
import numpy as np
from chip import SR, lowpass, noise, env_adsr

def _t(n):
    return np.arange(n) / SR

def _vibrato(freq, n, depth=0.25, rate=5.5, delay=0.15):
    t = _t(n)
    env = np.clip((t - delay) / 0.12, 0, 1)
    return freq * 2 ** (depth * env * np.sin(2 * np.pi * rate * t) / 12)

def _phase(f):
    return np.cumsum(f) / SR

def _saw(freq_arr, n, harmonics=12):
    """Additive sawtooth: smooth, no aliasing fizz."""
    ph = _phase(freq_arr)
    out = np.zeros(n)
    top = min(harmonics, int(20000 / max(1.0, float(np.max(freq_arr)))))
    for k in range(1, max(2, top) + 1):
        out += np.sin(2 * np.pi * k * ph) / k
    return out * (2 / math.pi)

def strings(freq, n):
    """Three detuned saws, slow attack, lowpassed: the string pad."""
    f = _vibrato(freq, n, depth=0.15, rate=4.5, delay=0.25)
    out = _saw(f * 0.997, n, 10) + _saw(f * 1.003, n, 10) + _saw(f, n, 10) * 0.8
    out = lowpass(out, 2800) * env_adsr(n, a=0.08, d=0.2, s=0.85, r=0.12)
    return out / 2.8

def flute(freq, n):
    """Sine with a little second harmonic, breath at the onset, delayed vibrato."""
    f = _vibrato(freq, n, depth=0.3, rate=5.2, delay=0.18)
    ph = _phase(f)
    tone = np.sin(2 * np.pi * ph) + 0.28 * np.sin(4 * np.pi * ph) + 0.08 * np.sin(6 * np.pi * ph)
    breath = lowpass(noise(n), 3000) * np.exp(-_t(n) * 40) * 0.25
    return (tone + breath) * env_adsr(n, a=0.03, d=0.1, s=0.8, r=0.05) / 1.4

def bell(freq, n):
    """FM bell: inharmonic modulator with a decaying index, long ring."""
    t = _t(n)
    index = 2.5 * np.exp(-t * 3.5)
    mod = np.sin(2 * np.pi * freq * 3.53 * t) * index
    out = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 2.2)
    out += 0.3 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 6)
    return out * env_adsr(n, a=0.002, d=0.05, s=1.0, r=0.03) / 1.3

def brass(freq, n):
    """Detuned saws through a rising filter: the horn section."""
    f = _vibrato(freq, n, depth=0.2, rate=5.0, delay=0.2)
    raw = _saw(f, n, 14) + 0.6 * _saw(f * 1.004, n, 14)
    t = _t(n)
    # the filter opens over the first 60 ms: two blends of a dark and a bright version
    dark = lowpass(raw, 900)
    bright = lowpass(raw, 4500)
    mix = np.clip(t / 0.06, 0, 1)
    out = dark * (1 - mix) + bright * mix
    return out * env_adsr(n, a=0.02, d=0.15, s=0.75, r=0.06) / 1.6

def harp(freq, n):
    """Karplus-Strong plucked string, processed one period at a time."""
    period = max(2, int(round(SR / freq)))
    out = np.empty(n)
    buf = np.random.default_rng(int(freq)).uniform(-1, 1, period)
    buf = lowpass(buf, 6000)
    pos = 0
    while pos < n:
        k = min(period, n - pos)
        out[pos:pos + k] = buf[:k]
        # average with the neighbour: the string loses its brightness
        buf = 0.5 * (buf + np.roll(buf, 1)) * 0.996
        pos += k
    return out * env_adsr(n, a=0.001, d=0.02, s=1.0, r=0.02)

def epiano(freq, n):
    """Two-operator FM electric piano."""
    t = _t(n)
    index = 1.2 * np.exp(-t * 4)
    out = np.sin(2 * np.pi * freq * t + index * np.sin(2 * np.pi * freq * 2 * t)) * np.exp(-t * 1.6)
    return out * env_adsr(n, a=0.003, d=0.1, s=0.9, r=0.04)

def synthbass(freq, n):
    """Sine fundamental with a filtered saw on top: the round SNES bass."""
    t = _t(n)
    fund = np.sin(2 * np.pi * freq * t)
    raw = _saw(np.full(n, freq), n, 8)
    # the filter closes over the first 50 ms: bright pluck, round body
    mix = np.clip(t / 0.05, 0, 1)
    top = lowpass(raw, 2200) * (1 - mix) + lowpass(raw, 700) * mix
    return (fund * 0.8 + top * 0.6) * env_adsr(n, a=0.004, d=0.08, s=0.8, r=0.03) / 1.2

def choir(freq, n):
    """Soft 'aah': saw harmonics shaped like formants, slow attack."""
    f = _vibrato(freq, n, depth=0.2, rate=4.8, delay=0.3)
    ph = _phase(f)
    out = np.zeros(n)
    for k, g in ((1, 1.0), (2, 0.5), (3, 0.6), (4, 0.25), (5, 0.3), (6, 0.1)):
        out += g * np.sin(2 * np.pi * k * ph)
    return lowpass(out, 2200) * env_adsr(n, a=0.12, d=0.3, s=0.8, r=0.2) / 2.2

VOICES = {"strings": strings, "flute": flute, "bell": bell, "brass": brass, "harp": harp, "epiano": epiano, "synthbass": synthbass, "choir": choir}

# ---------------------------------------------------------------- drums (sample-like)

def kick(n=None):
    n = n or int(0.25 * SR); t = _t(n)
    body = np.sin(2 * np.pi * (165 * np.exp(-t * 14) + 48) * t) * np.exp(-t * 9)
    click = lowpass(noise(n), 2500) * np.exp(-t * 120) * 0.6
    return np.tanh((body + click) * 1.6)

def snare(n=None):
    n = n or int(0.22 * SR); t = _t(n)
    shell = (np.sin(2 * np.pi * 185 * t) + 0.6 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 25)
    wires = (noise(n) - lowpass(noise(n), 1500)) * np.exp(-t * 16)
    return np.tanh((shell * 0.7 + wires * 0.9) * 1.3)

def hat(open_=False):
    n = int((0.25 if open_ else 0.05) * SR); t = _t(n)
    metal = noise(n) - lowpass(noise(n), 5000)
    return metal * np.exp(-t * (14 if open_ else 90)) * 0.8

def tom(freq=110):
    n = int(0.3 * SR); t = _t(n)
    return np.sin(2 * np.pi * (freq * np.exp(-t * 6) + freq * 0.6) * t) * np.exp(-t * 7)

def timpani(freq=65):
    n = int(0.9 * SR); t = _t(n)
    return (np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 1.5 * t)) * np.exp(-t * 3.5)

# ---------------------------------------------------------------- the SNES echo

def snes_echo(mix, delay_s=0.18, feedback=0.42, wet=0.28, taps=6, tone=3200):
    """A feedback delay with a dark tone on the repeats, like the SPC700 echo buffer."""
    d = int(delay_s * SR)
    out = mix.copy()
    repeat = mix.copy()
    for k in range(1, taps + 1):
        repeat = np.stack([lowpass(repeat[:, 0], tone), lowpass(repeat[:, 1], tone)], axis=1) * feedback
        shifted = np.zeros_like(mix)
        if k * d < len(mix):
            shifted[k * d:] = repeat[: len(mix) - k * d]
        # alternate sides a little: the repeats drift across the stereo field
        if k % 2:
            shifted = shifted[:, ::-1] * np.array([1.0, 0.85])
        out += shifted * wet
    return out
