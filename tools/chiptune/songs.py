"""The Do It For The XP soundtrack: one short loop per place, in the spirit of the SNES originals
each slot used to point at (never copies). Every song is 8-16 bars and loops cleanly."""
from chip import Song
from theory import chord, bass_line, prog

SONGS = {}
def song(name):
    def wrap(fn):
        SONGS[name] = fn
        return fn
    return wrap

def chords_arp(s, syms, gain=0.11, pan=-0.35, duty=0.5, pattern=(0, 1, 2, 3), octave=4, inst="harp"):
    s.arp_track([(1, chord(c, octave)) for c in syms], gain=gain * 1.6, pan=pan, duty=duty, pattern=pattern, inst=inst, ring=2.2)

def pad(s, syms, gain=0.08, duty=0.5, octave=4):
    """Held chord tones, two voices, as a soft pulse pad."""
    top = [f"{chord(c, octave)[2]}:16" for c in syms]
    low = [f"{chord(c, octave)[0]}:16" for c in syms]
    s.pulse_track(top, gain=gain * 2.2, legato=0.98, pan=0.3, inst="strings")
    s.pulse_track(low, gain=gain * 1.8, legato=0.98, pan=-0.3, inst="strings")

def bass(s, syms, style="drive", gain=0.38, octave=2):
    s.bass_track([bass_line(c, octave, style) for c in syms], gain=gain, inst="synthbass")

ROCK = "K.h.S.h.K.hKS.h."
ROCK_FILL = "K.h.S.h.K.S.SSSS"
POP = "K.h.S.h.K.h.S.h."
SOFT = "K...S...K...S..."
HAT8 = "h.h.h.h.h.h.h.h."
SWING = "K.hh.S.hK.hhS..h"
NONE = "................"

# --------------------------------------------------------------------------- title & menus

@song("startScreen")   # grand and bright: the title
def _(): 
    s = Song(bpm=118, bars=16)
    c = ["C", "G", "Am", "F"] * 2 + ["F", "G", "Em", "Am", "F", "G", "C", "C"]
    lead = [
        "E5:4 G5:4 C6:6 B5:2", "D6:4 B5:2 G5:2 A5:8", "C6:4 B5:2 A5:2 E5:8", "F5:2 G5:2 A5:4 G5:8",
        "E5:4 G5:4 C6:6 B5:2", "D6:4 B5:2 G5:2 A5:8", "C6:4 E6:4 D6:4 C6:4", "B5:8 -:8",
        "A5:4 C6:4 F6:4 E6:4", "D6:4 G5:4 B5:6 A5:2", "G5:4 B5:4 E6:6 D6:2", "C6:4 E6:4 A5:8",
        "F5:2 A5:2 C6:4 F6:4 E6:4", "D6:4 B5:4 G5:8", "E6:2 D6:2 C6:2 B5:2 C6:8", "-:16",
    ]
    s.pulse_track(lead, inst="flute", gain=0.2, vib=0.35, echo=0.3)
    chords_arp(s, c, pattern=(0, 1, 2, 3, 2, 1))
    bass(s, c, "half", gain=0.34)
    s.drum_track([SOFT] * 15 + ["K...S...K.S.SSSS"], gain=0.38)
    return s

@song("intro")         # a prophecy at midnight: slow, mysterious
def _():
    s = Song(bpm=84, bars=8)
    c = ["Dm", "Bb", "Gm", "A7", "Dm", "Bb", "Gm", "A7"]
    lead = ["D5:6 F5:2 E5:8", "D5:4 C5:4 A4:8", "Bb4:6 D5:2 C5:8", "A4:12 -:4",
            "D5:6 F5:2 A5:8", "G5:4 F5:4 E5:8", "D5:6 C5:2 Bb4:8", "A4:8 -:8"]
    s.pulse_track(lead, inst="bell", gain=0.17, vib=0.45, echo=0.4, legato=0.95)
    pad(s, c, gain=0.07, duty=0.25)
    bass(s, c, "whole", gain=0.3)
    return s
SONGS["demo"] = SONGS["intro"]
SONGS["oneFatefulNight"] = SONGS["intro"]

