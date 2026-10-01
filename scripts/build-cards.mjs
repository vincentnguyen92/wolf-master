// Compresses the printed card scans in cards/ into the light WebP files the
// app ships. The originals stay in cards/ (not committed); rerun after
// replacing a scan.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
const scans = {
  "0466417F-ABA2-4128-91DB-566BDC7F071B": "cursed",
  "2AE6C778-4BCA-41FF-9965-76F8FB97EE32": "minion",
  "3C4FD3C7-C469-4861-AB2B-78153E885BDB": "guard",
  "41A888E9-2F15-4C37-932D-C78559E23B3B": "villager",
  "484DB7D4-8618-4533-966A-B06D314439F0": "werewolf",
  "49ADB3B3-B6F1-468D-9789-CD2A804382DB": "apprentice_seer",
  "513204A0-5914-4794-B402-D4B755D38F5B": "spellcaster",
  "52B44189-B23B-4BF0-B8A0-C194B3FC2262": "witch",
  "71172471-4BA3-4E36-BE39-D9921BE86027": "tough_guy",
  "7F9B2168-4A6E-4E53-BB0F-95D1C11892AC": "wolf_cub",
  "87A45FD2-6838-439F-83EA-B26D81A9E19E": "sorceress",
  "8C5A8860-6FE8-4867-A062-4541AE5F427F": "doppelganger",
  "C9005EB1-4269-4EAD-B0CB-254EBC6BE632": "seer",
  "CE523D19-0A50-4C3B-B683-D40418105DC0": "tanner",
  "D22ECF15-52D9-4D87-8D33-F61B4B1479B0": "hunter",
  "D5F30421-6EB1-4694-99C0-756418E2E196": "cupid",
};
await mkdir("public/assets/cards", { recursive: true });
for (const [scan, id] of Object.entries(scans))
  await sharp(`cards/${scan}.png`)
    .resize(480, 720)
    .webp({ quality: 78, alphaQuality: 90 })
    .toFile(`public/assets/cards/${id}.webp`);
console.log(`${Object.keys(scans).length} cards written to public/assets/cards`);
