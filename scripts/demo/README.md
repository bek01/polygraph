# Demo recording

How the 56-second submission video was produced, kept here so it is reproducible
rather than a one-off screen capture.

```bash
npm run build && NODE_USE_ENV_PROXY=1 npx next start -p 3700   # serve the real app
node scripts/demo/record.mjs                                    # scripted screencast -> vid/*.webm
python3 scripts/demo/caption.py                                 # burn in captions -> polygraph-demo.mp4
```

`record.mjs` drives a real browser against the running app with eased scrolling
and timed clicks, so the footage is the live product with live Nansen data — not
a mockup and not a hand-held capture. It prints `TRIM_OFFSET`, the seconds spent
loading, which `caption.py` cuts from the head.

`caption.py` burns in timed captions rather than narrating. Most X video
autoplays muted, so a silent clip with captions is read by more people than a
voiced one. It also adds a silent AAC track: a video-only MP4 is a common cause
of upload failures on social platforms.

Caption timings in `CAPS` are matched by hand to the choreography in
`record.mjs`. Change one and you must change the other.