@song("chooseFile")    # cosy and small: picking a save
def _():
    s = Song(bpm=100, bars=8)
    c = ["F", "C", "Dm", "Bb", "F", "C", "Bb", "C"]
    lead = ["A4:4 C5:4 F5:6 E5:2", "G5:4 E5:4 C5:8", "D5:4 F5:4 A5:6 G5:2", "F5:12 -:4",
            "A4:4 C5:4 F5:6 E5:2", "G5:6 E5:2 D5:8", "F5:4 D5:4 Bb4:8", "C5:12 -:4"]
    s.pulse_track(lead, inst="brass", gain=0.17, vib=0.3, echo=0.25)
    chords_arp(s, c, gain=0.09, pattern=(0, 2, 1, 3))
    bass(s, c, "bounce", gain=0.3)
    s.drum_track([HAT8] * 8, gain=0.22)
    return s

@song("nowLetsGo")     # setting off: a brisk march
def _():
    s = Song(bpm=140, bars=8)
    c = ["G", "D", "Em", "C", "G", "D", "C", "D"]
    lead = ["G5:2 -:2 B5:2 D6:2 B5:4 A5:4", "F#5:2 -:2 A5:2 D6:2 A5:8", "E5:2 G5:2 B5:4 A5:2 G5:2 E5:4", "C5:2 E5:2 G5:4 A5:8",
            "G5:2 -:2 B5:2 D6:2 B5:4 A5:4", "F#5:2 A5:2 D6:4 E6:8", "G5:2 A5:2 B5:2 C6:2 D6:8", "C6:2 B5:2 A5:2 F#5:2 D5:8"]
    s.pulse_track(lead, inst="brass", gain=0.2, vib=0.25, echo=0.2)
    chords_arp(s, c, gain=0.1, pan=0.35)
    bass(s, c, "drive", gain=0.36)
    s.drum_track([POP] * 7 + [ROCK_FILL], gain=0.45)
    return s

@song("createProfile") # quirky: who are you?
def _():
    s = Song(bpm=112, bars=8)
    c = ["C", "E7", "Am", "F", "C", "G7", "F", "G7"]
    lead = ["C5:1 -:1 E5:1 -:1 G5:2 A5:2 G5:4 E5:4", "B4:1 -:1 D5:1 -:1 E5:2 G#5:2 B5:8", "A5:2 C6:2 A5:2 E5:2 C5:8", "F5:2 A5:2 C6:4 A5:8",
            "C5:1 -:1 E5:1 -:1 G5:2 A5:2 G5:4 E5:4", "D5:2 F5:2 B5:4 G5:8", "A5:2 F5:2 C5:2 A4:2 F5:8", "G5:2 F5:2 D5:2 B4:2 C5:8"]
    s.pulse_track(lead, inst="bell", gain=0.18, vib=0.2, legato=0.6)
    chords_arp(s, c, gain=0.09, pattern=(0, 3, 1, 2))
    bass(s, c, "walk", gain=0.32)
    s.drum_track(["K.h.S.h.K.h.S.hh"] * 8, gain=0.4)
    return s

# --------------------------------------------------------------------------- home & towns

@song("home")          # a lullaby for the house
def _():
    s = Song(bpm=78, bars=8)
    c = ["D", "A", "Bm", "G", "D", "A", "G", "A"]
    lead = ["F#5:6 A5:2 D6:8", "C#6:6 A5:2 F#5:8", "D6:4 B5:4 F#5:8", "G5:4 A5:4 B5:8",
            "F#5:6 A5:2 D6:8", "E6:4 C#6:4 A5:8", "B5:4 G5:4 D5:8", "E5:4 F#5:4 A5:8"]
    s.pulse_track(lead, inst="flute", gain=0.16, vib=0.35, echo=0.35, legato=0.97)
    pad(s, c, gain=0.06)
    s.arp_track(prog(c), gain=0.12, pan=-0.3, pattern=(0, 1, 2, 3, 2, 1, 0, 2), inst="harp", ring=2.5)
    bass(s, c, "whole", gain=0.28)
    return s

