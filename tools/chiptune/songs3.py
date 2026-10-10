"""
Soundtrack v3: the Chrono Trigger / DKC model. Chords change every two bars and reach for
extensions, a dark pad sits under everything, the bass has weight and its own line, leads live
between C4 and C5 with space around them, a quiet glass bell doubles the melody an octave up,
percussion is sparse (shaker, deep toms, soft snare) or absent, and the whole mix goes through a hall.
"""
from chip import Song
from theory import chord, root_name, fifth_name

SONGS = {}
def song(name):
    def wrap(fn):
        SONGS[name] = fn
        return fn
    return wrap

RENDER = {"hall": 0.32, "echo": 0.18, "shelf": 0.6}

def held(syms, bars_each, voice_index, octave, inst, s, gain, pan=0.0):
    """One chord tone held for `bars_each` bars per chord."""
    lines = [f"{chord(c, octave)[voice_index]}:{16 * bars_each}" for c in syms]
    s.pulse_track(lines, inst=inst, gain=gain, legato=0.995, pan=pan)

def bed(s, syms, bars_each=2, gain=0.09, octave=3):
    """The floor: root and fifth in low strings, third and seventh in the dark pad."""
    held(syms, bars_each, 0, octave, "lowstrings", s, gain * 1.1, pan=-0.2)
    held(syms, bars_each, 2, octave, "lowstrings", s, gain * 0.7, pan=0.2)
    held(syms, bars_each, 1, octave + 1, "darkpad", s, gain * 0.8, pan=0.35)
    held(syms, bars_each, 3, octave + 1, "darkpad", s, gain * 0.6, pan=-0.35)

def sub(s, syms, bars_each=2, gain=0.3, octave=1):
    """Another floor below the floor: the root held in bowed low strings an octave under the bass."""
    held(syms, bars_each, 0, octave, "lowstrings", s, gain, pan=0.0)

def bass_walk(s, syms, bars_each=2, gain=0.46, octave=1, pattern="r...r.5.r...o.5r"):
    """A bass line per chord: r root, 5 fifth, o octave, . rest, _ hold. One char per 8th over two bars."""
    lines = []
    for c in syms:
        r, f, o = root_name(c, octave), fifth_name(c, octave), root_name(c, octave + 1)
        toks = []
        pat = pattern * bars_each
        for ch in pat[: 8 * bars_each]:
            toks.append({"r": f"{r}:2", "5": f"{f}:2", "o": f"{o}:2", ".": "-:2"}[ch])
        lines.append(" ".join(toks))
    s.bass_track(lines, gain=gain, inst="synthbass", legato=0.85)

def arps(s, syms, bars_each=2, inst="harp", gain=0.14, pan=-0.3, octave=4, pattern=(0, 1, 2, 3, 2, 1, 0, 2)):
    """Eighth-note arpeggios (not sixteenths): two bars per chord."""
    s.arp_track([(bars_each, chord(c, octave)) for c in syms], gain=gain, pan=pan, inst=inst, ring=2.4, pattern=tuple(p for p in pattern for _ in (0, 1)))

def lead(s, lines, inst="softlead", gain=0.2, glass_gain=0.05, echo=0.22, vib=0.3):
    s.pulse_track(lines, inst=inst, gain=gain, legato=0.93, echo=echo, vib=vib)
    if glass_gain:
        s.pulse_track(lines, inst="glass", gain=glass_gain, legato=0.9, octave=1, pan=0.3)

SHAKER = "x.x.x.x.x.x.x.x."
SOFT = "D.......s.......D...D...s......."
SOFT2 = "D.......s.....x.D.......s...D..."

