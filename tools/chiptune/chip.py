"""
Tiny NES-flavoured chiptune renderer: two pulse channels, a triangle bass, a noise drum kit,
rendered with numpy straight to WAV. Songs are written as note strings per channel.
Usage: python3 chip.py <song module name> <out.wav>
"""
import sys, math, importlib
import numpy as np

SR = 44100

NOTE_NAMES = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}

def midi(name):
    """'F#5' -> midi number."""
    octave = int(name[-1]); pitch = NOTE_NAMES[name[:-1]]
    return 12 * (octave + 1) + pitch

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def parse(line):
    """'E5:2 -:1 B4:1' -> [(midi or None, sixteenths), ...]"""
    out = []
    for tok in line.split():
        name, dur = tok.split(":")
        out.append((None if name == "-" else midi(name), float(dur)))
    return out

# ---------------------------------------------------------------- oscillators

def pulse(freq, n, duty, phase0=0.0):
    t = np.arange(n) / SR
    ph = (phase0 + t * freq) % 1.0
    return np.where(ph < duty, 1.0, -1.0)

def pulse_vib(freq, n, duty, vib_depth=0.0, vib_rate=6.0, vib_delay=0.12, slide_from=None):
    """Pulse with delayed vibrato (semitones) and an optional pitch slide in from another frequency."""
    t = np.arange(n) / SR
    f = np.full(n, freq, dtype=float)
    if slide_from is not None:
        k = int(SR * 0.05)
        f[:k] = np.linspace(slide_from, freq, min(k, n))[:min(k, n)]
    if vib_depth:
        env = np.clip((t - vib_delay) / 0.08, 0, 1)
        f = f * 2 ** (vib_depth * env * np.sin(2 * np.pi * vib_rate * t) / 12)
    ph = np.cumsum(f) / SR
    return np.where((ph % 1.0) < duty, 1.0, -1.0)

def triangle(freq, n):
    t = np.arange(n) / SR
    ph = (t * freq) % 1.0
    tri = 4 * np.abs(ph - 0.5) - 1          # -1..1
    return np.round((tri + 1) * 7.5) / 7.5 - 1   # NES 16-step quantisation

_rng = np.random.default_rng(7)
def noise(n):
    return _rng.uniform(-1, 1, n)

def lowpass(x, cutoff):
    """One-pole lowpass."""
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    b = 1 - a
    for i in range(len(x)):
        acc = a * acc + b * x[i]
        y[i] = acc
    return y

def env_adsr(n, a=0.002, d=0.12, s=0.6, r=0.02):
    e = np.ones(n)
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    if A: e[:A] = np.linspace(0, 1, A)
    if D: e[A:A + D] = np.linspace(1, s, D)[:max(0, min(D, n - A))]
    e[A + D:] = s
    if R and n > R: e[-R:] *= np.linspace(1, 0, R)
    return e[:n]

# ---------------------------------------------------------------- rendering

