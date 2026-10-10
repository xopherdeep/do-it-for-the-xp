"""'Oncoming Chores' - the battle loop. E minor, 160 bpm, 16 bars, seamless."""
from chip import Song

def build():
    s = Song(bpm=160, bars=16)

    # Lead melody: four-bar phrases, written in 16ths ------------------------------------------
    A = [
        "E5:2 -:1 B4:1 E5:2 G5:2 F#5:1 E5:1 D5:2 B4:4",
        "C5:2 -:1 G4:1 C5:2 E5:2 D5:1 C5:1 B4:2 G4:4",
        "D5:2 -:1 A4:1 D5:2 F#5:2 E5:1 D5:1 C5:2 A4:2 B4:2",
        "B4:2 D5:2 F#5:2 A5:2 G5:2 F#5:2 D#5:2 B4:2",
    ]
    A2 = [
        "E5:2 -:1 B4:1 E5:2 G5:2 F#5:1 E5:1 D5:2 B4:4",
        "C5:2 -:1 G4:1 C5:2 E5:2 D5:1 C5:1 B4:2 G4:4",
        "D5:2 -:1 A4:1 D5:2 F#5:2 E5:1 D5:1 C5:2 A4:2 B4:2",
        "B4:1 D5:1 F#5:1 B5:1 A5:2 G5:2 F#5:2 G5:2 A5:2 B5:2",
    ]
    B = [
        "A5:3 G5:1 E5:2 C5:2 A4:4 C5:2 E5:2",
        "G5:3 F#5:1 E5:2 B4:2 G4:4 B4:2 E5:2",
        "C5:2 E5:2 G5:2 C6:2 B5:3 G5:1 E5:4",
        "D#5:2 F#5:2 B5:2 D#6:2 B5:2 F#5:2 D#5:2 B4:2",
    ]
    END = [
        "E5:2 -:1 B4:1 E5:2 G5:2 F#5:1 E5:1 D5:2 B4:4",
        "C5:2 -:1 G4:1 C5:2 E5:2 D5:1 C5:1 B4:2 G4:4",
        "A4:2 C5:2 E5:2 A5:2 G5:2 F#5:2 E5:2 D5:2",
        "D#5:1 E5:1 F#5:1 G5:1 A5:1 B5:1 C6:1 D#6:1 E6:4 -:2 B5:1 -:1",
    ]
    s.pulse_track(A + A2 + B + END, duty=0.25, gain=0.21, vib=0.3, slide=True, echo=0.28)

    # Harmony: 16th-note arpeggios over the chords, a bar each -------------------------------
    Em, C, D, Bm, B7, Am = ["E4", "G4", "B4", "E5"], ["C4", "E4", "G4", "C5"], ["D4", "F#4", "A4", "D5"], ["B3", "D4", "F#4", "B4"], ["B3", "D#4", "F#4", "A4"], ["A3", "C4", "E4", "A4"]
    chords = [(1, Em), (1, C), (1, D), (1, Bm)] * 2 + [(1, Am), (1, Em), (1, C), (1, B7)] + [(1, Em), (1, C), (1, Am), (1, B7)]
    s.arp_track(chords, gain=0.12, pan=-0.4, duty=0.5, pattern=(0, 1, 2, 3, 2, 1, 0, 1))

    # Bass: triangle, driving eighths with octave kicks ------------------------------------------
    def bass(root, fifth, low):
        return f"{root}:2 {root}:2 {fifth}:2 {root}:2 {low}:2 {root}:2 {fifth}:2 {root}:2"
    bass_lines = [
        bass("E2", "B2", "E3"), bass("C2", "G2", "C3"), bass("D2", "A2", "D3"), bass("B1", "F#2", "B2"),
        bass("E2", "B2", "E3"), bass("C2", "G2", "C3"), bass("D2", "A2", "D3"), "B1:2 B1:2 F#2:2 B1:2 B2:2 A2:2 G2:2 F#2:2",
        bass("A1", "E2", "A2"), bass("E2", "B2", "E3"), bass("C2", "G2", "C3"), bass("B1", "F#2", "B2"),
        bass("E2", "B2", "E3"), bass("C2", "G2", "C3"), bass("A1", "E2", "A2"), "B1:2 B1:2 B2:2 B1:2 B1:1 B1:1 B2:1 B1:1 B1:2 B1:2",
    ]
    s.bass_track(bass_lines, gain=0.4)

    # Drums --------------------------------------------------------------------------------------
    bar = "K.h.S.h.K.hKS.h."
    fill = "K.h.S.h.K.S.SSSS"
    drums = [bar] * 3 + [fill] + [bar] * 3 + [fill] + [bar] * 3 + [fill] + [bar] * 3 + ["K.h.S.h.K.SSS.H."]
    s.drum_track(drums, gain=0.48)
    return s
