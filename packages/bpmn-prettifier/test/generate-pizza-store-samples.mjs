import { mkdir, readFile, writeFile } from "node:fs/promises";
import { convertBpmnLaneOrientation } from "../dist/index.js";

const source = await readFile(new URL("./fixtures/Pizza-Store.bpmn", import.meta.url), "utf8");
const outputDir = new URL("../test-results/", import.meta.url);
await mkdir(outputDir, { recursive: true });

const vertical = await convertBpmnLaneOrientation(source, "vertical");
await writeFile(new URL("Pizza-Store-vertical.bpmn", outputDir), vertical.xml, "utf8");

const horizontal = await convertBpmnLaneOrientation(vertical.xml, "horizontal");
await writeFile(new URL("Pizza-Store-roundtrip-horizontal.bpmn", outputDir), horizontal.xml, "utf8");

console.log("Generated Pizza Store samples:");
console.log("- test-results/Pizza-Store-vertical.bpmn");
console.log("- test-results/Pizza-Store-roundtrip-horizontal.bpmn");
