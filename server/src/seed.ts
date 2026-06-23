import { db } from "./db.js";
import { seedRuntime } from "./seedData.js";

await seedRuntime(db);
await db.$disconnect();