@song("hometown")      # sunny, bouncy: the town square
def _():
    s = Song(bpm=132, bars=16)
    c = ["C", "F", "G", "C", "C", "F", "G", "C", "Am", "Em", "F", "G", "C", "F", "G", "C"]
    lead = ["E5:2 G5:2 C6:4 B5:2 G5:2 E5:4", "F5:2 A5:2 C6:4 A5:8", "D5:2 G5:2 B5:4 D6:2 B5:2 G5:4", "C6:2 B5:2 C6:4 -:8",
            "E5:2 G5:2 C6:4 B5:2 G5:2 E5:4", "F5:2 A5:2 C6:4 D6:8", "G5:2 B5:2 D6:4 F6:2 D6:2 B5:4", "C6:12 -:4",
            "A5:4 C6:2 E6:2 D6:4 C6:4", "B5:4 G5:2 E5:2 G5:8", "A5:2 C6:2 F6:4 E6:2 C6:2 A5:4", "G5:2 B5:2 D6:4 G6:8",
            "E6:2 D6:2 C6:4 G5:2 E5:2 C5:4", "F5:2 A5:2 C6:4 A5:2 F5:2 C5:4", "D5:2 G5:2 B5:4 D6:4 B5:4", "C6:8 -:8"]
    s.pulse_track(lead, inst="brass", gain=0.2, vib=0.3, echo=0.22, slide=True)
    chords_arp(s, c, gain=0.1, pattern=(0, 2, 1, 2, 3, 2, 1, 2))
    bass(s, c, "bounce", gain=0.34)
    s.drum_track([POP] * 7 + [ROCK_FILL] + [POP] * 7 + [ROCK_FILL], gain=0.42)
    return s
SONGS["plains"] = SONGS["hometown"]

@song("world")         # the map: wide and adventurous
def _():
    s = Song(bpm=124, bars=16)
    c = ["Am", "F", "C", "G", "Am", "F", "C", "E7", "F", "G", "Am", "Em", "F", "G", "Am", "Am"]
    lead = ["A5:6 C6:2 E6:8", "F6:4 E6:2 C6:2 A5:8", "G5:6 A5:2 C6:8", "B5:4 G5:4 E5:8",
            "A5:6 C6:2 E6:8", "F6:4 E6:2 C6:2 A5:8", "G5:4 E5:4 C6:8", "B5:12 -:4",
            "C6:4 A5:4 F5:8", "D6:4 B5:4 G5:8", "E6:4 C6:4 A5:8", "B5:4 G5:4 E5:8",
            "F5:2 A5:2 C6:4 F6:8", "E6:2 D6:2 B5:4 G5:8", "A5:2 C6:2 E6:4 A6:8", "-:16"]
    s.pulse_track(lead, inst="flute", gain=0.19, vib=0.35, echo=0.3)
    chords_arp(s, c, gain=0.1, duty=0.25)
    bass(s, c, "drive", gain=0.36)
    s.drum_track([POP] * 15 + [ROCK_FILL], gain=0.4)
    return s

# --------------------------------------------------------------------------- terrains

@song("snow")          # sparkling, a music-box waltz feel in 4/4
def _():
    s = Song(bpm=108, bars=8)
    c = ["A", "E", "F#m", "D", "A", "E", "D", "E"]
    lead = ["C#6:4 E6:2 A6:2 G#6:4 E6:4", "B5:4 E6:2 G#6:2 B6:8", "F#6:4 C#6:2 A5:2 F#5:8", "D6:4 F#6:4 A6:8",
            "C#6:4 E6:2 A6:2 G#6:4 E6:4", "B5:4 G#5:4 E6:8", "F#6:2 E6:2 D6:4 A5:8", "B5:4 C#6:4 E6:8"]
    s.pulse_track(lead, inst="bell", gain=0.16, vib=0.2, echo=0.45, legato=0.5)
    s.arp_track(prog(c), gain=0.13, pan=-0.4, pattern=(3, 2, 1, 0, 1, 2), inst="bell", ring=2.0)
    bass(s, c, "walk", gain=0.28, octave=2)
    s.drum_track(["....h.......h..."] * 8, gain=0.2)
    return s

