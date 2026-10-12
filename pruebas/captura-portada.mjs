// Captura de la portada en computador (pantalla normal, no "página completa") para ver la mini capa ya animada.
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import pathMod from "node:path";
const PRUEBAS = pathMod.dirname(fileURLToPath(import.meta.url));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2500));
await p.screenshot({ path: pathMod.join(PRUEBAS, "..", "capturas", "computador-portada.png") });
await b.close(); console.log("ok computador-portada");