@song("startScreen")   # 'Do It For The XP' title: slow, wide, hopeful
def _():
    s = Song(bpm=92, bars=16)
    c = ["Cmaj7", "Am9", "Fmaj7", "G6", "Cmaj7", "Em7", "Fmaj7", "Gsus4"]
    bed(s, c, gain=0.1)
    bass_walk(s, c, gain=0.44, pattern="r.......r...5...")
    arps(s, c, inst="harp", gain=0.12)
    lead(s, [
        "-:8 E4:4 G4:4", "C5:12 B4:4", "A4:8 G4:4 E4:4", "G4:16",
        "-:8 D4:4 E4:4", "G4:12 A4:4", "C5:8 B4:4 G4:4", "A4:16",
        "-:4 A4:4 C5:4 E5:4", "D5:12 C5:4", "B4:8 G4:8", "E4:12 -:4",
        "F4:4 A4:4 C5:8", "D5:8 B4:8", "G4:8 A4:4 B4:4", "C5:16",
    ], gain=0.19, glass_gain=0.06)
    s.drum_track([SOFT] * 8, gain=0.3)
    return s

@song("hometown")      # the town: warm, lazy groove, e-piano and marimba
def _():
    s = Song(bpm=104, bars=16)
    c = ["Fmaj7", "Dm7", "Bbmaj7", "C6", "Fmaj7", "Am7", "Bbmaj7", "Csus4"]
    bed(s, c, gain=0.07)
    bass_walk(s, c, gain=0.46, pattern="r...o.5.r..r.5..")
    arps(s, c, inst="epiano", gain=0.12, pan=-0.25, pattern=(0, 2, 1, 3, 2, 0, 1, 2))
    s.arp_track([(2, chord(x, 5)) for x in c], gain=0.07, pan=0.4, inst="marimba", ring=1.2, pattern=(3, 1, 2, 0, 3, 2, 1, 0, 2, 3, 0, 1, 2, 1, 3, 0))
    lead(s, [
        "-:4 A4:4 C5:4 D5:4", "C5:8 A4:4 F4:4", "-:4 G4:4 A4:4 D5:4", "C5:12 -:4",
        "-:4 A4:4 C5:4 F5:4", "E5:8 C5:4 A4:4", "-:4 G4:4 Bb4:4 D5:4", "C5:12 -:4",
        "F4:4 A4:4 C5:8", "D5:4 C5:4 A4:8", "-:4 C5:4 D5:4 F5:4", "E5:8 C5:8",
        "A4:4 Bb4:4 D5:8", "C5:4 A4:4 F4:8", "G4:4 A4:4 Bb4:4 C5:4", "F4:12 -:4",
    ], inst="softlead", gain=0.18, glass_gain=0.04)
    s.drum_track([SOFT2] * 8, gain=0.34)
    return s