@song("desert")        # heat shimmer: E phrygian
def _():
    s = Song(bpm=98, bars=8)
    c = ["Em", "F", "Em", "F", "Em", "D", "F", "Em"]
    lead = ["E5:4 F5:2 E5:2 D5:4 B4:4", "F5:4 E5:2 D5:2 E5:8", "G5:2 F5:2 E5:2 D5:2 E5:8", "F5:6 G5:2 F5:4 E5:4",
            "B5:4 C6:2 B5:2 A5:4 G5:4", "F#5:4 G5:2 F#5:2 E5:8", "F5:2 G5:2 A5:2 G5:2 F5:4 E5:4", "E5:12 -:4"]
    s.pulse_track(lead, inst="brass", gain=0.18, vib=0.5, echo=0.3)
    pad(s, c, gain=0.06, duty=0.25)
    bass(s, c, "half", gain=0.32)
    s.drum_track(["K..hK..hS..hK.S."] * 8, gain=0.36)
    return s
SONGS["sands"] = SONGS["desert"]

@song("swamp")         # something is creeping
def _():
    s = Song(bpm=92, bars=8)
    c = ["Gm", "Eb", "Gm", "D7", "Gm", "Cm", "D7", "Gm"]
    lead = ["G5:3 F#5:1 G5:4 Bb5:4 A5:4", "Eb5:4 D5:2 C#5:2 D5:8", "G5:3 F#5:1 G5:4 D6:4 C6:4", "A5:4 F#5:4 D5:8",
            "Bb5:2 A5:2 Ab5:2 G5:2 F5:4 Eb5:4", "C5:4 Eb5:4 G5:8", "F#5:2 G5:2 A5:2 Bb5:2 A5:4 F#5:4", "G5:12 -:4"]
    s.pulse_track(lead, inst="bell", gain=0.17, vib=0.4, echo=0.35)
    s.arp_track(prog(c, 1), gain=0.12, pan=-0.3, pattern=(0, 2, 1, 3, 1, 2), inst="epiano", ring=1.8)
    bass(s, c, "half", gain=0.34)
    s.drum_track(["K...S..hK..hS..."] * 8, gain=0.38)
    return s

@song("mountains")     # a peaceful valley
def _():
    s = Song(bpm=104, bars=8)
    c = ["G", "C", "Em", "D", "G", "C", "D", "G"]
    lead = ["B5:4 D6:4 G6:6 F#6:2", "E6:4 C6:4 G5:8", "G5:4 B5:4 E6:6 D6:2", "A5:12 -:4",
            "B5:4 D6:4 G6:6 F#6:2", "E6:6 D6:2 C6:8", "A5:4 B5:4 D6:4 F#6:4", "G6:8 -:8"]
    s.pulse_track(lead, inst="flute", gain=0.17, vib=0.3, echo=0.35)
    chords_arp(s, c, gain=0.1, duty=0.25, pattern=(0, 1, 2, 3, 2, 1))
    bass(s, c, "bounce", gain=0.3)
    s.drum_track([SOFT] * 8, gain=0.3)
    return s

@song("forest")        # lydian, dappled light
def _():
    s = Song(bpm=110, bars=8)
    c = ["F", "G", "F", "G", "Am", "G", "F", "G"]
    lead = ["A5:4 B5:2 C6:2 E6:4 D6:4", "B5:4 D6:4 G5:8", "A5:4 C6:2 B5:2 A5:4 F5:4", "G5:12 -:4",
            "E6:4 C6:4 A5:8", "D6:4 B5:4 G5:8", "C6:4 A5:2 B5:2 C6:4 F5:4", "G5:4 B5:4 D6:8"]
    s.pulse_track(lead, inst="brass", gain=0.17, vib=0.3, echo=0.4)
    chords_arp(s, c, gain=0.09, duty=0.125, pattern=(0, 2, 3, 2))
    bass(s, c, "walk", gain=0.3)
    s.drum_track(["..h...h...h...h."] * 8, gain=0.22)
    return s

@song("islands")       # beach breeze with a bossa lilt
def _():
    s = Song(bpm=116, bars=8)
    c = ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7"]
    lead = ["E5:3 G5:3 B5:2 A5:4 G5:4", "E5:3 C5:3 A4:2 C5:8", "F5:3 A5:3 C6:2 D6:4 C6:4", "B5:3 G5:3 F5:2 D5:8",
            "E5:3 G5:3 B5:2 C6:4 B5:4", "A5:3 G5:3 E5:2 C5:8", "D5:3 F5:3 A5:2 C6:4 A5:4", "G5:12 -:4"]
    s.pulse_track(lead, inst="flute", gain=0.17, vib=0.25, echo=0.25)
    chords_arp(s, c, gain=0.09, pattern=(0, 2, 3, 1))
    bass(s, c, "swing", gain=0.32)
    s.drum_track(["K..hK.S.h.KhS.h."] * 8, gain=0.34)
    return s

