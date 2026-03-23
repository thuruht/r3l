with open("client/src/components/CustomizationSettings.tsx", "r") as f:
    content = f.read()

content = content.replace("...\n\n      right: isMobile ? '10px' : 'auto',", "      right: isMobile ? '10px' : 'auto',")

with open("client/src/components/CustomizationSettings.tsx", "w") as f:
    f.write(content)
