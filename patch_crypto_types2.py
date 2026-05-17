import sys

with open("client/src/utils/crypto.ts", "r") as f:
    content = f.read()

content = content.replace("Uint8Array<ArrayBufferLike>", "Uint8Array")

# We had an issue with `anyBuf`
content = content.replace("anyBuf", "any")

with open("client/src/utils/crypto.ts", "w") as f:
    f.write(content)
