// Export platform sizes without altering the generated artwork or its alpha.
const fs = require("node:fs/promises");
const path = require("node:path");
const { generateImageAsync } = require("@expo/image-utils");

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const directory = path.join(projectRoot, "assets", "branding");
  for (const [input, output, width, height] of [
    ["todoo-icon.png", "todoo-icon.png", 1024, 1024],
    ["todoo-icon.png", "todoo-play-store.png", 512, 512],
    ["todoo-foreground.png", "todoo-foreground.png", 432, 432],
    ["todoo-feature-graphic.png", "todoo-feature-graphic.png", 1024, 500],
  ]) {
    const { source } = await generateImageAsync({ projectRoot }, {
      src: path.join(directory, "source", input),
      name: output,
      width,
      height,
      resizeMode: width === height ? "contain" : "cover",
      removeTransparency: output === "todoo-icon.png" || output === "todoo-feature-graphic.png",
    });
    await fs.writeFile(path.join(directory, output), source);
    console.log(`${output}: ${width} x ${height}, ${source.length} bytes`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
