import sys
p = r"c:\Users\wesle\Downloads\Jogo de guerra\javascript.js"
with open(p, 'r', encoding='utf-8') as f:
    s = f.read()

pairs = {'(':')','{':'}','[':']'}
stack = []

for idx, ch in enumerate(s):
    if ch in '({[':
        stack.append((ch, idx))
    elif ch in ')}]':
        if not stack:
            print('Unmatched closing', ch, 'at index', idx, 'line', s.count('\n',0,idx)+1)
            sys.exit(0)
        top, top_idx = stack.pop()
        if pairs.get(top) != ch:
            print('Mismatched pair:', top, 'at', top_idx, 'found', ch, 'at', idx, 'line', s.count('\n',0,idx)+1)
            sys.exit(0)

if stack:
    top, top_idx = stack[-1]
    print('Unclosed opening', top, 'at index', top_idx, 'line', s.count('\n',0,top_idx)+1)
else:
    print('Braces all matched')
