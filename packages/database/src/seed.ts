import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import * as schema from "./schema/index";

const TOTAL_PRODUCTS = 50_000;
const BATCH_SIZE = 1_000;

// ── Mnemonic SKU generator ──
// Business uses 10-letter code: K=1, I=2, L=3, O=4, S=5, U=6, T=7, A=8, N=9, G=0
const MNEMONIC_CHARS = "KILOSUTANG";
function generateMnemonicSku(): string {
  let sku = "";
  for (let i = 0; i < 10; i++) {
    sku += MNEMONIC_CHARS[Math.floor(Math.random() * 10)];
  }
  return sku;
}

// ── Realistic school supply product names ──
const NOTEBOOK_BRANDS = [
  "Cattleya", "Sterling", "National Book Store", "Mongol", "Orions",
  "Herlitz", "Mead", "Five Star", "Moleskine", "Oxford",
];
const NOTEBOOK_TYPES = [
  "Spiral Notebook", "Composition Notebook", "Pad Paper", "Yellow Pad",
  "Sketch Pad", "Graph Paper Notebook", "Record Book", "Steno Notebook",
];
const NOTEBOOK_SIZES = [
  "Small (5x7)", "Medium (7x10)", "Large (8.5x11)", "A4", "A5",
  "Half-Crosswise", "Crosswise", "Lengthwise",
];

const PEN_BRANDS = [
  "Pilot", "Pentel", "Stabilo", "Faber-Castell", "Dong-A",
  "Uni", "G-Tech", "HBW", "Panda", "Kilometrico",
];
const PEN_TYPES = [
  "Ballpoint Pen", "Gel Pen", "Sign Pen", "Marker", "Highlighter",
  "Mechanical Pencil", "Colored Pen Set", "Whiteboard Marker",
  "Permanent Marker", "Felt-Tip Pen",
];

const ART_SUPPLIES = [
  "Watercolor Set", "Oil Pastel Set", "Crayon Set", "Colored Pencil Set",
  "Acrylic Paint Set", "Paint Brush Set", "Drawing Paper Pack",
  "Canvas Board", "Modeling Clay Set", "Origami Paper Pack",
  "Charcoal Pencil Set", "Sketch Pencil Set", "Palette Tray",
  "Easel Stand", "Art Portfolio Bag",
];
const ART_BRANDS = [
  "Faber-Castell", "Crayola", "Pentel", "Sakura", "Staedtler",
  "Prang", "Winsor & Newton", "Canson", "Lyra", "Holbein",
];

const GENERAL_MERCH = [
  "Ruler Set", "Scissors", "Glue Stick", "White Glue", "Tape Dispenser",
  "Masking Tape", "Transparent Tape", "Paper Clips Box", "Binder Clips",
  "Stapler", "Stapler Wire", "Push Pins", "Thumbtacks", "Index Cards",
  "Correction Tape", "Correction Fluid", "Pencil Sharpener",
  "Eraser Set", "Sticky Notes Pack", "Folder Set",
];

const BAGS = [
  "School Backpack", "Trolley Bag", "Drawstring Bag", "Pencil Case",
  "Lunch Bag", "Laptop Sleeve", "Document Envelope", "Expandable Folder",
  "Art Supply Organizer", "Messenger Bag",
];

const ELECTRONICS = [
  "Scientific Calculator", "Basic Calculator", "USB Flash Drive",
  "Earbuds", "Laptop Stand", "Desk Lamp", "Power Bank",
  "Wireless Mouse", "Keyboard Protector", "Screen Cleaner Kit",
];

