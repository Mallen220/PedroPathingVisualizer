// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
export const generateName = (baseName: string, existingNames: string[]) => {
  const match = baseName.match(/^(.*?) duplicate(?: (\d+))?$/);
  let rootName = baseName;
  let startNum = 1;

  if (match) {
    rootName = match[1];
    startNum = match[2] ? parseInt(match[2], 10) : 1;
    startNum++;
  }

  let candidate = "";
  let i = startNum;
  while (i < 1000) {
    if (i === 1) {
      candidate = rootName + " duplicate";
    } else {
      candidate = rootName + " duplicate " + i;
    }
    if (!existingNames.includes(candidate)) {
      return candidate;
    }
    i++;
  }
  return rootName + " duplicate " + Date.now();
};