@song("battle")        # 'Sock Drawer' v3: the funk kept, the register dropped, a floor underneath
def _():
    s = Song(bpm=108, bars=16)
    c = ["Em9", "Em9", "Am9", "Em9", "Cmaj7", "Bm7", "Em9", "B7"]
    bed(s, c, gain=0.07, octave=2)
    riff = {
        "Em9": "E1:2 -:2 E1:1 E2:1 -:2 G1:2 -:2 A1:1 A#1:1 B1:2 -:2 E2:2 D2:1 B1:1 -:2 E1:2 -:2 E1:1 E2:1 -:2 G1:2 -:2 A1:2 B1:2 -:2 D2:2 B1:2",
        "Am9": "A1:2 -:2 A1:1 A2:1 -:2 C2:2 -:2 D2:1 D#2:1 E2:2 -:2 A2:2 G2:1 E2:1 -:2 A1:2 -:2 A1:1 A2:1 -:2 C2:2 -:2 D2:2 E2:2 -:2 G2:2 E2:2",
        "Cmaj7": "C2:2 -:2 C2:1 C3:1 -:2 E2:2 -:2 G2:2 -:2 B2:2 G2:1 E2:1 -:2 C2:2 -:2 C2:1 C3:1 -:2 E2:2 -:2 G2:2 A2:2 -:2 B2:2 G2:2",
        "Bm7": "B1:2 -:2 B1:1 B2:1 -:2 D2:2 -:2 F#2:2 -:2 A2:2 F#2:1 D2:1 -:2 B1:2 -:2 B1:1 B2:1 -:2 D2:2 -:2 F#2:2 A2:2 -:2 D2:2 B1:2",
        "B7": "B1:2 -:2 B1:1 B2:1 -:2 D#2:2 -:2 F#2:2 -:2 A2:2 F#2:1 D#2:1 -:2 B1:2 -:2 B1:1 B2:1 -:2 D#2:2 -:2 F#2:2 A2:2 -:2 D#2:2 B1:2",
    }
    s.bass_track([riff[x] for x in c], gain=0.5, inst="synthbass", legato=0.8, slide=True)
    stabs = {"Em9": "-:2 E4:1 -:1 -:2 G4:1 -:1 -:2 D5:1 -:1 -:2 F#4:1 -:1", "Am9": "-:2 A4:1 -:1 -:2 C5:1 -:1 -:2 G4:1 -:1 -:2 B4:1 -:1", "Cmaj7": "-:2 E4:1 -:1 -:2 G4:1 -:1 -:2 B4:1 -:1 -:2 E4:1 -:1", "Bm7": "-:2 F#4:1 -:1 -:2 A4:1 -:1 -:2 D5:1 -:1 -:2 F#4:1 -:1", "B7": "-:2 F#4:1 -:1 -:2 A4:1 -:1 -:2 D#5:1 -:1 -:2 F#4:1 -:1"}
    s.pulse_track([stabs[x] + " " + stabs[x] for x in c], inst="brass", gain=0.12, legato=0.5, pan=0.4)
    lead(s, [
        "-:8 E4:2 G4:2 A4:1 A#4:1 B4:2", "D5:3 B4:1 G4:2 E4:2 -:8",
        "-:4 B4:2 D5:2 E5:4 D5:2 B4:2", "G4:2 A#4:1 A4:1 G4:2 E4:2 D4:8",
        "A4:2 C5:2 D5:1 D#5:1 E5:2 G5:4 E5:4", "D5:2 C5:2 A4:2 G4:2 A4:8",
        "-:8 E4:2 G4:2 A4:1 A#4:1 B4:2", "E5:3 D5:1 B4:2 G4:2 A4:1 A#4:1 B4:6",
        "B4:2 D5:2 F#5:4 A5:2 F#5:2 D5:4", "C5:2 E5:2 G5:4 E5:2 C5:2 A4:4",
        "G4:1 G#4:1 A4:2 B4:4 D5:2 E5:2 G5:4", "F#5:2 D5:2 B4:2 A4:2 F#4:8",
        "-:4 E4:1 E4:1 G4:2 A4:2 A#4:2 B4:4", "D5:2 E5:2 G5:2 E5:2 D5:2 B4:2 A4:4",
        "C5:2 C#5:2 E5:4 G5:2 E5:2 C#5:4", "B4:2 A4:2 F#4:2 D#4:2 B3:4 -:4",
    ], inst="epiano", gain=0.2, glass_gain=0.0, echo=0.18, vib=0.2)
    s.drum_track(["K.x.s.xKx.K.s.xx", "K.xKs.x.xKK.s.xH"] * 8, gain=0.46)
    return s

@song("dungeon")       # 'Temple of Chores' v3: a slow march far below, marimba counting the stairs
def _():
    s = Song(bpm=70, bars=16)
    c = ["Dm9", "Dm9", "Bbmaj7", "A7", "Gm7", "Dm9", "Bbmaj7", "A7"]
    sub(s, c, gain=0.32, octave=1)
    bed(s, c, gain=0.11, octave=2)
    bass_walk(s, c, gain=0.5, pattern="r.......5...r.o.")
    s.arp_track([(2, chord(x, 3)) for x in c], gain=0.1, pan=-0.3, inst="marimba", ring=1.5, pattern=(0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 1, 2, 1))
    lead(s, [
        "-:8 D4:4 F4:4", "A4:12 G4:4", "F4:8 E4:4 D4:4", "C#4:16",
        "-:8 D4:4 F4:4", "A4:8 C5:8", "Bb4:8 A4:4 F4:4", "E4:12 -:4",
        "G4:8 Bb4:4 D5:4", "C5:8 A4:8", "F4:8 A4:4 D5:4", "C#5:12 -:4",
        "D5:8 C5:4 A4:4", "Bb4:8 A4:4 F4:4", "E4:4 F4:4 G4:4 A4:4", "D4:16",
    ], inst="softlead", gain=0.19, glass_gain=0.05, echo=0.3)
    s.drum_track(["D.......D...D...", "D.......D.....x."] * 8, gain=0.42)
    return s


