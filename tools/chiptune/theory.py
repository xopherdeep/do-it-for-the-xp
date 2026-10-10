"""Chord helpers so songs can be written as chord names + melodies."""
from chip import NOTE_NAMES

NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11], "dim": [0, 3, 6], "sus4": [0, 5, 7], "aug": [0, 4, 8], "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9], "9": [0, 4, 7, 10, 14], "add9": [0, 4, 7, 14]}

def parse_chord(sym):
    """'F#m7' -> (root pitch class, intervals)"""
    if len(sym) > 1 and sym[1] in "#b":
        root, qual = sym[:2], sym[2:]
    else:
        root, qual = sym[:1], sym[1:]
    return NOTE_NAMES[root], QUAL[qual]

def chord(sym, octave=4, voices=4):
    """Chord tones as note names spanning octaves: chord('Em', 4) -> ['E4','G4','B4','E5']"""
    pc, ivs = parse_chord(sym)
    out = []
    i = 0
    while len(out) < voices:
        iv = ivs[i % len(ivs)] + 12 * (i // len(ivs))
        p = pc + iv
        out.append(f"{NAMES[p % 12]}{octave + p // 12}")
        i += 1
    return out

def root_name(sym, octave):
    pc, _ = parse_chord(sym)
    return f"{NAMES[pc]}{octave}"

def fifth_name(sym, octave):
    pc, ivs = parse_chord(sym)
    p = pc + 7
    return f"{NAMES[p % 12]}{octave + p // 12}"

def bass_line(sym, octave=2, style="drive"):
    r, f, hi = root_name(sym, octave), fifth_name(sym, octave), root_name(sym, octave + 1)
    if style == "drive":   return f"{r}:2 {r}:2 {f}:2 {r}:2 {hi}:2 {r}:2 {f}:2 {r}:2"
    if style == "walk":    return f"{r}:4 {f}:4 {hi}:4 {f}:4"
    if style == "half":    return f"{r}:8 {f}:8"
    if style == "whole":   return f"{r}:16"
    if style == "bounce":  return f"{r}:4 {hi}:4 {r}:4 {hi}:4"
    if style == "swing":   return f"{r}:3 {r}:1 {f}:4 {hi}:3 {hi}:1 {f}:4"
    return f"{r}:16"

def prog(chords, bars_each=1):
    return [(bars_each, chord(c)) for c in chords]