type Category = "SCHOOL_SUPPLIES" | "OFFICE_SUPPLIES" | "ART_SUPPLIES" | "GENERAL_MERCHANDISE" | "BAGS_ACCESSORIES" | "ELECTRONICS" | "OTHER";

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateProduct(index: number): {
  name: string;
  category: Category;
  unitPrice: string;
  costPrice: string;
} {
  const roll = Math.random();

  if (roll < 0.3) {
    const brand = randomFrom(NOTEBOOK_BRANDS);
    const type = randomFrom(NOTEBOOK_TYPES);
    const size = randomFrom(NOTEBOOK_SIZES);
    const unitPrice = (15 + Math.random() * 185).toFixed(2);
    return {
      name: `${brand} ${type} ${size}`,
      category: "SCHOOL_SUPPLIES",
      unitPrice,
      costPrice: (Number(unitPrice) * 0.6).toFixed(2),
    };
  } else if (roll < 0.5) {
    const brand = randomFrom(PEN_BRANDS);
    const type = randomFrom(PEN_TYPES);
    const unitPrice = (8 + Math.random() * 250).toFixed(2);
    return {
      name: `${brand} ${type}`,
      category: "OFFICE_SUPPLIES",
      unitPrice,
      costPrice: (Number(unitPrice) * 0.55).toFixed(2),
    };
  } else if (roll < 0.7) {
    const item = randomFrom(ART_SUPPLIES);
    const brand = randomFrom(ART_BRANDS);
    const unitPrice = (25 + Math.random() * 800).toFixed(2);
    return {
      name: `${brand} ${item}`,
      category: "ART_SUPPLIES",
      unitPrice,
      costPrice: (Number(unitPrice) * 0.5).toFixed(2),
    };
  } else if (roll < 0.85) {
    const item = randomFrom(GENERAL_MERCH);
    const unitPrice = (10 + Math.random() * 150).toFixed(2);
    return {
      name: `${item} #${index}`,
      category: "GENERAL_MERCHANDISE",
      unitPrice,
      costPrice: (Number(unitPrice) * 0.55).toFixed(2),
    };
  } else if (roll < 0.95) {
    const bag = randomFrom(BAGS);
    const unitPrice = (80 + Math.random() * 2000).toFixed(2);
    return {
      name: `${bag} - Style #${index}`,
      category: "BAGS_ACCESSORIES",
      unitPrice,
      costPrice: (Number(unitPrice) * 0.5).toFixed(2),
    };
  } else {
    const elec = randomFrom(ELECTRONICS);
    const unitPrice = (150 + Math.random() * 3000).toFixed(2);
    return {
      name: `${elec}`,
      category: "ELECTRONICS",
      unitPrice,
      costPrice: (Number(unitPrice) * 0.6).toFixed(2),
    };
  }
}