@song("temple")        # 'Lantern Hall' v3: slow, hollow, the marimba echoing down a corridor
def _():
    s = Song(bpm=68, bars=16)
    c = ["Dm9", "Gm7", "Dm9", "A7sus4", "Bbmaj7", "Gm7", "Dm9", "A7"]
    sub(s, c, gain=0.32, octave=1)
    bed(s, c, gain=0.1, octave=2)
    bass_walk(s, c, gain=0.46, pattern="r.......r.....5.")
    s.arp_track([(2, chord(x, 3)) for x in c], gain=0.09, pan=-0.35, inst="marimba", ring=1.6, pattern=(0, 2, 3, 2, 1, 2, 3, 2, 0, 3, 2, 3, 1, 3, 2, 3))
    lead(s, [
        "-:12 A3:4", "D4:12 F4:4", "E4:8 D4:8", "C#4:12 -:4",
        "-:8 A3:4 D4:4", "F4:8 G4:8", "E4:12 D4:4", "D4:16",
        "-:4 F4:4 A4:4 Bb4:4", "A4:12 G4:4", "F4:8 D4:8", "E4:12 -:4",
        "D4:4 F4:4 A4:8", "G4:8 F4:8", "E4:4 C#4:4 E4:8", "D4:16",
    ], inst="flute", gain=0.17, glass_gain=0.05, echo=0.32)
    s.drum_track(["D...............", "........D.....x."] * 8, gain=0.4)
    return s


# --------------------------------------------------------------------------- one theme per temple

@song("temple-wind")   # The Howling Spire: airy Dorian, flute over harp, no drums, wind in the strings
def _():
    s = Song(bpm=78, bars=16)
    c = ["Em9", "Cmaj7", "D6", "Em9", "Am9", "Cmaj7", "Bm7", "Em9"]
    sub(s, c, gain=0.22, octave=1)
    bed(s, c, gain=0.1, octave=3)
    bass_walk(s, c, gain=0.36, pattern="r.......r...5...")
    arps(s, c, inst="harp", gain=0.13, pan=-0.35, octave=4, pattern=(0, 2, 3, 2, 1, 3, 2, 1))
    lead(s, [
        "-:8 B4:4 D5:4", "E5:12 D5:4", "B4:8 A4:4 G4:4", "F#4:16",
        "-:8 G4:4 A4:4", "B4:8 D5:8", "C5:8 B4:4 A4:4", "B4:16",
        "E5:8 D5:4 B4:4", "C5:8 A4:8", "G4:8 B4:4 D5:4", "F#5:12 -:4",
        "E5:4 D5:4 B4:8", "A4:8 G4:8", "F#4:4 G4:4 A4:4 B4:4", "E4:16",
    ], inst="flute", gain=0.17, glass_gain=0.05, echo=0.3)
    return s

