"""Battle and dungeon music: funky, a little weird, and seamless. Three fights, two dungeons."""
from chip import Song
from theory import chord, bass_line
from songs import chords_arp, bass, pad, ROCK, ROCK_FILL, HAT8

SONGS = {}
def song(name):
    def wrap(fn):
        SONGS[name] = fn
        return fn
    return wrap

FUNK = "K.h.S.hKh.K.S.hh"
FUNK2 = "K.hKS.h.hKK.S.hH"
WEIRD = "K..hS.K.h.KhS..S"

@song("battle")        # 'Sock Drawer Funk': a slap bass that never sits still, stabs on the off-beats
def _():
    s = Song(bpm=112, bars=16)
    # E7#9-flavoured vamp with a lift to A7 / B7 like a 12-bar that forgot the rules
    c = ["E7", "E7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7", "E7", "E7", "A7", "B7"]
    funk_e = "E2:1 -:1 E2:1 E3:1 -:1 E2:1 G2:1 -:1 A2:1 -:1 A#2:1 B2:1 -:1 E3:1 D3:1 B2:1"
    funk_a = "A2:1 -:1 A2:1 A3:1 -:1 A2:1 C3:1 -:1 D3:1 -:1 D#3:1 E3:1 -:1 A3:1 G3:1 E3:1"
    funk_b = "B2:1 -:1 B2:1 B3:1 -:1 B2:1 D3:1 -:1 E3:1 -:1 F3:1 F#3:1 -:1 B3:1 A3:1 F#3:1"
    bass_lines = [{"E7": funk_e, "A7": funk_a, "B7": funk_b}[x] for x in c]
    s.bass_track(bass_lines, gain=0.44, pluck=0.35, legato=0.8, slide=True)
    # Off-beat horn stabs: 50% pulse, short
    stabs = {"E7": "-:2 E5:1 -:1 -:2 G#5:1 -:1 -:2 D6:1 -:1 -:2 E5:1 -:1", "A7": "-:2 A5:1 -:1 -:2 C#6:1 -:1 -:2 G5:1 -:1 -:2 A5:1 -:1", "B7": "-:2 B5:1 -:1 -:2 D#6:1 -:1 -:2 A5:1 -:1 -:2 B5:1 -:1"}
    s.pulse_track([stabs[x] for x in c], gain=0.16, legato=0.5, pan=0.4, inst="brass")
    # The weird lead: blue notes, slides, a different duty every note (wah)
    lead = [
        "-:8 E5:2 G5:2 A5:1 A#5:1 B5:2", "D6:3 B5:1 G5:2 E5:2 -:2 G5:1 G#5:1 E5:4",
        "-:4 B5:2 D6:2 E6:4 D6:2 B5:2", "G5:2 A#5:1 A5:1 G5:2 E5:2 D5:8",
        "A5:2 C6:2 D6:1 D#6:1 E6:2 G6:4 E6:4", "D6:2 C6:2 A5:2 G5:2 A5:8",
        "-:8 E5:2 G5:2 A5:1 A#5:1 B5:2", "E6:3 D6:1 B5:2 G5:2 A5:1 A#5:1 B5:6",
        "B5:2 D#6:2 F#6:4 A6:2 F#6:2 D#6:4", "C#6:2 E6:2 G6:4 E6:2 C#6:2 A5:4",
        "G5:1 G#5:1 A5:2 B5:4 D6:2 E6:2 G6:4", "F#6:2 D#6:2 B5:2 A5:2 F#5:8",
        "-:4 E5:1 E5:1 G5:2 A5:2 A#5:2 B5:4", "D6:2 E6:2 G6:2 E6:2 D6:2 B5:2 A5:4",
        "C6:2 C#6:2 E6:4 G6:2 E6:2 C#6:4", "B5:2 A5:2 F#5:2 D#5:2 B4:4 -:4",
    ]
    s.pulse_track(lead, gain=0.22, vib=0.35, slide=True, echo=0.22, legato=0.85, inst="brass")
    s.drum_track([FUNK, FUNK, FUNK, FUNK2] * 4, gain=0.48)
    return s