@song("urban")         # the city: swing and sevenths
def _():
    s = Song(bpm=126, bars=8)
    c = ["C7", "F7", "C7", "C7", "F7", "F7", "G7", "F7"]
    lead = ["E5:3 G5:1 Bb5:4 A5:3 G5:1 E5:4", "F5:3 A5:1 C6:4 Eb6:3 C6:1 A5:4", "G5:3 E5:1 C5:4 E5:3 G5:1 Bb5:4", "A5:8 -:8",
            "F5:3 A5:1 C6:4 Eb6:3 C6:1 A5:4", "F6:3 Eb6:1 C6:4 A5:8", "D6:3 B5:1 G5:4 F5:3 D5:1 B4:4", "C5:12 -:4"]
    s.pulse_track(lead, inst="brass", gain=0.19, vib=0.3, slide=True)
    chords_arp(s, c, gain=0.09, duty=0.5, pattern=(0, 3, 2, 1))
    bass(s, c, "swing", gain=0.36)
    s.drum_track([SWING] * 8, gain=0.4)
    return s

@song("moon")          # whole-tone wobble: nothing is quite right
def _():
    s = Song(bpm=128, bars=8)
    c = ["Caug", "Daug", "Caug", "Daug", "Eaug", "Daug", "Caug", "Caug"]
    lead = ["C5:2 D5:2 E5:2 F#5:2 G#5:4 A#5:4", "G#5:2 F#5:2 E5:2 D5:2 C5:8", "E5:2 F#5:2 G#5:2 A#5:2 C6:4 D6:4", "A#5:4 G#5:4 F#5:8",
            "E6:2 D6:2 C6:2 A#5:2 G#5:4 F#5:4", "E5:2 F#5:2 G#5:2 A#5:2 C6:8", "D6:4 C6:4 A#5:4 G#5:4", "C6:8 -:8"]
    s.pulse_track(lead, inst="bell", gain=0.17, vib=0.6, echo=0.5, legato=0.7)
    chords_arp(s, c, gain=0.09, duty=0.5, pattern=(0, 1, 2, 1))
    bass(s, c, "bounce", gain=0.3)
    s.drum_track(["K.h.S.h.K.h.S.H."] * 8, gain=0.36)
    return s

@song("clouds")        # floating, pentatonic
def _():
    s = Song(bpm=88, bars=8)
    c = ["D", "A", "G", "D", "Bm", "G", "A", "D"]
    lead = ["F#5:4 A5:4 D6:8", "E6:4 A5:4 F#5:8", "G5:4 B5:4 D6:4 E6:4", "F#6:12 -:4",
            "D6:4 B5:4 F#5:8", "G5:4 B5:4 D6:8", "E6:4 C#6:4 A5:8", "D6:8 -:8"]
    s.pulse_track(lead, inst="flute", gain=0.16, vib=0.3, echo=0.5, legato=0.98)
    pad(s, c, gain=0.07)
    s.arp_track(prog(c), gain=0.1, pan=-0.3, pattern=(3, 2, 1, 0), inst="bell", ring=2.5)
    bass(s, c, "whole", gain=0.26)
    return s

@song("cave")          # dripping dark
def _():
    s = Song(bpm=86, bars=8)
    c = ["Cm", "Ab", "Cm", "G7", "Cm", "Fm", "G7", "Cm"]
    lead = ["C5:8 Eb5:4 D5:4", "C5:8 Ab4:8", "G5:4 F5:2 Eb5:2 D5:8", "B4:12 -:4",
            "C5:4 Eb5:4 G5:8", "F5:4 Ab5:4 C6:8", "B5:4 G5:4 D5:8", "C5:16"]
    s.pulse_track(lead, inst="bell", gain=0.15, vib=0.4, echo=0.55, legato=0.9)
    bass(s, c, "whole", gain=0.32, octave=1)
    s.drum_track(["......h.........", "............h...", "...h............", "........h......h"] * 2, gain=0.22)
    return s

