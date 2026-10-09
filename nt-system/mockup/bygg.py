"""Lager én selvstendig HTML-fil av mockupen: python3 bygg.py <utfil>"""
import base64, pathlib, sys
her = pathlib.Path(__file__).parent
html = (her / 'index.html').read_text()
b64 = lambda f: 'data:image/png;base64,' + base64.b64encode((her / f).read_bytes()).decode()
html = html.replace('<link rel="stylesheet" href="stil.css">', '<style>\n' + (her / 'stil.css').read_text() + '</style>')
for js in ('data.js', 'app.js'):
    html = html.replace(f'<script src="{js}"></script>', '<script>\n' + (her / js).read_text().replace('</script', '<\\/script') + '</script>')
for logo in ('logo-farge.png', 'logo-hvit.png'):
    html = html.replace(f'src="{logo}"', f'src="{b64(logo)}"')
pathlib.Path(sys.argv[1]).write_text(html)
print(sys.argv[1], len(html) // 1024, 'kB')
