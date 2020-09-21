# !/usr/bin/python

import os

songs = []
for root, _, files in os.walk("music", topdown=False):
    for name in files:
        if name.endswith('.mp3'):
            songs.append({
                "name": name.split('.mp3')[0],
                "artist": "Example",
                "album": "",
                "url": os.path.join(root, name),
                "cover_art_url": ""
            })

print(songs)
