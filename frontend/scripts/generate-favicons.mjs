import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const svgPath = path.join(root, "public", "icon.svg")
const svg = fs.readFileSync(svgPath)

await sharp(svg).resize(32, 32).png().toFile(path.join(root, "app", "icon.png"))
await sharp(svg).resize(180, 180).png().toFile(path.join(root, "app", "apple-icon.png"))

console.log("Wrote app/icon.png (32) and app/apple-icon.png (180) from public/icon.svg")
