// JVM option pattern components for validating server properties
// These patterns must match the validation pattern in package.json (metals.serverProperties)

export const xOptionPattern = "X[a-zA-Z0-9:]+"; // -Xmx2G, -Xms100m, -Xss4m
export const dOptionPattern = "D[a-zA-Z0-9._-]+(=[^\\s]*)?"; // -Dkey=value, -Dkey
export const xxOptionPattern = "XX:[+-]?[a-zA-Z0-9]+(=[a-zA-Z0-9.,]+)?"; // -XX:+UseZGC, -XX:MaxSize=512m
export const agentlibPattern = "agentlib:[a-zA-Z0-9]+(=[^\\s]*)?"; // -agentlib:jdwp=...
export const agentpathPattern = "agentpath:[^\\s]+(=[^\\s]*)?"; // -agentpath:/path/to/agent.so
export const simpleOptionPattern = "[a-zA-Z0-9]+"; // -ea, -da, -server

export const jvmOptionPatternString = `^-(${xOptionPattern}|${dOptionPattern}|${xxOptionPattern}|${agentlibPattern}|${agentpathPattern}|${simpleOptionPattern})$`;

export const jvmOptionPattern = new RegExp(jvmOptionPatternString);