class Song:
    def __init__(self, bpm, bars):
        self.bpm = bpm; self.bars = bars
        self.sixteenth = 60.0 / bpm / 4
        self.length = int(round(bars * 16 * self.sixteenth * SR))
        self.tail = int(2.5 * SR)              # room for echoes and releases past the loop end
        self.mix = np.zeros((self.length + self.tail, 2))

    def place(self, buf, start_s, gain, pan=0.0):
        start = int(round(start_s * SR))
        end = min(self.length + self.tail, start + len(buf))
        if end <= start: return
        seg = buf[:end - start] * gain
        l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
        self.mix[start:end, 0] += seg * l
        self.mix[start:end, 1] += seg * r

    def pulse_track(self, lines, duty=0.25, gain=0.22, pan=0.0, vib=0.25, legato=0.9, echo=0.0, slide=False, octave=0, duties=None, decay=0.1, sustain=0.65):
        t = 0.0; prev = None; k = 0
        for line in lines:
            for m, dur in parse(line):
                secs = dur * self.sixteenth
                if m is not None:
                    m += 12 * octave
                    n = int(secs * legato * SR)
                    f = hz(m)
                    d = duties[k % len(duties)] if duties else duty
                    k += 1
                    sf = hz(prev) if (slide and prev is not None and abs(prev - m) <= 3) else None
                    wave = pulse_vib(f, n, d, vib_depth=vib, slide_from=sf) * env_adsr(n, d=decay, s=sustain, r=0.03)
                    self.place(wave, t, gain, pan)
                    if echo:
                        self.place(wave, t + self.sixteenth * 2, gain * echo, -pan * 0.5 + 0.35)
                    prev = m
                t += secs

    def arp_track(self, chords, gain=0.13, pan=-0.35, duty=0.5, pattern=(0, 1, 2, 3)):
        """chords: list of (bars, [notes]) -> 16th-note arpeggios."""
        t = 0.0
        for bars, notes in chords:
            steps = int(bars * 16)
            for i in range(steps):
                m = midi(notes[pattern[i % len(pattern)] % len(notes)])
                n = int(self.sixteenth * 0.95 * SR)
                wave = pulse(hz(m), n, duty) * env_adsr(n, d=0.05, s=0.5, r=0.01)
                self.place(wave, t, gain, pan)
                t += self.sixteenth

    def bass_track(self, lines, gain=0.42, pluck=0.0, legato=0.92, slide=False):
        t = 0.0; prev = None
        for line in lines:
            for m, dur in parse(line):
                secs = dur * self.sixteenth
                if m is not None:
                    n = int(secs * legato * SR)
                    f = hz(m)
                    if slide and prev is not None and abs(prev - m) <= 5:
                        tt = np.arange(n) / SR
                        ff = np.where(tt < 0.06, hz(prev) + (f - hz(prev)) * tt / 0.06, f)
                        ph = np.cumsum(ff) / SR % 1.0
                        tri = np.round((4 * np.abs(ph - 0.5) - 1 + 1) * 7.5) / 7.5 - 1
                    else:
                        tri = triangle(f, n)
                    wave = tri * env_adsr(n, a=0.001, d=0.02, s=0.9, r=0.015)
                    if pluck:
                        wave = wave + pulse(f * 2, n, 0.125) * env_adsr(n, a=0.001, d=0.04, s=0.0, r=0.01) * pluck
                    self.place(wave, t, gain)
                    prev = m
                t += secs

    def drum_track(self, pattern_lines, gain=0.5):
        """Each char is a 16th: K kick, S snare, h hat, H open hat, . rest"""
        t = 0.0
        for line in pattern_lines:
            for c in line.replace(" ", ""):
                if c == "K":
                    n = int(0.12 * SR); tt = np.arange(n) / SR
                    body = np.sin(2 * np.pi * (150 * np.exp(-tt * 18) + 40) * tt) * np.exp(-tt * 22)
                    click = lowpass(noise(n), 1200) * np.exp(-tt * 90) * 0.8
                    self.place((body + click), t, gain * 1.1)
                elif c == "S":
                    n = int(0.14 * SR); tt = np.arange(n) / SR
                    w = lowpass(noise(n), 6000) * np.exp(-tt * 24) + np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 40) * 0.5
                    self.place(w, t, gain * 0.7)
                elif c == "h":
                    n = int(0.03 * SR); tt = np.arange(n) / SR
                    w = (noise(n) - lowpass(noise(n), 3000)) * np.exp(-tt * 120)
                    self.place(w, t, gain * 0.28)
                elif c == "H":
                    n = int(0.12 * SR); tt = np.arange(n) / SR
                    w = (noise(n) - lowpass(noise(n), 3000)) * np.exp(-tt * 30)
                    self.place(w, t, gain * 0.25)
                t += self.sixteenth

    def render(self, path, peak=0.89, loop=True):
        x = self.mix[: self.length].copy()
        if loop:
            spill = self.mix[self.length :]
            x[: len(spill)] += spill            # the tail lands under the first beat: no seam

        x = np.tanh(x * 1.15) / math.tanh(1.15)        # gentle soft clip
        x *= peak / max(1e-9, np.max(np.abs(x)))
        pcm = (x * 32767).astype("<i2")
        import wave
        with wave.open(path, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        print(f"wrote {path}: {self.length / SR:.2f}s, {self.bars} bars @ {self.bpm} bpm")

if __name__ == "__main__":
    mod = importlib.import_module(sys.argv[1])
    song = mod.build()
    song.render(sys.argv[2])
