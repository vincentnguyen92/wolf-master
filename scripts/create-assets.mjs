import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const colors = {
  werewolf: "#dab5a5",
  guard: "#acd0bd",
  seer: "#bfb3df",
  witch: "#c7b6d5",
  hunter: "#d1b991",
  villager: "#ddc88e",
  wolf_cub: "#e3a98f",
  tanner: "#a9b7c0",
};
const symbols = {
  werewolf:
    '<path d="M47 101 44 44 68 62 80 55 92 62 116 44 113 101 94 126 80 139 66 126Z" fill="#263743"/><path d="m44 44 15 39 9-21m48-18-15 39-9-21M59 88l14 9-10 3m38-12-14 9 10 3M68 117l12 9 12-9M80 126v13"/><path d="m74 112 6-4 6 4-6 5Z" fill="currentColor"/><path d="m66 101 8 11m20-11-8 11"/>',
  guard:
    '<path d="M80 44c12 10 24 12 38 13v38c0 23-18 38-38 48-20-10-38-25-38-48V57c14-1 26-3 38-13Z" fill="#263c39"/><path d="M80 57v70m-24-60v27c0 15 10 26 24 33 14-7 24-18 24-33V67M64 89h32m-16-15v36"/><path d="m80 79 7 10-7 10-7-10Z" fill="currentColor"/>',
  seer: '<circle cx="80" cy="85" r="36" fill="#2c2b42"/><path d="M49 85q31-34 62 0-31 34-62 0Z"/><circle cx="80" cy="85" r="12"/><circle cx="80" cy="85" r="4" fill="currentColor"/><path d="M59 118 49 139h62l-10-21M80 34v-9m-42 32-8-5m92 5 8-5M65 137h30"/>',
  witch:
    '<path d="M65 46h30v9l-5 5v24l21 34q8 21-13 23H62q-21-2-13-23l21-34V60l-5-5Z" fill="#342a40"/><path d="M54 111q13-10 26 0t26 0M64 47V36h32v11M70 65h20M73 89h14"/><circle cx="75" cy="123" r="3" fill="currentColor"/><circle cx="89" cy="116" r="2" fill="currentColor"/><path d="m112 68 8-14m-4 7 9 1m-47-37 4-9"/>',
  hunter:
    '<path d="m50 50 60 83M48 50l15 1-7 13M108 135l-2-17m2 17-16-6"/><path d="M45 115q-11-58 56-64M45 115l56-64M46 115l17-4m38-60-2 17"/><path d="m110 63-12 9m14 2-16 4"/><path d="m48 140 4-18m-2 8-10-7m11 2 8-8"/>',
  villager:
    '<path d="M40 86 80 47l40 39M49 78v62h62V78" fill="#373328"/><path d="M68 140v-35h24v35M55 88h12v12H55zm38 0h12v12H93zM99 63V48h11v26M72 69h16v15H72z"/><path d="M33 143h94m-89-16V99m-4 0h8v-9h-8z"/>',
  wolf_cub:
    '<path d="M54 106 52 66 69 78 80 73 91 78 108 66 106 106 92 124 80 133 68 124Z" fill="#3a2f33"/><path d="m52 66 10 26 6-12m40-14-10 26-6-12M63 96l10 6-7 2m31-8-10 6 7 2M71 117l9 6 9-6"/><path d="m76 111 4-3 4 3-4 4Z" fill="currentColor"/><path d="M110 40a14 14 0 1 0 8 25 11 11 0 0 1-8-25"/><path d="M44 142h14m44 0h14"/>',
  tanner:
    '<path d="M80 22v28"/><path d="M80 50c-12 0-16 8-16 14s6 12 16 12 16-6 16-12-4-14-16-14Z"/><path d="M72 52h16m-17 6h18m-18 6h18"/><circle cx="80" cy="108" r="30" fill="#2c343b"/><path d="m64 98 8 3m24-3-8 3M68 124q12-10 24 0M74 104v4m12-4v4"/><path d="M58 145h44"/>',
};
for (const [id, color] of Object.entries(colors)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180"><defs><radialGradient id="g"><stop stop-color="${color}" stop-opacity=".15"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><rect width="160" height="180" fill="url(#g)"/><g fill="none" stroke="${color}" stroke-width="1.3"><path d="M24 151V74a56 56 0 0 1 112 0v77M30 151V74a50 50 0 0 1 100 0v77" opacity=".4"/><path d="m80 10 3 5-3 5-3-5M18 152h124M48 159h64" opacity=".7"/></g><g color="${color}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${symbols[id]}</g><g fill="${color}" opacity=".6"><circle cx="32" cy="35" r="1"/><circle cx="129" cy="43" r="1.3"/><circle cx="123" cy="121" r="1"/><circle cx="38" cy="113" r="1"/></g></svg>`;
  await writeFile(`public/assets/roles/${id}.svg`, svg);
}
const scene = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 460"><defs><radialGradient id="sky"><stop stop-color="#344653"/><stop offset="1" stop-color="#101a25"/></radialGradient><linearGradient id="fog" x2="0" y2="1"><stop stop-color="#50616a" stop-opacity=".2"/><stop offset="1" stop-color="#101a25"/></linearGradient></defs><rect width="600" height="460" fill="url(#sky)"/><circle cx="374" cy="111" r="48" fill="#e9d6a5"/><circle cx="389" cy="96" r="45" fill="#293a46"/><g fill="#c7bc98" opacity=".5"><circle cx="210" cy="77" r="1.2"/><circle cx="450" cy="52" r="1"/><circle cx="290" cy="48" r="1"/><circle cx="486" cy="142" r="1.5"/><circle cx="154" cy="137" r="1"/><circle cx="324" cy="177" r="1"/><circle cx="426" cy="189" r="1"/></g><path d="M60 312 161 180 238 287 285 221 361 295 453 174 562 296v164H60" fill="#1c303a"/><g fill="#14262f"><path d="m92 154-40 125h24l-43 70h112l-42-70h21Zm440-27-46 149h28l-48 80h132l-51-80h28Z"/><path d="m156 218-35 94h18l-29 52h92l-30-52h20Zm302 3-34 105h20l-35 58h97l-32-58h20Z"/></g><path d="M15 389q166-106 305-22 140-44 282 1v92H15Z" fill="#17232c"/><g stroke="#52616a" stroke-width="1.4" stroke-linejoin="round"><path d="M214 303h125v94H214Z" fill="#25313a"/><path d="m196 307 79-81 84 81Z" fill="#33424a"/><path d="m207 299 68-68 72 68M224 283h101m-92-12h79m-69-12h55" fill="none"/><path d="M250 397v-47q17-22 34 0v47" fill="#14212a"/><path d="M308 319h17v27h-17zm-79 0h15v27h-15z" fill="#d8b370" stroke="#a58e64"/><path d="M363 331h86v68h-86Z" fill="#28353c"/><path d="m350 333 57-57 57 57Z" fill="#3d4549"/><path d="M383 354h15v22h-15zm35 0h15v22h-15z" fill="#d8b370" stroke="#a58e64"/><path d="M372 298v-29h12v17" fill="#34414a"/><path d="M119 359h72v45h-72Z" fill="#253039"/><path d="m106 361 49-47 49 47Z" fill="#35434b"/><path d="M140 377h13v19h-13z" fill="#e0bb79" stroke="#a58e64"/></g><path d="M266 383q-30 42 42 77h138q-100-35-161-77" fill="#46504e" opacity=".5"/><g stroke="#576057" stroke-width="3"><path d="M197 367v55m-23-49v51m-23-44v41m46-40-53 13m291-27v38m24-38v42m-47-40v30m-6-15h68"/></g><path d="M0 390q155-26 294 9t306-2v63H0Z" fill="url(#fog)"/><path d="M0 445q158-41 304 0t296-4v19H0Z" fill="#101a25"/></svg>`;
await writeFile("public/assets/scenes/village-night.svg", scene);
await writeFile(
  "public/assets/scenes/village-day.svg",
  scene
    .replaceAll("#101a25", "#251f1c")
    .replaceAll("#293a46", "#594538")
    .replaceAll("#344653", "#69503d"),
);
const back = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180"><rect x="25" y="12" width="110" height="155" rx="45" fill="#22313c" stroke="#e9c887"/><path d="m80 36 35 54-35 54-35-54Z" fill="none" stroke="#e9c887" opacity=".5"/><path d="M93 67a24 24 0 1 0 0 46 25 25 0 0 1 0-46" fill="#e9c887"/></svg>`;
await writeFile("public/assets/icons/card-back.svg", back);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="100" fill="#101a25"/><circle cx="256" cy="230" r="152" fill="none" stroke="#e9c887" stroke-width="3"/><path d="M292 118a112 112 0 1 0 0 224 119 119 0 0 1 0-224" fill="#e9c887"/><path d="m182 350 74-62 74 62v70H182Z" fill="#273944" stroke="#e9c887" stroke-width="4"/><path d="M240 420v-51h32v51" fill="#e9c887"/></svg>`;
await writeFile("public/assets/icons/app.svg", icon);
for (const size of [192, 512])
  await sharp(Buffer.from(icon))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
await mkdir("public/assets/roles", { recursive: true });
