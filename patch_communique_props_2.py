import sys

with open("client/src/pages/CommuniquePage.tsx", "r") as f:
    content = f.read()

# remove currentUser={currentUser}
content = content.replace("currentUser={currentUser}", "")
# remove onUpdateUser={onUpdateUser}
content = content.replace("onUpdateUser={onUpdateUser}", "")

with open("client/src/pages/CommuniquePage.tsx", "w") as f:
    f.write(content)
print("Patched CommuniquePage.tsx remaining props")
