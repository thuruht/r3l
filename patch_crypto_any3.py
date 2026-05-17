import sys

with open("client/src/utils/crypto.ts", "r") as f:
    content = f.read()

import re
content = content.replace("iv: iv as any", "iv")
with open("client/src/utils/crypto.ts", "w") as f:
    f.write(content)