@song("battle2")       # 'Chaos Theatre': fast, chromatic, the Oncoming Chores riff grown up
def _():
    s = Song(bpm=160, bars=16)
    A = ["E5:2 -:1 B4:1 E5:2 G5:2 F#5:1 E5:1 D5:2 B4:4", "C5:2 -:1 G4:1 C5:2 E5:2 D5:1 C5:1 B4:2 G4:4",
         "D5:2 -:1 A4:1 D5:2 F#5:2 E5:1 D5:1 C5:2 A4:2 B4:2", "B4:2 D5:2 F#5:2 A5:2 G5:2 F#5:2 D#5:2 B4:2"]
    A2 = A[:3] + ["B4:1 D5:1 F#5:1 B5:1 A5:2 G5:2 F#5:2 G5:2 A5:2 B5:2"]
    B = ["A5:3 G5:1 E5:2 C5:2 A4:4 C5:2 E5:2", "G5:3 F#5:1 E5:2 B4:2 G4:4 B4:2 E5:2",
         "C5:2 E5:2 G5:2 C6:2 B5:3 G5:1 E5:4", "D#5:2 F#5:2 B5:2 D#6:2 B5:2 F#5:2 D#5:2 B4:2"]
    END = A[:2] + ["A4:2 C5:2 E5:2 A5:2 G5:2 F#5:2 E5:2 D5:2", "D#5:1 E5:1 F#5:1 G5:1 A5:1 B5:1 C6:1 D#6:1 E6:4 -:2 B5:1 -:1"]
    s.pulse_track(A + A2 + B + END, inst="brass", gain=0.21, vib=0.3, slide=True, echo=0.28)
    c = ["Em", "C", "D", "Bm"] * 2 + ["Am", "Em", "C", "B7", "Em", "C", "Am", "B7"]
    chords_arp(s, c, gain=0.12, pan=-0.4, duty=0.5, pattern=(0, 1, 2, 3, 2, 1, 0, 1))
    s.bass_track([bass_line(x, 2, "drive") for x in c], gain=0.4, inst="synthbass")
    s.drum_track([ROCK] * 3 + [ROCK_FILL] + [ROCK] * 3 + [ROCK_FILL] + [ROCK] * 3 + [ROCK_FILL] + [ROCK] * 3 + ["K.h.S.h.K.SSS.H."], gain=0.48)
    return s

@song("battle3")       # 'Wobble Goblin': whole-tone hiccups, noise hits, a bass that limps
def _():
    s = Song(bpm=138, bars=16)
    c = ["Caug", "Caug", "Daug", "Daug", "Caug", "Caug", "F#aug", "F#aug", "Eaug", "Daug", "Caug", "A#aug", "Caug", "Caug", "Daug", "F#aug"]
    limp = {"Caug": "C2:3 C2:1 -:2 E2:2 C2:1 -:1 G#2:2 -:2 C3:1 C2:1", "Daug": "D2:3 D2:1 -:2 F#2:2 D2:1 -:1 A#2:2 -:2 D3:1 D2:1",
            "F#aug": "F#2:3 F#2:1 -:2 A#2:2 F#2:1 -:1 D3:2 -:2 F#3:1 F#2:1", "Eaug": "E2:3 E2:1 -:2 G#2:2 E2:1 -:1 C3:2 -:2 E3:1 E2:1", "A#aug": "A#1:3 A#1:1 -:2 D2:2 A#1:1 -:1 F#2:2 -:2 A#2:1 A#1:1"}
    s.bass_track([limp[x] for x in c], gain=0.42, pluck=0.3, slide=True, legato=0.85)
    lead = ["C5:2 D5:2 E5:2 F#5:2 G#5:3 F#5:1 E5:4", "-:4 A#5:2 G#5:2 F#5:1 E5:1 D5:2 C5:4",
            "D5:2 E5:2 F#5:2 G#5:2 A#5:3 G#5:1 F#5:4", "-:4 C6:2 A#5:2 G#5:1 F#5:1 E5:2 D5:4",
            "E5:1 -:1 E5:1 -:1 G#5:2 C6:2 A#5:4 G#5:4", "F#5:2 E5:2 D5:2 C5:2 D5:8",
            "F#5:2 A#5:2 D6:2 F#6:2 E6:3 D6:1 C6:4", "-:4 A#5:2 G#5:2 F#5:1 E5:1 D5:2 C5:4",
            "E6:2 D6:2 C6:2 A#5:2 G#5:4 F#5:4", "D6:2 C6:2 A#5:2 G#5:2 F#5:8",
            "C6:1 -:1 C6:1 -:1 E6:2 G#6:2 F#6:4 E6:4", "A#5:2 C6:2 D6:2 E6:2 F#6:8",
            "C5:2 D5:2 E5:2 F#5:2 G#5:3 F#5:1 E5:4", "-:4 A#5:2 G#5:2 F#5:1 E5:1 D5:2 C5:4",
            "D6:2 C6:2 A#5:2 G#5:2 F#5:2 E5:2 D5:2 C5:2", "F#5:2 A#5:2 D6:4 -:8"]
    s.pulse_track(lead, gain=0.2, vib=0.55, slide=True, echo=0.3, legato=0.8, inst="epiano")
    chords_arp(s, c, gain=0.09, pan=0.4, duty=0.25, pattern=(0, 2, 1, 2, 3, 2, 1, 2))
    s.drum_track([WEIRD, WEIRD, WEIRD, "K..hS.K.h.KhSSSS"] * 4, gain=0.46)
    return s

