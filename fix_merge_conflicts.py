import os

with open("src/index.ts", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if line.startswith("<<<<<<<") or line.startswith("=======") or line.startswith(">>>>>>>"):
        continue
    new_lines.append(line)

with open("src/index.ts", "w") as f:
    f.writelines(new_lines)
