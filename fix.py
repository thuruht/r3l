with open("client/src/hooks/useNetworkData.ts", "r") as f:
    lines = f.readlines()

if "  return { nodes, links, collections, loading, refresh: fetchData };\n" in lines[-3:]:
    lines = lines[:-3]
elif "  return { nodes, links, collections, loading, refresh: fetchData };\n" in lines[-2:]:
    lines = lines[:-2]
else:
    # Just trim trailing
    while lines[-1].strip() == "};" or lines[-1].strip() == "return { nodes, links, collections, loading, refresh: fetchData };":
        lines.pop()
    if lines[-1].strip() == "return { nodes, links, collections, loading, refresh: fetchData };":
        lines.pop()

with open("client/src/hooks/useNetworkData.ts", "w") as f:
    f.writelines(lines)