@song("dungeon")       # tense, marching
def _():
    s = Song(bpm=122, bars=8)
    c = ["Am", "Am", "F", "E7", "Am", "G", "F", "E7"]
    lead = ["A5:2 -:2 C6:2 B5:2 A5:4 E5:4", "A5:2 -:2 C6:2 E6:2 D6:8", "F5:2 A5:2 C6:4 B5:2 A5:2 F5:4", "E5:4 G#5:4 B5:8",
            "A5:2 C6:2 E6:4 D6:2 C6:2 B5:4", "G5:2 B5:2 D6:4 C6:8", "F5:2 A5:2 C6:4 A5:2 F5:2 C5:4", "E5:4 G#5:4 E5:8"]
    s.pulse_track(lead, inst="brass", gain=0.19, vib=0.25)
    chords_arp(s, c, gain=0.09, duty=0.25, pattern=(0, 0, 1, 2, 3, 2, 1, 0))
    bass(s, c, "drive", gain=0.38)
    s.drum_track([ROCK] * 7 + [ROCK_FILL], gain=0.44)
    return s

# --------------------------------------------------------------------------- places in town

@song("hotel")         # enjoy your stay
def _():
    s = Song(bpm=90, bars=8)
    c = ["Fmaj7", "Em7", "Dm7", "Cmaj7", "Fmaj7", "Em7", "Dm7", "G7"]
    lead = ["A5:4 C6:4 E6:6 D6:2", "B5:4 G5:4 E5:8", "A5:4 F5:4 D5:8", "E5:4 G5:4 B5:8",
            "A5:4 C6:4 E6:6 F6:2", "G6:4 E6:4 B5:8", "A5:4 C6:4 F6:8", "D6:4 B5:4 G5:8"]
    s.pulse_track(lead, inst="flute", gain=0.16, vib=0.3, echo=0.3, legato=0.96)
    chords_arp(s, c, gain=0.08, duty=0.25, pattern=(0, 1, 2, 3, 2, 1))
    bass(s, c, "half", gain=0.3)
    s.drum_track(["....h.......h..."] * 8, gain=0.2)
    return s

@song("hospital")      # calm, a little worried
def _():
    s = Song(bpm=80, bars=8)
    c = ["Em", "Cmaj7", "G", "D", "Em", "Cmaj7", "D", "Em"]
    lead = ["B5:6 G5:2 E5:8", "G5:6 E5:2 C5:8", "D5:4 G5:4 B5:8", "A5:12 -:4",
            "B5:6 G5:2 E5:8", "C6:4 B5:4 G5:8", "A5:4 F#5:4 D5:8", "E5:16"]
    s.pulse_track(lead, inst="flute", gain=0.15, vib=0.35, echo=0.45, legato=0.97)
    pad(s, c, gain=0.06)
    bass(s, c, "whole", gain=0.26)
    return s

@song("shop")          # buy somethin'
def _():
    s = Song(bpm=134, bars=8)
    c = ["C", "C", "F", "G", "C", "Am", "F", "G"]
    lead = ["G5:2 E5:2 C5:2 E5:2 G5:4 C6:4", "B5:2 G5:2 D5:2 G5:2 B5:8", "A5:2 F5:2 C5:2 F5:2 A5:4 C6:4", "B5:2 G5:2 D5:2 G5:2 B5:8",
            "G5:2 E5:2 C5:2 E5:2 G5:4 E6:4", "C6:2 A5:2 E5:2 A5:2 C6:8", "A5:2 C6:2 F6:4 E6:2 C6:2 A5:4", "G5:4 B5:4 D6:8"]
    s.pulse_track(lead, inst="brass", gain=0.19, vib=0.2, legato=0.7)
    chords_arp(s, c, gain=0.09, pattern=(0, 2, 1, 2))
    bass(s, c, "bounce", gain=0.34)
    s.drum_track([POP] * 8, gain=0.4)
    return s