@song("temple-earth")  # Rootvault Hollow: low pentatonic, marimba and deep toms, the ground breathing
def _():
    s = Song(bpm=74, bars=16)
    c = ["Dm9", "Dm9", "Bbmaj7", "Gm7", "Dm9", "Fmaj7", "Gm7", "A7sus4"]
    sub(s, c, gain=0.34, octave=1)
    bed(s, c, gain=0.1, octave=2)
    bass_walk(s, c, gain=0.5, pattern="r.r.....5...r.o.")
    s.arp_track([(2, chord(x, 3)) for x in c], gain=0.12, pan=-0.3, inst="marimba", ring=1.4, pattern=(0, 0, 2, 1, 2, 2, 3, 2, 0, 2, 1, 2, 3, 2, 1, 2))
    lead(s, [
        "D4:8 F4:4 A4:4", "G4:12 -:4", "F4:8 D4:4 C4:4", "D4:16",
        "A4:8 G4:4 F4:4", "D4:12 -:4", "F4:8 G4:4 A4:4", "C5:16",
        "D5:8 C5:4 A4:4", "G4:12 -:4", "A4:4 G4:4 F4:4 D4:4", "F4:16",
        "G4:8 A4:4 C5:4", "D5:12 -:4", "A4:8 G4:4 F4:4", "D4:16",
    ], inst="softlead", gain=0.18, glass_gain=0.0, echo=0.25)
    s.drum_track(["D.......D...D...", "D.......D.....x.", "D...D...D.......", "D.......D.D...x."] * 4, gain=0.44)
    return s

@song("temple-water")  # Tidesong Palace: rolling e-piano waves, a lydian lift, soft shaker like surf
def _():
    s = Song(bpm=82, bars=16)
    c = ["Fmaj9", "Gsus2", "Am9", "Gsus2", "Fmaj9", "Em7", "Dm9", "Gsus2"]
    sub(s, c, gain=0.24, octave=1)
    bed(s, c, gain=0.09, octave=3)
    bass_walk(s, c, gain=0.42, pattern="r.....o.r.......")
    arps(s, c, inst="epiano", gain=0.14, pan=-0.3, octave=4, pattern=(0, 1, 2, 3, 2, 1, 0, 1))
    lead(s, [
        "-:8 A4:4 C5:4", "D5:8 B4:8", "C5:8 A4:4 G4:4", "E4:16",
        "-:8 F4:4 A4:4", "B4:8 G4:8", "A4:8 F4:4 E4:4", "D4:16",
        "A4:8 C5:4 E5:4", "D5:12 -:4", "C5:8 B4:4 G4:4", "A4:16",
        "F4:4 A4:4 C5:8", "B4:8 D5:8", "C5:4 A4:4 F4:8", "G4:16",
    ], inst="flute", gain=0.16, glass_gain=0.06, echo=0.35)
    s.drum_track(["x...x...x...x...", "x...x...x.x.x..."] * 8, gain=0.3)
    return s

@song("temple-fire")   # Emberforge Citadel: phrygian brass in the low register, hammer toms
def _():
    s = Song(bpm=86, bars=16)
    c = ["Em9", "Fmaj7", "Em9", "Dm9", "Em9", "Fmaj7", "G6", "Fmaj7"]
    sub(s, c, gain=0.34, octave=1)
    bed(s, c, gain=0.11, octave=2)
    bass_walk(s, c, gain=0.5, pattern="r...r.r.5...r.o.")
    s.pulse_track([f"{chord(x, 3)[0]}:4 -:4 {chord(x, 3)[2]}:4 -:4 {chord(x, 3)[0]}:4 -:4 {chord(x, 3)[1]}:4 -:4" for x in c], inst="brass", gain=0.13, legato=0.6, pan=0.3)
    lead(s, [
        "E4:4 F4:4 E4:4 D4:4", "E4:12 -:4", "G4:4 F4:4 E4:4 D4:4", "C4:16",
        "E4:4 F4:4 G4:4 A4:4", "G4:12 -:4", "F4:4 E4:4 D4:4 C4:4", "D4:16",
        "B4:8 A4:4 G4:4", "F4:12 -:4", "E4:8 D4:4 C4:4", "D4:16",
        "E4:4 G4:4 B4:8", "A4:8 G4:8", "F4:4 E4:4 D4:4 F4:4", "E4:16",
    ], inst="softlead", gain=0.18, glass_gain=0.0, echo=0.22)
    s.drum_track(["D...D...D...D...", "D...D...D...D.T."] * 8, gain=0.46)
    return s