async function seed() {
  console.log("Starting seed...");
  const start = Date.now();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  // ── 1. Create Organization ──
  console.log("  Creating organization...");
  const [org] = await db
    .insert(schema.organizations)
    .values({ name: "Jeff & Julie Multi-Trade", slug: "jeff-julie-multi-trade" })
    .returning();

  // ── 2. Create Locations ──
  console.log("  Creating locations...");
  const [mainBranch] = await db
    .insert(schema.locations)
    .values({ orgId: org.id, name: "Main Branch", code: "MAIN", type: "STORE", address: "Main St, City Center" })
    .returning();

  const [toysBranch] = await db
    .insert(schema.locations)
    .values({ orgId: org.id, name: "Toys Branch", code: "TOYS", type: "STORE", address: "Toy District" })
    .returning();

  const [igualdadWarehouse] = await db
    .insert(schema.locations)
    .values({ orgId: org.id, name: "Igualdad Warehouse", code: "IGUALDAD", type: "WAREHOUSE", address: "Igualdad St" })
    .returning();

  const [magsaysayWarehouse] = await db
    .insert(schema.locations)
    .values({ orgId: org.id, name: "Magsaysay Warehouse", code: "MAGSAYSAY", type: "WAREHOUSE", address: "Magsaysay Ave" })
    .returning();

  // TRANSIT_BUFFER — system location for in-transit stock
  const [transitBuffer] = await db
    .insert(schema.locations)
    .values({
      orgId: org.id,
      name: "In Transit Buffer",
      code: "TRANSIT",
      type: "TRANSIT_BUFFER",
      isSystem: true,
      isActive: true,
    })
    .returning();

  const allLocations = [mainBranch, toysBranch, igualdadWarehouse, magsaysayWarehouse];
  const warehouseIds = new Set([igualdadWarehouse.id, magsaysayWarehouse.id]);
  // Note: TRANSIT_BUFFER is NOT in allLocations — no inventory seeded for it

  // ── 3. Create Admin User ──
  console.log("  Creating admin user...");
  const passwordHash = await bcrypt.hash("admin12345", 12);
  const [adminUser] = await db
    .insert(schema.users)
    .values({
      orgId: org.id,
      primaryLocationId: mainBranch.id,
      fullName: "Admin User",
      email: "admin@jnj.com",
      passwordHash,
      role: "ADMIN",
    })
    .returning();

  // ── 4. Create Supplier ──
  console.log("  Creating supplier...");
  await db.insert(schema.suppliers).values({
    orgId: org.id,
    name: "National Book Store Wholesale",
    contactEmail: "wholesale@nbs.com",
    contactPhone: "+63-2-8888-1234",
    avgLeadTimeDays: 5,
  });

  // ── 5. Generate 50k Products in batches ──
  console.log(`  Generating ${TOTAL_PRODUCTS.toLocaleString()} products...`);

  for (let batch = 0; batch < TOTAL_PRODUCTS / BATCH_SIZE; batch++) {
    const productBatch: (typeof schema.products.$inferInsert)[] = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const idx = batch * BATCH_SIZE + i;
      const { name, category, unitPrice, costPrice } = generateProduct(idx);

      const sku = `${category.slice(0, 3)}-${String(idx).padStart(6, "0")}`;

      productBatch.push({
        orgId: org.id,
        name,
        sku,
        mnemonicSku: generateMnemonicSku(),
        category,
        unitPrice,
        costPrice,
      });
    }

    await db.insert(schema.products).values(productBatch);

    if ((batch + 1) % 10 === 0) {
      console.log(
        `    Inserted ${((batch + 1) * BATCH_SIZE).toLocaleString()} products...`,
      );
    }
  }

  // ── 6. Distribute Inventory across locations ──
  console.log("  Distributing inventory across locations...");

  const allProducts = await db
    .select({ id: schema.products.id })
    .from(schema.products);

  for (let batch = 0; batch < allProducts.length / BATCH_SIZE; batch++) {
    const slice = allProducts.slice(
      batch * BATCH_SIZE,
      (batch + 1) * BATCH_SIZE,
    );

    const inventoryBatch: (typeof schema.inventory.$inferInsert)[] = [];

    for (const product of slice) {
      for (const loc of allLocations) {
        const isWarehouse = warehouseIds.has(loc.id);
        inventoryBatch.push({
          orgId: org.id,
          productId: product.id,
          locationId: loc.id,
          stockLevel: isWarehouse
            ? Math.floor(Math.random() * 500) + 50
            : Math.floor(Math.random() * 50) + 5,
          reservedLevel: 0,
          reorderPoint: isWarehouse ? 20 : 5,
          leadTimeDays: isWarehouse ? 14 : 3,
        });
      }
    }

    await db.insert(schema.inventory).values(inventoryBatch);

    if ((batch + 1) % 10 === 0) {
      console.log(
        `    Distributed ${((batch + 1) * BATCH_SIZE).toLocaleString()} products to 4 locations...`,
      );
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nSeed complete in ${elapsed}s`);
  console.log(`   Organization: ${org.name} (${org.id})`);
  console.log(`   Main Branch: ${mainBranch.name} (${mainBranch.id})`);
  console.log(`   Toys Branch: ${toysBranch.name} (${toysBranch.id})`);
  console.log(`   Igualdad Warehouse: ${igualdadWarehouse.name} (${igualdadWarehouse.id})`);
  console.log(`   Magsaysay Warehouse: ${magsaysayWarehouse.name} (${magsaysayWarehouse.id})`);
  console.log(`   Transit Buffer: ${transitBuffer.name} (${transitBuffer.id})`);
  console.log(`   Admin: admin@jnj.com / admin12345`);
  console.log(`   Products: ${TOTAL_PRODUCTS.toLocaleString()}`);
  console.log(`   Inventory rows: ${(TOTAL_PRODUCTS * 4).toLocaleString()}`);

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
