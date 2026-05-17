import sys

with open("client/src/utils/crypto.ts", "r") as f:
    content = f.read()

import re
# Just cast all subtle API calls to any because TS DOM types are too strict here.
content = content.replace("crypto.subtle.importKey(", "(crypto.subtle.importKey as any)(")
content = content.replace("crypto.subtle.deriveBits(", "(crypto.subtle.deriveBits as any)(")
content = content.replace("crypto.subtle.deriveKey(", "(crypto.subtle.deriveKey as any)(")
content = content.replace("crypto.subtle.encrypt(", "(crypto.subtle.encrypt as any)(")
content = content.replace("crypto.subtle.decrypt(", "(crypto.subtle.decrypt as any)(")
content = content.replace("crypto.subtle.exportKey(", "(crypto.subtle.exportKey as any)(")
content = content.replace("crypto.subtle.wrapKey(", "(crypto.subtle.wrapKey as any)(")
content = content.replace("crypto.subtle.unwrapKey(", "(crypto.subtle.unwrapKey as any)(")
content = content.replace("crypto.subtle.generateKey(", "(crypto.subtle.generateKey as any)(")

with open("client/src/utils/crypto.ts", "w") as f:
    f.write(content)