@song("bazaar")        # bustling and exotic
def _():
    s = Song(bpm=126, bars=8)
    c = ["Dm", "Eb", "Dm", "Eb", "Dm", "C", "Bb", "A7"]
    lead = ["D5:2 Eb5:2 F5:2 G5:2 A5:4 Bb5:4", "A5:2 G5:2 F5:2 Eb5:2 D5:8", "F5:2 G5:2 A5:2 Bb5:2 C6:4 D6:4", "Bb5:4 A5:4 G5:8",
            "D6:2 C6:2 Bb5:2 A5:2 G5:4 F5:4", "E5:2 F5:2 G5:2 A5:2 Bb5:8", "A5:2 G5:2 F5:2 D5:2 F5:8", "C#5:4 E5:4 A5:8"]
    s.pulse_track(lead, inst="bell", gain=0.19, vib=0.45, legato=0.75)
    chords_arp(s, c, gain=0.09, duty=0.25, pattern=(0, 1, 2, 1, 3, 2, 1, 2))
    bass(s, c, "drive", gain=0.36)
    s.drum_track(["K.hKS.hKK.hKS.hh"] * 8, gain=0.42)
    return s

@song("sanctuary")     # serene and pure
def _():
    s = Song(bpm=70, bars=8)
    c = ["C", "G", "Am", "F", "C", "G", "F", "C"]
    lead = ["E5:8 G5:8", "D5:8 G5:8", "C6:8 B5:8", "A5:16", "E5:8 G5:8", "B5:8 D6:8", "C6:8 A5:8", "G5:16"]
    s.pulse_track(lead, inst="flute", gain=0.15, vib=0.3, echo=0.5, legato=0.98)
    pad(s, c, gain=0.07)
    s.arp_track(prog(c, 1), gain=0.1, pan=-0.3, pattern=(0, 1, 2, 3, 2, 1, 0, 1), inst="harp", ring=3.0)
    bass(s, c, "whole", gain=0.26)
    return s
SONGS["soundstone"] = SONGS["sanctuary"]

@song("credits")       # the heroes return
def _():
    s = Song(bpm=100, bars=16)
    c = ["F", "C", "Dm", "Bb", "F", "C", "Bb", "C", "Dm", "Am", "Bb", "F", "Gm", "Bb", "C", "F"]
    lead = ["A5:4 C6:4 F6:6 E6:2", "G6:4 E6:4 C6:8", "D6:4 F6:4 A6:6 G6:2", "F6:12 -:4",
            "A5:4 C6:4 F6:6 G6:2", "E6:4 C6:4 G5:8", "F5:4 Bb5:4 D6:8", "E6:4 C6:4 G5:8",
            "D6:4 F6:4 A6:8", "C6:4 E6:4 A5:8", "Bb5:4 D6:4 F6:8", "A5:4 C6:4 F5:8",
            "G5:4 Bb5:4 D6:8", "F6:4 D6:4 Bb5:8", "G5:4 C6:4 E6:8", "F6:16"]
    s.pulse_track(lead, inst="flute", gain=0.18, vib=0.35, echo=0.35, legato=0.96)
    chords_arp(s, c, gain=0.09, duty=0.25, pattern=(0, 1, 2, 3, 2, 1))
    bass(s, c, "half", gain=0.32)
    s.drum_track([SOFT] * 16, gain=0.3)
    return s

# --------------------------------------------------------------------------- fights

