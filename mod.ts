import { encodeHex } from "https://deno.land/std@0.203.0/encoding/hex.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";

export const checkDuplicateFile = async (
  directoryPath: string,
  prevResult: ReadonlyMap<string, ReadonlySet<string>> = new Map()
): Promise<ReadonlyMap<string, ReadonlySet<string>>> => {
  let map = prevResult;
  for await (const entry of Deno.readDir(directoryPath)) {
    const url = join(directoryPath, entry.name);
    if (entry.isFile) {
      console.log(url.toString());
      const fileContent = await Deno.readFile(url);
      const hashValue = encodeHex(
        await crypto.subtle.digest("SHA-256", fileContent)
      );
      const oldSet = map.get(hashValue);
      if (oldSet === undefined) {
        map = new Map(map).set(hashValue, new Set([url.toString()]));
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
        .filter(([_, value]) => value.size > 1)
        .map(([key, value]) => ({ key, value: [...value] })),
      null,
      2
    )
  );
};

if (import.meta.main) {
  await checkDuplicateFile(".");
}
