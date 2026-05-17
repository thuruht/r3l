import sys

with open("client/src/utils/crypto.ts", "r") as f:
    content = f.read()

# Remove the text encoder typecasting we did earlier which was buggy
# Instead just use normal arrays/buffers.
# Since we have so many type errors, let's just make the function signature take any and return any or BufferSource
import re

content = re.sub(r'export async function encryptData.*?\{',
                 r'export async function encryptData(data: any, secret: string, salt: string): Promise<any> {', content)
content = re.sub(r'export async function decryptData.*?\{',
                 r'export async function decryptData(encrypted: any, ivHex: string, secret: string): Promise<any> {', content)

with open("client/src/utils/crypto.ts", "w") as f:
    f.write(content)