@song("dungeon")       # 'Temple of Chores': a low march under a cold melody
def _():
    s = Song(bpm=118, bars=16)
    c = ["Am", "Am", "F", "E7", "Am", "Am", "Dm", "E7", "F", "G", "Am", "E7", "F", "Dm", "E7", "Am"]
    lead = ["A5:2 -:2 C6:2 B5:2 A5:4 E5:4", "A5:2 -:2 C6:2 E6:2 D6:8", "F5:2 A5:2 C6:4 B5:2 A5:2 F5:4", "E5:4 G#5:4 B5:8",
            "A5:2 C6:2 E6:4 D6:2 C6:2 B5:4", "A5:2 -:2 A5:2 B5:2 C6:8", "D6:2 F6:2 A6:4 G6:2 F6:2 D6:4", "E6:4 G#5:4 E5:8",
            "F5:4 A5:4 C6:8", "G5:4 B5:4 D6:8", "E6:4 C6:4 A5:8", "G#5:4 B5:4 E5:8",
            "F5:2 A5:2 C6:4 F6:4 E6:4", "D6:2 F6:2 A6:4 F6:2 D6:2 A5:4", "G#5:4 B5:4 D6:4 F6:4", "E6:4 C6:4 A5:8"]
    s.pulse_track(lead, inst="brass", gain=0.19, vib=0.3, echo=0.35)
    chords_arp(s, c, gain=0.09, duty=0.25, pattern=(0, 0, 1, 2, 3, 2, 1, 0))
    s.bass_track([bass_line(x, 2, "drive") for x in c], gain=0.38, inst="synthbass")
    s.drum_track([ROCK] * 7 + [ROCK_FILL] + [ROCK] * 7 + [ROCK_FILL], gain=0.44)
    return s

@song("temple")        # 'Lantern Hall': echoing, puzzle-box mysterious
def _():
    s = Song(bpm=96, bars=16)
    c = ["Dm", "Gm", "Dm", "A7", "Dm", "Bb", "Gm", "A7", "F", "C", "Dm", "A7", "Bb", "Gm", "A7", "Dm"]
    lead = ["D5:4 F5:2 A5:2 G5:4 E5:4", "Bb4:4 D5:2 G5:2 F5:8", "D5:4 F5:2 A5:2 D6:4 C6:4", "A5:4 G5:2 E5:2 C#5:8",
            "D6:4 A5:4 F5:4 D5:4", "Bb5:4 D6:2 F6:2 D6:8", "G5:4 Bb5:4 D6:4 G6:4", "E6:4 C#6:4 A5:8",
            "F5:2 A5:2 C6:4 A5:2 F5:2 C5:4", "E5:2 G5:2 C6:4 G5:2 E5:2 C5:4", "D5:2 F5:2 A5:4 D6:8", "C#6:4 A5:4 E5:8",
            "Bb5:4 D6:4 F6:8", "G5:4 Bb5:4 D6:8", "A5:4 C#6:4 E6:4 G6:4", "F6:4 D6:4 A5:8"]
    s.pulse_track(lead, inst="bell", gain=0.17, vib=0.4, echo=0.5, legato=0.9)
    s.arp_track([(1, chord(x, 4)) for x in c], gain=0.12, pan=-0.35, pattern=(0, 2, 1, 3, 2, 1), inst="epiano", ring=2.0)
    s.bass_track([bass_line(x, 2, "half") for x in c], gain=0.34, inst="synthbass")
    s.drum_track(["K...h.S...h.K.h.", "K...h.S...h...hh"] * 8, gain=0.34)
    return s
