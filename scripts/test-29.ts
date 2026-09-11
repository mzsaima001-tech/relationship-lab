// 仅供冒烟：29 原型引擎验证
import { ARCHETYPE_VECTORS } from "../lib/personality/archetypes";
import { PERSONALITY_TYPE_META, type PersonalityType } from "../lib/personality/types";
import { TOTEM_MOON_PHASE, MOON_PHASE_MAP, TOTEM_MAP, TOTEM_DESCRIPTORS } from "../lib/personality/cards/totem";
import { matchArchetypes } from "../lib/personality/archetypes";

console.log("=== ARCHETYPE_VECTORS ===");
const VECTORS = ARCHETYPE_VECTORS as unknown as Record<string, Record<string, number>>;
console.log("count =", Object.keys(VECTORS).length);
console.log("dark_reef__spark =", JSON.stringify(VECTORS.dark_reef__spark));
console.log("doer__leader =", JSON.stringify(VECTORS.doer__leader));

console.log("\n=== matchArchetypes 50/50 baseline ===");
const baseline = matchArchetypes({ social: 50, rationality: 50, planning: 50, risk: 50, dominance: 50, sensitivity: 50 });
for (const r of baseline) console.log("  " + r.type + " score=" + r.matchScore);

console.log("\n=== matchArchetypes explorer-like ===");
const explorer = matchArchetypes({ social: 70, rationality: 50, planning: 30, risk: 95, dominance: 70, sensitivity: 55 });
for (const r of explorer) console.log("  " + r.type + " score=" + r.matchScore);

console.log("\n=== matchArchetypes dark_reef-like ===");
const dark = matchArchetypes({ social: 15, rationality: 60, planning: 70, risk: 25, dominance: 30, sensitivity: 85 });
for (const r of dark) console.log("  " + r.type + " score=" + r.matchScore);

const v29 = Object.keys(ARCHETYPE_VECTORS) as PersonalityType[];
const missingMeta = v29.filter(k => !PERSONALITY_TYPE_META[k]);
const missingMoon = v29.filter(k => !MOON_PHASE_MAP[k]);
const missingTotem = v29.filter(k => !TOTEM_MAP[k]);
const missingDesc = v29.filter(k => !TOTEM_DESCRIPTORS[k]);
console.log("\n=== Coverage ===");
console.log("META missing:", missingMeta.length, missingMeta);
console.log("Moon missing:", missingMoon.length, missingMoon);
console.log("Totem missing:", missingTotem.length, missingTotem);
console.log("Descriptor missing:", missingDesc.length, missingDesc);