@song("temple-ice")    # Glasswinter Keep: bells and glass, very slow, everything held mid-breath
def _():
    s = Song(bpm=66, bars=16)
    c = ["Amadd9", "Fmaj7", "Cmaj7", "Gsus2", "Amadd9", "Fmaj7", "Dm9", "E7sus4"]
    sub(s, c, gain=0.2, octave=1)
    bed(s, c, gain=0.1, octave=3)
    bass_walk(s, c, gain=0.34, pattern="r...............")
    arps(s, c, inst="bell", gain=0.08, pan=-0.3, octave=4, pattern=(0, 2, 1, 3, 2, 1, 3, 2))
    lead(s, [
        "-:8 E4:4 A4:4", "C5:12 B4:4", "A4:8 G4:8", "E4:16",
        "-:8 C4:4 E4:4", "G4:12 A4:4", "F4:8 E4:8", "D4:16",
        "A4:8 C5:4 E5:4", "D5:12 -:4", "C5:8 B4:4 G4:4", "A4:16",
        "F4:8 A4:8", "G4:8 E4:8", "D4:4 E4:4 F4:4 G4:4", "E4:16",
    ], inst="glass", gain=0.14, glass_gain=0.0, echo=0.4)
    return s

@song("temple-light")  # Sunspire Sanctum: choir and strings, major, slow and hopeful
def _():
    s = Song(bpm=72, bars=16)
    c = ["Cmaj9", "Fmaj7", "Am9", "G6", "Cmaj9", "Em7", "Fmaj7", "Gsus4"]
    sub(s, c, gain=0.22, octave=1)
    bed(s, c, gain=0.1, octave=3)
    held(c, 2, 1, 4, "choir", s, 0.1, pan=0.2)
    bass_walk(s, c, gain=0.36, pattern="r.......5.......")
    arps(s, c, inst="harp", gain=0.11, pan=-0.3, octave=4)
    lead(s, [
        "-:8 G4:4 A4:4", "C5:12 B4:4", "A4:8 G4:4 E4:4", "G4:16",
        "-:8 E4:4 F4:4", "G4:12 A4:4", "F4:8 E4:4 D4:4", "E4:16",
        "A4:8 C5:4 D5:4", "E5:12 D5:4", "C5:8 A4:8", "G4:16",
        "F4:4 G4:4 A4:8", "C5:8 B4:8", "A4:4 G4:4 F4:4 D4:4", "C4:16",
    ], inst="softlead", gain=0.17, glass_gain=0.06, echo=0.3)
    s.drum_track(["D.......x.......", "........x...x..."] * 8, gain=0.3)
    return s

@song("temple-shadow") # The Moonveil Shrine: chromatic pad, a bell that does not resolve
def _():
    s = Song(bpm=64, bars=16)
    c = ["Cm9", "Abmaj7", "Cm9", "G7", "Fm9", "Dbmaj7", "Cm9", "G7"]
    sub(s, c, gain=0.3, octave=1)
    bed(s, c, gain=0.12, octave=2)
    bass_walk(s, c, gain=0.4, pattern="r.......r.....o.")
    arps(s, c, inst="bell", gain=0.07, pan=-0.35, octave=4, pattern=(0, 3, 1, 2, 3, 1, 2, 0))
    lead(s, [
        "-:8 G4:4 Ab4:4", "G4:12 -:4", "Eb4:8 D4:4 C4:4", "B3:16",
        "-:8 C4:4 Eb4:4", "G4:8 Ab4:8", "G4:8 F4:4 Eb4:4", "D4:16",
        "Ab4:8 G4:4 F4:4", "Db5:12 -:4", "C5:8 Bb4:4 Ab4:4", "G4:16",
        "Eb4:4 F4:4 G4:8", "Ab4:8 B4:8", "C5:4 B4:4 G4:4 F4:4", "Eb4:16",
    ], inst="softlead", gain=0.17, glass_gain=0.04, echo=0.4)
    s.drum_track(["D...............", "........D......."] * 8, gain=0.36)
    return s
