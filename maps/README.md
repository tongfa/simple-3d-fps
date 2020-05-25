```
def toCoord(s):
   return [float(q[1]) for q in [p.split(':') for p in s.split(' ')]]
```