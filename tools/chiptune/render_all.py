"""Render every song to src/assets/audio/chiptune as OGG (gapless in Chrome) and MP3 (everywhere)."""
import os, subprocess, sys
import songs, battle_songs
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "audio", "chiptune")
os.makedirs(OUT, exist_ok=True)
names = sys.argv[1:] or sorted(set(songs.SONGS) | set(battle_songs.SONGS))
seen = {}
for name in names:
    fn = battle_songs.SONGS.get(name) or songs.SONGS[name]
    if fn in seen:                      # aliases get their own copy, so every slot name resolves
        import shutil
        for ext in ("ogg", "mp3"):
            shutil.copyfile(os.path.join(OUT, f"{seen[fn]}.{ext}"), os.path.join(OUT, f"{name}.{ext}"))
        print(f"{name}: copy of {seen[fn]}"); continue
    seen[fn] = name
    s = fn()
    wav = os.path.join(OUT, f"{name}.wav")
    s.render(wav, loop=name not in ("win", "winboss"))
    for ext, args in (("ogg", ["-codec:a", "libvorbis", "-q:a", "4"]), ("mp3", ["-codec:a", "libmp3lame", "-b:a", "128k"])):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, *args, os.path.join(OUT, f"{name}.{ext}")], check=True)
    os.remove(wav)
print("done")
