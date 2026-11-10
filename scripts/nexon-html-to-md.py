# Turns a saved Nexon MapleStory news page (the article, without the site chrome, scripts or pictures) into Markdown.
#   python3 scripts/nexon-html-to-md.py Grand_Launch_Cash_Shop.html reference/cash-shop/grand-launch-oct-21.md
# Standard library only. The saved pages themselves are third-party material: git-ignored, never committed (see AGENTS.md).
import re, sys, html
from html.parser import HTMLParser

def article(src):
    """The news article: date, title and body (div.news-detail), cut out by matching div depth."""
    i = src.find('class="news-detail"')
    if i < 0: return None
    start = src.rfind('<div', 0, i)
    depth, pos = 0, start
    for m in re.finditer(r'<(/?)div\b[^>]*>', src[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0: return src[start:start + m.end()]
    return src[start:]

ALT_TAIL = re.compile(r"\s*(?:-\s*)?(?:Founder'?s? Access Cash Shop|Grand Launch Cash Shop|Cash Shop|Mystery Fashion Crate)?\s*(?:Global\s+)?MapleStory\s+Classic\s+World.*$", re.I)

class MD(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True)
        s.out = []; s.list = []; s.buf = ''; s.href = None; s.skip = 0; s.title = None; s.date = None; s.cls = []
        s.inline = {'strong': '**', 'b': '**', 'em': '_', 'i': '_'}
    def flush(s, prefix=''):
        t = re.sub(r'[ \t\r\n\xa0]+', ' ', s.buf).strip()
        s.buf = ''
        if t: s.out.append(prefix + t)
    def handle_starttag(s, tag, a):
        a = dict(a)
        c = a.get('class', '')
        s.cls.append((tag, c))
        if tag in ('script', 'style', 'svg', 'iframe'): s.skip += 1; return
        if s.skip: return
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5'): s.flush(); s.cur = tag
        elif tag in ('p', 'div', 'br'):
            if tag == 'br': s.buf += ' '
            else: s.flush_item()
        elif tag in ('ul', 'ol'): s.flush_item(); s.list.append(0 if tag == 'ul' else 1)
        elif tag == 'li': s.flush_item(); s.cur = 'li'
        elif tag in s.inline: s.buf += s.inline[tag]
        elif tag == 'a': s.href = a.get('href'); s.buf += '['
        elif tag == 'img':
            alt = ALT_TAIL.sub('', html.unescape(a.get('alt', ''))).strip(' -')
            s.flush_item()  # pictures are left out: the item lists are in the text
    def flush_item(s):
        t = re.sub(r'[ \t\r\n\xa0]+', ' ', s.buf).strip(); s.buf = ''
        if not t: return
        if getattr(s, 'cur', None) in ('h1', 'h2', 'h3', 'h4', 'h5'):
            s.out.append('#' * int(s.cur[1]) + ' ' + t); s.cur = None
        elif getattr(s, 'cur', None) == 'li' and s.list:
            s.out.append('  ' * (len(s.list) - 1) + '- ' + t); 
        else: s.out.append(t)
    def handle_endtag(s, tag):
        if s.cls: s.cls.pop()
        if tag in ('script', 'style', 'svg', 'iframe'): s.skip = max(0, s.skip - 1); return
        if s.skip: return
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5'): s.flush_item_heading(tag)
        elif tag in ('p', 'div'): s.flush_item()
        elif tag == 'li': s.flush_item(); s.cur = None
        elif tag in ('ul', 'ol'): s.flush_item(); s.list and s.list.pop()
        elif tag in s.inline: s.buf += s.inline[tag]
        elif tag == 'a':
            s.buf += ']' + (f'({s.href})' if s.href and s.href.startswith('http') else ''); s.href = None
    def flush_item_heading(s, tag):
        t = re.sub(r'[ \t\r\n\xa0]+', ' ', s.buf).strip(); s.buf = ''
        if t: s.out.append('#' * int(tag[1]) + ' ' + t)
        s.cur = None
    def handle_data(s, d):
        if s.skip: return
        s.buf += d

def convert(path):
    src = open(path, encoding='utf8', errors='replace').read()
    art = article(src)
    if not art: return None
    # lazy images keep the picture's address in data-src; the alt text is what we keep
    p = MD(); p.feed(art); p.flush_item()
    lines = p.out
    # tidy: collapse emphasis markers around nothing, join, blank line between blocks (lists stay tight)
    md = []
    for ln in lines:
        ln = re.sub(r'\*\*\s*\*\*|_\s*_', '', ln)
        ln = re.sub(r'\*\*(\s+)', r'\1**', ln) if False else ln
        if not ln.strip(): continue
        prev = md[-1] if md else ''
        tight = ln.lstrip().startswith('- ') and prev.lstrip().startswith('- ')
        md.append(('' if tight or not md else '\n') + ln) if False else md.append(ln)
    md = [re.sub(r'\*\*\s+', ' **', ln) if not ln.startswith('#') else re.sub(r'[*_]+', '', ln).replace('#  ', '# ').strip() for ln in md]
    md = [re.sub(r'\s+\*\*(?=\s|$)', '**', ln) if False else ln for ln in md]
    md = [re.sub(r'\*\*([^*]*?)\s+\*\*', r'**\1** ', ln).rstrip() for ln in md]
    md = [re.sub(r'\*\*\s*\*\*', '', ln) for ln in md]
    # the lines before the first heading are the tags and the date: show them as a header block under the title
    k = next((i for i, ln in enumerate(md) if ln.startswith('# ')), 0)
    head, rest = md[:k], md[k:]
    date = next((h for h in head if re.search(r'\d{4}$', h)), ''); tags = ', '.join(h for h in head if h != date)
    if rest and rest[0].startswith('# '): md = [rest[0], f'Published {date}. Categories: {tags}.' if date else ''] + rest[1:]
    md = [x for x in md if x != '']
    out = []
    for i, ln in enumerate(md):
        if i and not (ln.lstrip().startswith('- ') and md[i - 1].lstrip().startswith('- ')): out.append('')
        out.append(ln)
    return '\n'.join(out) + '\n'

if __name__ == '__main__':
    r = convert(sys.argv[1])
    if not r: sys.exit('no article in ' + sys.argv[1])
    if len(sys.argv) > 2: open(sys.argv[2], 'w', encoding='utf8').write(r)
    else: print(r)
