import subprocess, glob, os

SRC = glob.glob('vid/*.webm')[0]
TRIM = 14.87
DUR = 56.6
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'
FONTB = '/usr/share/fonts/truetype/google-fonts/Poppins-SemiBold.ttf'
if not os.path.exists(FONTB):
    FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

# (start, end, line1, line2)
CAPS = [
 (0.3,  6.6, "Prediction markets show what capital SAYS.", "Onchain flow shows what it DOES."),
 (6.9,  9.4, "Nansen is the only API with both.", ""),
 (9.8, 20.3, "Eight channels. The top one is the Polymarket crowd.", "The rest are real cohorts of onchain capital."),
 (20.7,30.9, "When the crowd and the smart money point opposite ways,", "the band between them goes red."),
 (31.3,34.4, "Right now: the crowd is buying.", "The wallets with the best realised PnL are selling."),
 (34.9,37.4, "But is the crowd even worth fading?", ""),
 (37.9,48.4, "900 resolved markets, scored against their own settlement.", "The crowd is well calibrated. Brier 0.08."),
 (48.8,56.4, "So when they disagree, someone informed is wrong.", "Polygraph  ·  1,219 Nansen API calls, all live."),
]

def esc(s):
    return s.replace('\\','\\\\').replace(':','\\:').replace("'","\u2019").replace(',','\\,')

f = []
# bottom scrim for legibility
f.append("drawbox=x=0:y=ih-132:w=iw:h=132:color=black@0.62:t=fill")
# thin accent rule above the scrim
f.append("drawbox=x=0:y=ih-133:w=iw:h=2:color=0x22d3ee@0.85:t=fill")

for (a,b,l1,l2) in CAPS:
    en = f"between(t\\,{a}\\,{b})"
    if l2:
        f.append(f"drawtext=fontfile={FONTB}:text='{esc(l1)}':fontcolor=white:fontsize=27:x=(w-text_w)/2:y=h-104:enable='{en}'")
        f.append(f"drawtext=fontfile={FONT}:text='{esc(l2)}':fontcolor=0xb9c4d4:fontsize=24:x=(w-text_w)/2:y=h-62:enable='{en}'")
    else:
        f.append(f"drawtext=fontfile={FONTB}:text='{esc(l1)}':fontcolor=white:fontsize=27:x=(w-text_w)/2:y=h-82:enable='{en}'")

# corner watermark
f.append(f"drawtext=fontfile={FONT}:text='polygraph-ochre.vercel.app':fontcolor=white@0.55:fontsize=18:x=w-text_w-22:y=22")
# fade in/out
f.append(f"fade=t=in:st=0:d=0.5,fade=t=out:st={DUR-0.7:.2f}:d=0.7")

vf = ','.join(f)
cmd = ['ffmpeg','-y','-ss',str(TRIM),'-i',SRC,'-t',str(DUR),
       '-vf',vf,'-r','30','-c:v','libx264','-preset','slow','-crf','20',
       '-pix_fmt','yuv420p','-movflags','+faststart','-an',
       '/mnt/user-data/outputs/polygraph-demo.mp4']
print('running ffmpeg...')
r = subprocess.run(cmd, capture_output=True, text=True)
print(r.stderr[-1200:] if r.returncode else 'OK')