@song("boss")          # the big one: fast and chromatic
def _():
    s = Song(bpm=172, bars=16)
    c = ["Dm", "Dm", "Bb", "A7", "Dm", "Dm", "Gm", "A7", "Bb", "C", "Dm", "A7", "Bb", "C", "Dm", "Dm"]
    riff = "D5:1 D5:1 F5:1 D5:1 G#5:2 G5:2 F5:1 D5:1 F5:2 C5:2 D5:2"
    lead = [riff, "D5:1 D5:1 F5:1 D5:1 A5:2 G#5:2 G5:1 F5:1 D5:2 F5:4", "Bb5:2 A5:2 Bb5:2 D6:2 C6:4 A5:4", "C#6:2 E6:2 A5:4 G5:2 F5:2 E5:4",
            riff, "D6:2 C6:2 Bb5:2 A5:2 G#5:4 A5:4", "G5:2 Bb5:2 D6:4 C6:2 Bb5:2 G5:4", "A5:2 C#6:2 E6:4 A6:8",
            "Bb5:2 D6:2 F6:4 E6:2 D6:2 C6:4", "C6:2 E6:2 G6:4 F6:2 E6:2 D6:4", "D6:2 F6:2 A6:4 G#6:2 G6:2 F6:4", "E6:2 C#6:2 A5:2 E5:2 C#5:8",
            "Bb5:2 A5:2 Bb5:2 D6:2 F6:4 D6:4", "C6:2 Bb5:2 C6:2 E6:2 G6:4 E6:4", "D6:1 D6:1 F6:1 D6:1 G#6:2 G6:2 F6:1 D6:1 F6:2 C6:2 D6:2", "D6:4 -:4 A5:2 G#5:2 G5:2 F5:2"]
    s.pulse_track(lead, inst="brass", gain=0.21, vib=0.3, slide=True, echo=0.2, legato=0.85)
    chords_arp(s, c, gain=0.11, duty=0.5, pattern=(0, 1, 2, 3, 2, 1, 0, 2))
    bass(s, c, "drive", gain=0.42)
    s.drum_track([ROCK] * 3 + [ROCK_FILL] + [ROCK] * 3 + [ROCK_FILL] + ["K.hKS.hKK.hKS.hK"] * 4 + [ROCK] * 3 + ["K.S.K.S.KKSSKKSS"], gain=0.5)
    return s

@song("gameover")      # blacked out
def _():
    s = Song(bpm=66, bars=8)
    c = ["Am", "F", "Dm", "E7", "Am", "F", "E7", "Am"]
    lead = ["E5:8 C5:4 B4:4", "A4:12 -:4", "D5:6 F5:2 E5:8", "B4:12 -:4", "C5:6 E5:2 A5:8", "F5:4 E5:4 C5:8", "B4:6 G#4:2 E4:8", "A4:16"]
    s.pulse_track(lead, inst="bell", gain=0.16, vib=0.4, echo=0.5, legato=0.97)
    pad(s, c, gain=0.06, duty=0.25)
    bass(s, c, "whole", gain=0.3)
    return s

@song("win")           # the fanfare: four bars, not looped
def _():
    s = Song(bpm=150, bars=4)
    s.pulse_track(["C5:1 E5:1 G5:1 C6:3 -:1 G5:1 C6:8", "D6:2 C6:2 B5:2 C6:2 D6:8", "E6:2 D6:2 C6:2 D6:2 E6:4 G6:4", "C6:12 -:4"], inst="brass", gain=0.24)
    s.pulse_track(["E4:1 G4:1 C5:1 E5:3 -:1 E5:1 G5:8", "G5:2 E5:2 D5:2 E5:2 G5:8", "C6:2 B5:2 A5:2 B5:2 C6:4 E6:4", "E6:12 -:4"], inst="bell", gain=0.14, pan=-0.4)
    s.bass_track(["C2:4 C2:4 G2:4 C3:4", "G2:4 G2:4 D3:4 G2:4", "C2:4 E2:4 G2:4 C3:4", "C2:12 -:4"], gain=0.36)
    s.drum_track(["K...K...K...K...", "S.S.S...K...S...", "K.h.S.h.K.h.S.h.", "K...S...KSSS...."], gain=0.4)
    return s

@song("winboss")       # a longer fanfare
def _():
    s = Song(bpm=150, bars=8)
    lead = ["C5:1 E5:1 G5:1 C6:3 -:1 G5:1 C6:8", "D6:2 C6:2 B5:2 C6:2 D6:8", "E6:2 D6:2 C6:2 D6:2 E6:4 G6:4", "A6:4 G6:4 E6:8",
            "F6:2 E6:2 D6:2 C6:2 D6:4 F6:4", "E6:2 D6:2 C6:2 B5:2 C6:8", "G5:2 C6:2 E6:2 G6:2 C7:4 B6:4", "C7:12 -:4"]
    s.pulse_track(lead, inst="brass", gain=0.22, vib=0.3, echo=0.25)
    chords_arp(s, ["C", "G", "C", "Am", "F", "C", "G", "C"], gain=0.1)
    bass(s, ["C", "G", "C", "Am", "F", "C", "G", "C"], "drive", gain=0.36)
    s.drum_track([ROCK] * 7 + ["K...S...KSSS...."], gain=0.42)
    return s
