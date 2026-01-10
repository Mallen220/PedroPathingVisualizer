// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function bumpVersion() {
  const packagePath = path.join(__dirname, "../package.json");
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf8"));

  console.log(`Current version: ${packageJson.version}`);

  const newVersion = await ask("Enter new version (e.g., 1.2.0): ");

  if (!newVersion.match(/^\d+\.\d+\.\d+$/)) {
    console.error("❌ Version must be in format X.Y.Z");
    rl.close();
    return;
  }

  // Update package.json
  packageJson.version = newVersion;
  await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));

  console.log(`✅ Updated version to ${newVersion}`);

  // Handle newest.md
  const newestPath = path.join(
    __dirname,
    "../src/lib/components/whats-new/features/newest.md",
  );
  try {
    const stats = await fs.stat(newestPath);
    if (stats.isFile()) {
      const newFeaturePath = path.join(
        __dirname,
        `../src/lib/components/whats-new/features/v${newVersion}.md`,
      );
      await fs.rename(newestPath, newFeaturePath);
      console.log(`✅ Renamed newest.md to v${newVersion}.md`);
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("❌ Error handling newest.md:", err);
    }
  }

  // Ensure newest.md exists (recreate it if it was renamed or didn't exist)
  try {
    const template = `### What's New!

**Features:**
-

**Bug Fixes:**
-
`;

    // Check if it exists now.
    try {
      await fs.access(newestPath);
      // It exists. If we renamed it, it shouldn't exist unless race condition.
      // If we didn't rename it (e.g. it didn't exist), we need to create it.
    } catch {
      // It doesn't exist, create it.
      await fs.writeFile(newestPath, template);
      console.log(`✅ Created new newest.md`);
    }
  } catch (err) {
    console.error("❌ Error creating newest.md:", err);
  }

  // Create a simple changelog entry
  const changelog = await ask("Enter changelog summary (optional): ");

  if (changelog) {
    const changelogPath = path.join(__dirname, "../CHANGELOG.md");
    let changelogContent = "";

    try {
      changelogContent = await fs.readFile(changelogPath, "utf8");
    } catch {
      // File doesn't exist
    }

    const today = new Date().toISOString().split("T")[0];
    const newEntry = `## ${newVersion} (${today})\n\n- ${changelog}\n\n`;

    await fs.writeFile(changelogPath, newEntry + changelogContent);
    console.log("✅ Updated CHANGELOG.md");
  }

  rl.close();
  console.log("\n🎉 Ready to release!");
  console.log("\nNext steps:");
  console.log(
    "1. git add package.json CHANGELOG.md src/lib/components/whats-new/features/",
  );
  console.log('2. git commit -m "Bump version to v' + newVersion + '"');
  console.log("3. git push");
  console.log("4. npm run dist:publish");
}

bumpVersion();
