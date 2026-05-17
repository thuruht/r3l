import sys

with open("client/src/utils/crypto.ts", "r") as f:
    content = f.read()

import re
content = content.replace("window.(crypto.subtle", "(window.crypto.subtle")
with open("client/src/utils/crypto.ts", "w") as f:
    f.write(content)
