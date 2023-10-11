import { encodeHex } from "https://deno.land/std@0.203.0/encoding/hex.ts";

export const checkDuplicateFile = async (
  directoryPath: URL,
  prevResult: ReadonlyMap<string, ReadonlySet<string>> = new Map()
): Promise<ReadonlyMap<string, ReadonlySet<string>>> => {
  let map = prevResult;
  for await (const entry of Deno.readDir(directoryPath)) {
    const url = new URL(entry.name, directoryPath);
    if (entry.isFile) {
      const fileContent = await fetch(url);
      const hashValue = encodeHex(
        await crypto.subtle.digest("SHA-256", await fileContent.arrayBuffer())
      );
      const oldSet = map.get(hashValue);
      if (oldSet === undefined) {
        map = new Map(map).set(hashValue, new Set(url.toString()));
      } else {
        map = new Map(map).set(hashValue, new Set([...oldSet, url.toString()]));
      }
    } else if (entry.isDirectory) {
      map = await checkDuplicateFile(url, map);
    }
  }
  await saveResultFile(map);
  return map;
};

const saveResultFile = async (
  result: ReadonlyMap<string, ReadonlySet<string>>
): Promise<void> => {
  await Deno.writeTextFile(
    "./result.json",
    JSON.stringify(
      [...result]
        .sort((a, b) => a.length - b.length)
        .map(([key, value]) => ({ key, value: [...value] })),
      null,
      2
    )
  );
};
