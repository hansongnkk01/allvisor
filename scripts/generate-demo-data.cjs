/**
 * Generate niche-separated demo CSVs under demo-data/<niche>/.
 * Run: node scripts/generate-demo-data.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "demo-data");

const CUSTOMERS = [
  ["Ahmad bin Ali", "900101145678", "0123456789", "ahmad@email.com", "12 Jalan Melati, Kajang", "Walk-in regular", "low"],
  ["Siti Aminah", "880202085432", "0198765432", "", "45 Taman Sri Putra, Puchong", "Prefers evening", "medium"],
  ["Lim Wei Jie", "950315145678", "01122334455", "weijie@email.com", "88 SS15, Subang Jaya", "Member", "low"],
  ["Nurul Huda", "920808145321", "0139988776", "", "3 Kampung Baru, KL", "", "low"],
  ["Raj Kumar", "870101145999", "0176655443", "raj@email.com", "21 Jalan Ampang, KL", "Corporate", "low"],
  ["Tan Mei Ling", "930505145111", "0161122334", "mei@email.com", "9 Bandar Utama, PJ", "VIP", "low"],
  ["Mohd Faiz", "910912145222", "0193344556", "", "77 Seksyen 7, Shah Alam", "Cash only", "medium"],
  ["Chong Kah Wai", "960201145333", "0127788990", "chong@email.com", "15 Setapak, KL", "", "low"],
  ["Aisyah Rahman", "940707145444", "0115566778", "aisyah@email.com", "2 Putrajaya", "Online orders", "low"],
  ["Gurpreet Singh", "890303145555", "0142233445", "", "66 Brickfields, KL", "Wholesale", "low"],
  ["Farah Zainal", "970818145666", "0136677889", "farah@email.com", "40 Cyberjaya", "", "low"],
  ["Lee Jun Hao", "980101145777", "0178899001", "junhao@email.com", "18 Cheras", "Student discount", "low"],
  ["Priya Devi", "920414145888", "0164455667", "", "5 Seremban", "", "low"],
  ["Hafiz Abdullah", "850909145999", "0123344556", "hafiz@email.com", "100 Ipoh Road, KL", "Monthly account", "medium"],
  ["Wong Siew Lan", "880612145000", "0195566778", "", "33 Melaka Raya", "", "low"],
  ["Azman Ismail", "910223145101", "0117788990", "azman@email.com", "8 Klang", "", "low"],
  ["Jessica Ng", "950430145202", "0168899001", "jessica@email.com", "27 Bangsar", "Gift buyer", "low"],
  ["Kumar a/l Rajan", "860715145303", "0149900112", "", "55 Johor Bahru", "", "low"],
  ["Sofea Izzati", "990120145404", "0131011223", "sofea@email.com", "14 Kota Kinabalu", "", "low"],
  ["Daniel Teo", "940825145505", "0172122334", "daniel@email.com", "61 Penang Road", "Staff friend", "low"],
];

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(dir, filename, headers, rows) {
  fs.mkdirSync(dir, { recursive: true });
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  fs.writeFileSync(path.join(dir, filename), lines.join("\n") + "\n", "utf8");
}

function writeCustomers(dir, noteOverrides = {}) {
  const rows = CUSTOMERS.map((c, i) => {
    const row = [...c];
    if (noteOverrides[i] != null) row[5] = noteOverrides[i];
    return row;
  });
  writeCsv(
    dir,
    "customers.csv",
    ["name", "ic_number", "phone", "email", "address", "notes", "risk_level"],
    rows
  );
}

function productRow(name, sku, barcode, category, price, cost, qty, desc = "", soldBy = "each") {
  return [name, sku, barcode, category, soldBy, price, cost, qty, 10, "yes", "yes", "no", desc];
}

const PRODUCT_HEADERS = [
  "name", "sku", "barcode", "category", "sold_by", "unit_price", "cost_price",
  "quantity", "low_stock_threshold", "available_to_sale", "track_stock", "price_on_sale", "description",
];

const PAST_SALE_HEADERS = [
  "invoice_number", "issue_date", "customer_name", "customer_ic", "customer_phone",
  "product_name", "sku", "barcode", "quantity", "unit_price", "payment_method", "notes",
];

function pastSale(inv, date, custIdx, productName, sku, barcode, qty, price, method = "cash", notes = "") {
  const c = CUSTOMERS[custIdx];
  return [inv, date, c[0], c[1], c[2], productName, sku, barcode, qty, price, method, notes];
}

function writeRetailCatalog(dir, categories, products, suppliers, sales) {
  writeCsv(dir, "product-categories.csv", ["name", "parent"], categories);
  writeCsv(dir, "products.csv", PRODUCT_HEADERS, products);
  if (suppliers) writeCsv(dir, "suppliers.csv", ["name", "phone", "email", "address", "notes"], suppliers);
  if (sales) writeCsv(dir, "past-sales.csv", PAST_SALE_HEADERS, sales);
}

function writeServices(dir, categories, items, appointments) {
  writeCsv(dir, "service-categories.csv", ["name", "description"], categories);
  writeCsv(dir, "service-items.csv", ["name", "category", "unit_price", "description"], items);
  if (appointments) {
    writeCsv(
      dir,
      "appointments.csv",
      ["patient_name", "patient_ic", "patient_phone", "category", "starts_at", "ends_at", "status", "notes"],
      appointments
    );
  }
}

function appt(custIdx, category, start, end, status = "scheduled", notes = "") {
  const c = CUSTOMERS[custIdx];
  return [c[0], c[1], c[2], category, start, end, status, notes];
}

const DEFAULT_SUPPLIERS = [
  ["Syarikat Sumber Jaya", "0388881111", "sales@sumberjaya.my", "Shah Alam, Selangor", "Main supplier"],
  ["Tech Parts Sdn Bhd", "0377772222", "order@techparts.my", "Petaling Jaya", "Parts"],
  ["Hardware Hub MY", "0366663333", "hub@hardware.my", "Klang", "Tools"],
  ["Fresh Drink Distributors", "0355554444", "fresh@drinks.my", "Subang Jaya", "Beverages"],
  ["Snack World Trading", "0344445555", "sales@snackworld.my", "Cheras", "Snacks"],
  ["CleanPro Supplies", "0333336666", "info@cleanpro.my", "Shah Alam", "Cleaning"],
  ["Paper & More", "0322227777", "orders@papermore.my", "Kepong", "Stationery"],
  ["Battery Max", "0311118888", "max@battery.my", "Puchong", "Batteries"],
  ["Rope & Cord Co", "0399990000", "rope@cord.my", "Ipoh", "Hardware"],
  ["Rice Mill Central", "0388889999", "rice@mill.my", "Kedah", "Dry goods"],
  ["Valley Soft Drinks", "0377770001", "valley@soda.my", "Johor Bahru", "Soft drinks"],
  ["Cafe Beans Import", "0366660002", "beans@cafe.my", "KL Sentral", "Coffee"],
  ["Hygiene First", "0355550003", "hygiene@first.my", "Melaka", "Personal care"],
  ["Fastener King", "0344440004", "king@fastener.my", "Penang", "Fasteners"],
  ["Valve Tech", "0333330005", "valve@tech.my", "Seremban", "Plumbing"],
  ["Office Mart Wholesale", "0322220006", "office@mart.my", "Putrajaya", "Office"],
  ["Custom Wire Cutters", "0311110007", "wire@custom.my", "Cyberjaya", "Cable cuts"],
  ["East Coast Supply", "0390000008", "east@supply.my", "Kuantan", "General"],
  ["North Star Trading", "0380000009", "north@star.my", "Alor Setar", "Regional"],
  ["Borneo Goods Co", "0870000010", "borneo@goods.my", "Kota Kinabalu", "East MY"],
];

/** @type {Record<string, () => void>} */
const generators = {
  retail() {
    const dir = path.join(ROOT, "retail");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [
        ["Beverages", ""], ["Water", "Beverages"], ["Coffee", "Beverages"], ["Soft drinks", "Beverages"],
        ["Snacks", ""], ["Biscuits", "Snacks"], ["Chips", "Snacks"], ["Chocolate", "Snacks"],
        ["Household", ""], ["Cleaning", "Household"], ["Tissue & paper", "Household"],
        ["Personal care", ""], ["Soap", "Personal care"],
        ["Electronics", ""], ["Cables", "Electronics"], ["Batteries", "Electronics"],
        ["Hardware", ""], ["Tools", "Hardware"], ["Fasteners", "Hardware"],
        ["Stationery", ""], ["Notebooks", "Stationery"], ["Writing", "Stationery"],
      ],
      [
        productRow("Tali Nylon 5m", "SKU-TALI", "8717", "Hardware", 8.5, 3.2, 120, "Demo short barcode 8717"),
        productRow("Air Mineral 500ml", "SKU-AIR", "9556123456789", "Water", 1.5, 0.6, 200),
        productRow("Biskut Coklat", "SKU-BISKUT", "9556987654321", "Biscuits", 6.9, 3.1, 80),
        productRow("Sabun Tangan 250ml", "SKU-SABUN", "8901001234567", "Soap", 9.9, 4.5, 60),
        productRow("Kabel USB-C 1m", "SKU-KABEL", "1234567890123", "Cables", 15, 7, 45),
        productRow("Notebook A5", "SKU-NOTE", "4006381333931", "Notebooks", 4.5, 1.8, 90),
        productRow("Tissue Box", "SKU-TISSUE", "5012345678900", "Tissue & paper", 3.2, 1.4, 150),
        productRow("Kopi 3-in-1 (10s)", "SKU-KOPI", "8850999111222", "Coffee", 7.5, 4, 70),
        productRow("Topi Baseball", "SKU-TOPI", "8717001", "Hardware", 25, 12, 25),
        productRow("Battery AA 4pcs", "SKU-BATT", "8717002", "Batteries", 12, 5.5, 40),
        productRow("Cola Can 330ml", "SKU-COLA", "9556000000001", "Soft drinks", 2.5, 1.2, 180),
        productRow("Chips BBQ", "SKU-CHIPS", "9556000000002", "Chips", 4.2, 2, 100),
        productRow("Chocolate Bar", "SKU-CHOC", "9556000000003", "Chocolate", 3.8, 1.9, 95),
        productRow("Dish Soap 500ml", "SKU-DISH", "9556000000004", "Cleaning", 6.5, 3, 55),
        productRow("Rope per meter", "SKU-ROPE", "9556000000005", "Hardware", 2, 0.8, 300, "Sold by meter", "meter"),
        productRow("Rice 1kg", "SKU-RICE", "9556000000006", "Household", 5.5, 3.5, 80, "Sold by kg", "kg"),
        productRow("Custom cable cut", "SKU-CUSTOM", "999000111222", "Cables", 0, 0, 100, "Price set on sale"),
        productRow("Pen Blue", "SKU-PEN", "9556000000007", "Writing", 1.2, 0.4, 200),
        productRow("Ball Valve 1/2", "SKU-VALVE", "9556000000008", "Tools", 18, 9, 35),
        productRow("Screws pack", "SKU-SCREW", "9556000000009", "Fasteners", 3, 1.1, 150),
      ],
      DEFAULT_SUPPLIERS,
      [
        pastSale("OLD-001", "2026-01-15", 19, "Air Mineral 500ml", "SKU-AIR", "9556123456789", 2, 1.5, "cash", "Imported history"),
        pastSale("OLD-001", "2026-01-15", 19, "Biskut Coklat", "SKU-BISKUT", "9556987654321", 1, 6.9, "cash", "Imported history"),
        pastSale("OLD-002", "2026-02-03", 19, "Kopi 3-in-1 (10s)", "SKU-KOPI", "8850999111222", 1, 7.5, "card"),
        pastSale("OLD-003", "2026-02-20", 0, "Tali Nylon 5m", "SKU-TALI", "8717", 1, 8.5),
        pastSale("OLD-003", "2026-02-20", 0, "Battery AA 4pcs", "SKU-BATT", "8717002", 1, 12),
        pastSale("OLD-004", "2026-03-01", 1, "Sabun Tangan 250ml", "SKU-SABUN", "8901001234567", 2, 9.9, "ewallet"),
        pastSale("OLD-005", "2026-03-12", 2, "Kabel USB-C 1m", "SKU-KABEL", "1234567890123", 1, 15, "transfer"),
        pastSale("OLD-005", "2026-03-12", 2, "Notebook A5", "SKU-NOTE", "4006381333931", 3, 4.5, "transfer"),
        pastSale("OLD-006", "2026-03-28", 3, "Tissue Box", "SKU-TISSUE", "5012345678900", 2, 3.2),
        pastSale("OLD-007", "2026-04-05", 4, "Cola Can 330ml", "SKU-COLA", "9556000000001", 6, 2.5, "card"),
        pastSale("OLD-008", "2026-04-18", 5, "Chocolate Bar", "SKU-CHOC", "9556000000003", 4, 3.8),
        pastSale("OLD-009", "2026-05-02", 6, "Chips BBQ", "SKU-CHIPS", "9556000000002", 2, 4.2),
        pastSale("OLD-010", "2026-05-21", 7, "Dish Soap 500ml", "SKU-DISH", "9556000000004", 1, 6.5, "ewallet"),
        pastSale("OLD-011", "2026-06-04", 8, "Pen Blue", "SKU-PEN", "9556000000007", 5, 1.2),
        pastSale("OLD-012", "2026-06-19", 9, "Screws pack", "SKU-SCREW", "9556000000009", 3, 3),
        pastSale("OLD-013", "2026-07-01", 10, "Ball Valve 1/2", "SKU-VALVE", "9556000000008", 1, 18, "card"),
        pastSale("OLD-014", "2026-07-08", 11, "Topi Baseball", "SKU-TOPI", "8717001", 1, 25),
        pastSale("OLD-015", "2026-07-15", 19, "Air Mineral 500ml", "SKU-AIR", "9556123456789", 4, 1.5),
        pastSale("OLD-015", "2026-07-15", 19, "Tissue Box", "SKU-TISSUE", "5012345678900", 1, 3.2),
        pastSale("OLD-016", "2026-07-22", 13, "Rice 1kg", "SKU-RICE", "9556000000006", 5, 5.5, "transfer"),
      ]
    );
  },

  clinic() {
    const dir = path.join(ROOT, "clinic");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Medicines", ""], ["OTC", "Medicines"], ["Consumables", ""], ["Dressings", "Consumables"]],
      [
        productRow("Paracetamol 500mg 10s", "MED-PARA", "9557000000001", "OTC", 3.5, 1.2, 200),
        productRow("ORS Sachet", "MED-ORS", "9557000000002", "OTC", 1.5, 0.5, 150),
        productRow("Gauze Pack", "MED-GAUZE", "9557000000003", "Dressings", 8, 3, 80),
        productRow("Alcohol Swab 100s", "MED-SWAB", "9557000000004", "Consumables", 12, 5, 60),
        productRow("Face Mask 50s", "MED-MASK", "9557000000005", "Consumables", 15, 7, 100),
      ],
      null,
      null
    );
    const cats = [
      ["General consultation", "Standard GP visit"],
      ["Follow-up", "Review appointment"],
      ["Vaccination", "Immunization clinic"],
      ["Wound care", "Dressing and minor procedures"],
      ["Health screening", "Basic check-up packages"],
      ["Antenatal", "Pregnancy follow-up"],
      ["Paediatric", "Children clinic"],
      ["Dental exam", "Basic dental check"],
      ["Physio session", "Physiotherapy"],
      ["Lab blood test", "Blood investigation"],
      ["ECG", "Heart rhythm test"],
      ["Ultrasound", "Imaging service"],
      ["Nebulizer", "Respiratory treatment"],
      ["Injection", "Medication injection"],
      ["Medical certificate", "MC issuance"],
      ["Travel vaccine", "Travel health"],
      ["Chronic care", "Diabetes / hypertension review"],
      ["Dermatology", "Skin consult"],
      ["ENT consult", "Ear nose throat"],
      ["Emergency walk-in", "Urgent same-day slot"],
    ];
    const items = [
      ["Consultation fee", "General consultation", 50, "Standard consult"],
      ["Follow-up fee", "Follow-up", 30, ""],
      ["Vaccine admin fee", "Vaccination", 25, "Excludes vaccine cost"],
      ["Wound dressing", "Wound care", 35, ""],
      ["Basic screening package", "Health screening", 120, ""],
      ["Antenatal review", "Antenatal", 60, ""],
      ["Paediatric consult", "Paediatric", 55, ""],
      ["Dental check fee", "Dental exam", 40, ""],
      ["Physio 30 min", "Physio session", 80, ""],
      ["Blood test panel", "Lab blood test", 90, ""],
      ["ECG recording", "ECG", 45, ""],
      ["Ultrasound abdomen", "Ultrasound", 150, ""],
      ["Nebulizer session", "Nebulizer", 25, ""],
      ["IM injection fee", "Injection", 15, ""],
      ["MC issuance", "Medical certificate", 10, ""],
      ["Travel consult", "Travel vaccine", 70, ""],
      ["Chronic care review", "Chronic care", 65, ""],
      ["Skin consult fee", "Dermatology", 80, ""],
      ["ENT consult fee", "ENT consult", 75, ""],
      ["Walk-in urgent fee", "Emergency walk-in", 90, ""],
    ];
    const appointments = cats.map((c, i) =>
      appt(i, c[0], `2026-08-${String(4 + Math.floor(i / 7)).padStart(2, "0")} ${String(9 + (i % 6)).padStart(2, "0")}:00`,
        `2026-08-${String(4 + Math.floor(i / 7)).padStart(2, "0")} ${String(9 + (i % 6)).padStart(2, "0")}:30`)
    );
    writeServices(dir, cats, items, appointments);
  },

  salon() {
    const dir = path.join(ROOT, "salon");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Hair care", ""], ["Styling", "Hair care"], ["Retail", ""], ["Colour", "Retail"]],
      [
        productRow("Shampoo 500ml", "SAL-SHAM", "9558000000001", "Hair care", 45, 22, 40),
        productRow("Hair Wax", "SAL-WAX", "9558000000002", "Styling", 35, 15, 30),
        productRow("Colour Tube", "SAL-COL", "9558000000003", "Colour", 55, 28, 25),
        productRow("Hair Serum", "SAL-SER", "9558000000004", "Hair care", 68, 32, 20),
        productRow("Clipper Blade Oil", "SAL-OIL", "9558000000005", "Styling", 12, 5, 50),
      ],
      DEFAULT_SUPPLIERS.slice(0, 8),
      [
        pastSale("SAL-001", "2026-06-01", 5, "Shampoo 500ml", "SAL-SHAM", "9558000000001", 1, 45),
        pastSale("SAL-002", "2026-06-15", 17, "Hair Wax", "SAL-WAX", "9558000000002", 1, 35, "card"),
        pastSale("SAL-003", "2026-07-01", 2, "Hair Serum", "SAL-SER", "9558000000004", 1, 68, "ewallet"),
      ]
    );
    writeServices(
      dir,
      [
        ["Haircut", "Cut & style"],
        ["Colour", "Dye / highlight"],
        ["Treatment", "Hair treatment"],
        ["Manicure", "Nail care"],
        ["Makeup", "Event makeup"],
      ],
      [
        ["Ladies cut", "Haircut", 45, ""],
        ["Men cut", "Haircut", 25, ""],
        ["Full colour", "Colour", 180, ""],
        ["Keratin treatment", "Treatment", 250, ""],
        ["Classic manicure", "Manicure", 40, ""],
        ["Bridal makeup", "Makeup", 350, ""],
      ],
      [
        appt(5, "Haircut", "2026-08-04 10:00", "2026-08-04 10:45"),
        appt(17, "Colour", "2026-08-04 11:00", "2026-08-04 13:00"),
        appt(1, "Manicure", "2026-08-05 14:00", "2026-08-05 14:45"),
        appt(8, "Makeup", "2026-08-06 09:00", "2026-08-06 11:00", "confirmed", "Wedding trial"),
      ]
    );
    writeCsv(dir, "commission-rules.csv", ["staff_name", "percent"], [
      ["Aina Hair", 15], ["Lisa Colour", 18], ["Mei Nails", 12], ["Farah Makeup", 20],
    ]);
  },

  pharmacy() {
    const dir = path.join(ROOT, "pharmacy");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [
        ["Medicines", ""], ["Analgesics", "Medicines"], ["Antibiotics", "Medicines"],
        ["OTC", ""], ["Vitamins", "OTC"], ["First aid", ""],
      ],
      [
        productRow("Panadol 500mg 10s", "PH-PARA", "9559000000001", "Analgesics", 4.5, 1.8, 300),
        productRow("Amoxicillin 250mg", "PH-AMOX", "9559000000002", "Antibiotics", 12, 5, 80, "Rx only"),
        productRow("Vitamin C 1000mg", "PH-VITC", "9559000000003", "Vitamins", 28, 12, 100),
        productRow("Cough Syrup 100ml", "PH-COUGH", "9559000000004", "OTC", 15, 6, 60),
        productRow("Bandage Roll", "PH-BAND", "9559000000005", "First aid", 6, 2.5, 90),
        productRow("Antiseptic 100ml", "PH-ANTI", "9559000000006", "First aid", 9, 3.5, 70),
        productRow("Insulin Pen Needle", "PH-NEED", "9559000000007", "Medicines", 18, 8, 40, "Controlled"),
        productRow("ORS Sachet", "PH-ORS", "9559000000008", "OTC", 1.2, 0.4, 200),
      ],
      DEFAULT_SUPPLIERS.slice(0, 10),
      [
        pastSale("PH-001", "2026-05-10", 0, "Panadol 500mg 10s", "PH-PARA", "9559000000001", 2, 4.5),
        pastSale("PH-002", "2026-06-01", 13, "Vitamin C 1000mg", "PH-VITC", "9559000000003", 1, 28, "card"),
        pastSale("PH-003", "2026-07-12", 1, "Cough Syrup 100ml", "PH-COUGH", "9559000000004", 1, 15),
      ]
    );
    writeCsv(dir, "batches.csv", ["product_name", "sku", "lot_number", "expiry_date", "quantity"], [
      ["Panadol 500mg 10s", "PH-PARA", "LOT-P24A", "2027-06-30", 150],
      ["Panadol 500mg 10s", "PH-PARA", "LOT-P24B", "2027-12-31", 150],
      ["Amoxicillin 250mg", "PH-AMOX", "LOT-AX01", "2026-11-30", 80],
      ["Vitamin C 1000mg", "PH-VITC", "LOT-VC09", "2028-01-15", 100],
      ["Cough Syrup 100ml", "PH-COUGH", "LOT-CS03", "2027-03-01", 60],
      ["Insulin Pen Needle", "PH-NEED", "LOT-IN02", "2026-09-30", 40],
    ]);
  },

  optical() {
    const dir = path.join(ROOT, "optical");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Frames", ""], ["Lenses", ""], ["Accessories", ""], ["Contact lens", ""]],
      [
        productRow("Frame Classic Black", "OPT-FR1", "9560000000001", "Frames", 180, 80, 25),
        productRow("Frame Titanium", "OPT-FR2", "9560000000002", "Frames", 320, 150, 15),
        productRow("Single Vision Lens", "OPT-LN1", "9560000000003", "Lenses", 120, 50, 40),
        productRow("Progressive Lens", "OPT-LN2", "9560000000004", "Lenses", 450, 200, 20),
        productRow("Lens Cleaner", "OPT-CLN", "9560000000005", "Accessories", 15, 5, 80),
        productRow("Daily Contact 30s", "OPT-CL", "9560000000006", "Contact lens", 85, 40, 30),
      ],
      DEFAULT_SUPPLIERS.slice(0, 6),
      [
        pastSale("OPT-001", "2026-04-20", 2, "Frame Classic Black", "OPT-FR1", "9560000000001", 1, 180, "card"),
        pastSale("OPT-001", "2026-04-20", 2, "Single Vision Lens", "OPT-LN1", "9560000000003", 1, 120, "card"),
        pastSale("OPT-002", "2026-06-08", 5, "Lens Cleaner", "OPT-CLN", "9560000000005", 2, 15),
      ]
    );
    writeServices(
      dir,
      [["Eye exam", "Refraction"], ["Fitting", "Frame fitting"], ["Contact fit", "CL fitting"]],
      [
        ["Full eye exam", "Eye exam", 80, ""],
        ["Frame fitting", "Fitting", 30, ""],
        ["Contact lens fit", "Contact fit", 60, ""],
      ],
      [
        appt(2, "Eye exam", "2026-08-04 10:00", "2026-08-04 10:30"),
        appt(5, "Fitting", "2026-08-05 11:00", "2026-08-05 11:30"),
        appt(11, "Contact fit", "2026-08-06 15:00", "2026-08-06 15:45"),
      ]
    );
    writeCsv(
      dir,
      "eye-prescriptions.csv",
      ["customer_name", "customer_ic", "customer_phone", "od_sph", "od_cyl", "od_axis", "os_sph", "os_cyl", "os_axis", "pd", "notes"],
      [
        ["Lim Wei Jie", "950315145678", "01122334455", "-1.50", "-0.50", "90", "-1.25", "-0.25", "85", "62", ""],
        ["Tan Mei Ling", "930505145111", "0161122334", "-2.00", "0", "", "-2.25", "-0.50", "180", "60", "Progressive candidate"],
        ["Lee Jun Hao", "980101145777", "0178899001", "-0.75", "", "", "-0.50", "", "", "64", "First glasses"],
      ]
    );
    writeCsv(
      dir,
      "lab-orders.csv",
      ["customer_name", "customer_ic", "customer_phone", "frame_name", "status", "notes"],
      [
        ["Lim Wei Jie", "950315145678", "01122334455", "Frame Classic Black", "pending", "SV clear"],
        ["Tan Mei Ling", "930505145111", "0161122334", "Frame Titanium", "in_lab", "Progressive"],
        ["Lee Jun Hao", "980101145777", "0178899001", "Frame Classic Black", "ready", ""],
      ]
    );
  },

  tuition() {
    const dir = path.join(ROOT, "tuition");
    writeCustomers(dir, {
      11: "Form 4 student",
      12: "Form 5 student",
      18: "UPSR class",
      19: "Parent contact",
    });
    writeCsv(dir, "subjects.csv", ["name", "price", "teacher_name", "teacher_salary", "notes"], [
      ["Mathematics Form 4", 180, "Cikgu Amir", 2500, "Weekly 2h"],
      ["Science Form 4", 170, "Cikgu Siti", 2400, ""],
      ["English Form 5", 160, "Miss Tan", 2300, "SPM focus"],
      ["Bahasa Melayu Form 5", 150, "Cikgu Aida", 2200, ""],
      ["Additional Maths", 200, "Cikgu Raj", 2800, "Small group"],
      ["Chemistry Form 5", 190, "Dr Lim", 2700, ""],
      ["Physics Form 5", 190, "Encik Faiz", 2700, ""],
      ["Primary Maths", 120, "Teacher Mei", 1800, "Year 4–6"],
    ]);
    writeCsv(
      dir,
      "classes.csv",
      ["name", "subject", "teacher_name", "weekday", "start_time", "end_time", "room", "fee"],
      [
        ["Math F4 Mon", "Mathematics Form 4", "Cikgu Amir", 1, "16:00", "18:00", "R1", 180],
        ["Science F4 Tue", "Science Form 4", "Cikgu Siti", 2, "16:00", "18:00", "R2", 170],
        ["English F5 Wed", "English Form 5", "Miss Tan", 3, "17:00", "19:00", "R1", 160],
        ["BM F5 Thu", "Bahasa Melayu Form 5", "Cikgu Aida", 4, "16:00", "18:00", "R3", 150],
        ["Add Math Sat", "Additional Maths", "Cikgu Raj", 6, "09:00", "11:00", "R1", 200],
        ["Chem F5 Sat", "Chemistry Form 5", "Dr Lim", 6, "11:30", "13:30", "Lab", 190],
        ["Physics Sun", "Physics Form 5", "Encik Faiz", 0, "10:00", "12:00", "Lab", 190],
        ["Primary Math Sat", "Primary Maths", "Teacher Mei", 6, "14:00", "15:30", "R2", 120],
      ]
    );
    writeCsv(dir, "subject-enrollments.csv", ["customer_name", "customer_ic", "subject"], [
      ["Lee Jun Hao", "980101145777", "Mathematics Form 4"],
      ["Lee Jun Hao", "980101145777", "Science Form 4"],
      ["Priya Devi", "920414145888", "English Form 5"],
      ["Priya Devi", "920414145888", "Chemistry Form 5"],
      ["Sofea Izzati", "990120145404", "Primary Maths"],
      ["Daniel Teo", "940825145505", "Additional Maths"],
      ["Chong Kah Wai", "960201145333", "Physics Form 5"],
      ["Farah Zainal", "970818145666", "Bahasa Melayu Form 5"],
    ]);
    writeCsv(dir, "class-enrollments.csv", ["customer_name", "customer_ic", "class_name"], [
      ["Lee Jun Hao", "980101145777", "Math F4 Mon"],
      ["Lee Jun Hao", "980101145777", "Science F4 Tue"],
      ["Priya Devi", "920414145888", "English F5 Wed"],
      ["Priya Devi", "920414145888", "Chem F5 Sat"],
      ["Sofea Izzati", "990120145404", "Primary Math Sat"],
      ["Daniel Teo", "940825145505", "Add Math Sat"],
    ]);
    writeCsv(dir, "attendance.csv", ["class_name", "customer_name", "customer_ic", "attended_on", "present"], [
      ["Math F4 Mon", "Lee Jun Hao", "980101145777", "2026-07-21", "yes"],
      ["Math F4 Mon", "Lee Jun Hao", "980101145777", "2026-07-28", "yes"],
      ["Science F4 Tue", "Lee Jun Hao", "980101145777", "2026-07-22", "no"],
      ["English F5 Wed", "Priya Devi", "920414145888", "2026-07-23", "yes"],
      ["Add Math Sat", "Daniel Teo", "940825145505", "2026-07-26", "yes"],
      ["Primary Math Sat", "Sofea Izzati", "990120145404", "2026-07-26", "yes"],
    ]);
    writeCsv(dir, "assessments.csv", ["title", "class_name", "instructions", "due_at", "max_score"], [
      ["Chapter 3 Quiz", "Math F4 Mon", "Show working", "2026-08-10 18:00", 50],
      ["Essay draft", "English F5 Wed", "300 words", "2026-08-12 19:00", 100],
      ["Lab report", "Chem F5 Sat", "Titration experiment", "2026-08-15 13:30", 80],
    ]);
  },

  workshop() {
    const dir = path.join(ROOT, "workshop");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Parts", ""], ["Oil", "Parts"], ["Filters", "Parts"], ["Labour SKU", ""]],
      [
        productRow("Engine Oil 4L", "WS-OIL", "9561000000001", "Oil", 120, 70, 40),
        productRow("Oil Filter", "WS-OF", "9561000000002", "Filters", 25, 10, 60),
        productRow("Brake Pad Set", "WS-BP", "9561000000003", "Parts", 180, 90, 20),
        productRow("Spark Plug", "WS-SP", "9561000000004", "Parts", 18, 7, 80),
        productRow("Air Filter", "WS-AF", "9561000000005", "Filters", 35, 15, 45),
      ],
      DEFAULT_SUPPLIERS.slice(0, 8),
      [
        pastSale("WS-001", "2026-05-05", 0, "Engine Oil 4L", "WS-OIL", "9561000000001", 1, 120),
        pastSale("WS-001", "2026-05-05", 0, "Oil Filter", "WS-OF", "9561000000002", 1, 25),
        pastSale("WS-002", "2026-06-18", 6, "Brake Pad Set", "WS-BP", "9561000000003", 1, 180, "card"),
      ]
    );
    writeCsv(dir, "vehicles.csv", ["customer_name", "customer_ic", "customer_phone", "plate", "make", "model", "year"], [
      ["Ahmad bin Ali", "900101145678", "0123456789", "WXY1234", "Proton", "Saga", "2019"],
      ["Mohd Faiz", "910912145222", "0193344556", "BKK9988", "Perodua", "Myvi", "2021"],
      ["Raj Kumar", "870101145999", "0176655443", "V1234", "Toyota", "Vios", "2018"],
      ["Hafiz Abdullah", "850909145999", "0123344556", "JHH5566", "Honda", "City", "2020"],
      ["Azman Ismail", "910223145101", "0117788990", "PKL7788", "Nissan", "Almera", "2017"],
    ]);
    writeCsv(dir, "job-cards.csv", ["title", "plate", "customer_name", "customer_ic", "status", "notes"], [
      ["Service 10k", "WXY1234", "Ahmad bin Ali", "900101145678", "intake", "Oil + filter"],
      ["Brake job", "BKK9988", "Mohd Faiz", "910912145222", "in_progress", "Front pads"],
      ["Spark plugs", "V1234", "Raj Kumar", "870101145999", "done", ""],
      ["AC check", "JHH5566", "Hafiz Abdullah", "850909145999", "intake", "Not cold"],
    ]);
    writeCsv(dir, "job-lines.csv", ["job_title", "plate", "kind", "description", "amount"], [
      ["Service 10k", "WXY1234", "parts", "Engine Oil 4L", 120],
      ["Service 10k", "WXY1234", "parts", "Oil Filter", 25],
      ["Service 10k", "WXY1234", "labour", "Oil change labour", 40],
      ["Brake job", "BKK9988", "parts", "Brake Pad Set", 180],
      ["Brake job", "BKK9988", "labour", "Brake replace", 80],
      ["Spark plugs", "V1234", "parts", "Spark Plug x4", 72],
      ["Spark plugs", "V1234", "labour", "Replace plugs", 50],
    ]);
  },

  gym() {
    const dir = path.join(ROOT, "gym");
    writeCustomers(dir);
    writeCsv(dir, "memberships.csv", ["customer_name", "customer_ic", "customer_phone", "plan_name", "starts_on", "ends_on", "status"], [
      ["Lim Wei Jie", "950315145678", "01122334455", "Monthly", "2026-07-01", "2026-07-31", "active"],
      ["Tan Mei Ling", "930505145111", "0161122334", "Quarterly", "2026-06-01", "2026-08-31", "active"],
      ["Chong Kah Wai", "960201145333", "0127788990", "Annual", "2026-01-01", "2026-12-31", "active"],
      ["Jessica Ng", "950430145202", "0168899001", "Monthly", "2026-07-15", "2026-08-14", "active"],
      ["Daniel Teo", "940825145505", "0172122334", "PT Pack 10", "2026-07-01", "2026-09-30", "active"],
      ["Farah Zainal", "970818145666", "0136677889", "Monthly", "2026-05-01", "2026-05-31", "expired"],
    ]);
    writeCsv(dir, "checkins.csv", ["customer_name", "customer_ic", "checked_in_at"], [
      ["Lim Wei Jie", "950315145678", "2026-07-28 07:15"],
      ["Tan Mei Ling", "930505145111", "2026-07-30 08:00"],
      ["Chong Kah Wai", "960201145333", "2026-07-30 18:30"],
      ["Jessica Ng", "950430145202", "2026-07-29 19:00"],
      ["Daniel Teo", "940825145505", "2026-07-29 17:45"],
      ["Lim Wei Jie", "950315145678", "2026-07-28 18:00"],
    ]);
    writeCsv(dir, "classes.csv", ["name", "teacher_name", "weekday", "start_time", "end_time", "room", "fee"], [
      ["HIIT", "Coach Amir", 1, "07:00", "07:45", "Studio A", 0],
      ["Yoga", "Coach Mei", 2, "18:00", "19:00", "Studio B", 0],
      ["Spin", "Coach Raj", 3, "19:00", "19:45", "Bike Room", 0],
      ["PT Bootcamp", "Coach Faiz", 6, "09:00", "10:00", "Outdoor", 30],
    ]);
  },

  vet() {
    const dir = path.join(ROOT, "vet");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Pet food", ""], ["Medicine", ""], ["Accessories", ""]],
      [
        productRow("Dog Food 3kg", "VET-DF", "9562000000001", "Pet food", 65, 35, 40),
        productRow("Cat Food 1.5kg", "VET-CF", "9562000000002", "Pet food", 42, 22, 35),
        productRow("Flea Drop", "VET-FL", "9562000000003", "Medicine", 55, 25, 30),
        productRow("Pet Shampoo", "VET-SH", "9562000000004", "Accessories", 28, 12, 25),
      ],
      null,
      [
        pastSale("VET-001", "2026-06-10", 0, "Dog Food 3kg", "VET-DF", "9562000000001", 1, 65),
        pastSale("VET-002", "2026-07-01", 5, "Cat Food 1.5kg", "VET-CF", "9562000000002", 2, 42, "card"),
      ]
    );
    writeServices(
      dir,
      [["Consult", "Vet consult"], ["Vaccination", "Pet vaccines"], ["Grooming", "Groom"], ["Surgery", "Ops"]],
      [
        ["Vet consult", "Consult", 60, ""],
        ["Rabies vaccine", "Vaccination", 45, ""],
        ["5-in-1 vaccine", "Vaccination", 80, ""],
        ["Basic groom", "Grooming", 50, ""],
        ["Spay / neuter", "Surgery", 350, ""],
      ],
      [
        appt(0, "Consult", "2026-08-04 10:00", "2026-08-04 10:30", "scheduled", "Buddy checkup"),
        appt(5, "Vaccination", "2026-08-05 11:00", "2026-08-05 11:20"),
        appt(8, "Grooming", "2026-08-06 14:00", "2026-08-06 15:00"),
      ]
    );
    writeCsv(dir, "pets.csv", ["owner_name", "owner_ic", "owner_phone", "name", "species", "breed", "notes"], [
      ["Ahmad bin Ali", "900101145678", "0123456789", "Buddy", "dog", "Mongrel", "Friendly"],
      ["Tan Mei Ling", "930505145111", "0161122334", "Mimi", "cat", "Persian", "Indoor"],
      ["Aisyah Rahman", "940707145444", "0115566778", "Rocky", "dog", "Poodle", ""],
      ["Lee Jun Hao", "980101145777", "0178899001", "Neko", "cat", "Domestic", "Kitten"],
      ["Daniel Teo", "940825145505", "0172122334", "Max", "dog", "Golden Retriever", ""],
    ]);
    writeCsv(dir, "pet-vaccinations.csv", ["pet_name", "owner_ic", "vaccine_name", "given_on", "due_on"], [
      ["Buddy", "900101145678", "Rabies", "2026-01-15", "2027-01-15"],
      ["Buddy", "900101145678", "5-in-1", "2026-01-15", "2027-01-15"],
      ["Mimi", "930505145111", "Cat 3-in-1", "2026-03-01", "2027-03-01"],
      ["Rocky", "940707145444", "Rabies", "2025-12-10", "2026-12-10"],
      ["Max", "940825145505", "Rabies", "2026-02-20", "2027-02-20"],
    ]);
  },

  fashion() {
    const dir = path.join(ROOT, "fashion");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Apparel", ""], ["Tops", "Apparel"], ["Bottoms", "Apparel"], ["Accessories", ""]],
      [
        productRow("Tee Basic", "FAS-TEE", "9563000000001", "Tops", 49, 20, 0, "Variants by size/color"),
        productRow("Jeans Slim", "FAS-JNS", "9563000000002", "Bottoms", 129, 55, 0),
        productRow("Cap Logo", "FAS-CAP", "9563000000003", "Accessories", 39, 15, 40),
        productRow("Hoodie Zip", "FAS-HD", "9563000000004", "Tops", 159, 70, 0),
      ],
      DEFAULT_SUPPLIERS.slice(0, 6),
      [
        pastSale("FAS-001", "2026-06-20", 17, "Cap Logo", "FAS-CAP", "9563000000003", 1, 39),
        pastSale("FAS-002", "2026-07-05", 5, "Tee Basic", "FAS-TEE", "9563000000001", 1, 49, "card"),
      ]
    );
    writeCsv(dir, "variants.csv", ["product_name", "sku", "size", "color", "variant_sku", "barcode", "quantity"], [
      ["Tee Basic", "FAS-TEE", "M", "Black", "FAS-TEE-M-BK", "9563000000101", 20],
      ["Tee Basic", "FAS-TEE", "L", "Black", "FAS-TEE-L-BK", "9563000000102", 18],
      ["Tee Basic", "FAS-TEE", "M", "White", "FAS-TEE-M-WH", "9563000000103", 15],
      ["Jeans Slim", "FAS-JNS", "30", "Indigo", "FAS-JNS-30", "9563000000201", 12],
      ["Jeans Slim", "FAS-JNS", "32", "Indigo", "FAS-JNS-32", "9563000000202", 10],
      ["Hoodie Zip", "FAS-HD", "M", "Grey", "FAS-HD-M-GY", "9563000000301", 8],
      ["Hoodie Zip", "FAS-HD", "L", "Grey", "FAS-HD-L-GY", "9563000000302", 6],
    ]);
  },

  electronics() {
    const dir = path.join(ROOT, "electronics");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Devices", ""], ["Phones", "Devices"], ["Accessories", ""], ["Audio", "Accessories"]],
      [
        productRow("Phone X128", "EL-PH1", "9564000000001", "Phones", 1299, 950, 8),
        productRow("Phone Y64", "EL-PH2", "9564000000002", "Phones", 899, 650, 10),
        productRow("Earbuds Pro", "EL-EB", "9564000000003", "Audio", 199, 90, 25),
        productRow("USB-C Hub", "EL-HUB", "9564000000004", "Accessories", 89, 40, 30),
        productRow("Power Bank 20k", "EL-PB", "9564000000005", "Accessories", 129, 60, 20),
      ],
      DEFAULT_SUPPLIERS.slice(0, 8),
      [
        pastSale("EL-001", "2026-05-22", 2, "Earbuds Pro", "EL-EB", "9564000000003", 1, 199, "card"),
        pastSale("EL-002", "2026-06-30", 19, "USB-C Hub", "EL-HUB", "9564000000004", 1, 89),
        pastSale("EL-003", "2026-07-18", 7, "Power Bank 20k", "EL-PB", "9564000000005", 1, 129, "ewallet"),
      ]
    );
    writeCsv(dir, "serials.csv", ["product_name", "sku", "serial_number", "status"], [
      ["Phone X128", "EL-PH1", "SN-X128-0001", "in_stock"],
      ["Phone X128", "EL-PH1", "SN-X128-0002", "in_stock"],
      ["Phone X128", "EL-PH1", "SN-X128-0003", "sold"],
      ["Phone Y64", "EL-PH2", "SN-Y64-0001", "in_stock"],
      ["Phone Y64", "EL-PH2", "SN-Y64-0002", "in_stock"],
      ["Earbuds Pro", "EL-EB", "SN-EB-1001", "in_stock"],
      ["Earbuds Pro", "EL-EB", "SN-EB-1002", "sold"],
    ]);
  },

  wholesale() {
    const dir = path.join(ROOT, "wholesale");
    writeCustomers(dir, { 4: "Corporate account", 9: "Wholesale buyer", 13: "Monthly account" });
    writeRetailCatalog(
      dir,
      [["Bulk groceries", ""], ["Beverages", "Bulk groceries"], ["Dry goods", "Bulk groceries"], ["Packaging", ""]],
      [
        productRow("Rice 10kg", "WH-RICE", "9565000000001", "Dry goods", 42, 28, 200),
        productRow("Cooking Oil 5L", "WH-OIL", "9565000000002", "Dry goods", 38, 25, 150),
        productRow("Mineral Water Carton", "WH-WAT", "9565000000003", "Beverages", 18, 12, 300),
        productRow("Carton Box M", "WH-BOX", "9565000000004", "Packaging", 2.5, 1, 500),
        productRow("Sugar 1kg x20", "WH-SUG", "9565000000005", "Dry goods", 55, 38, 80),
      ],
      DEFAULT_SUPPLIERS,
      [
        pastSale("WH-001", "2026-04-01", 9, "Rice 10kg", "WH-RICE", "9565000000001", 10, 42, "transfer", "Wholesale"),
        pastSale("WH-002", "2026-05-15", 4, "Mineral Water Carton", "WH-WAT", "9565000000003", 20, 18, "transfer"),
        pastSale("WH-003", "2026-07-01", 13, "Cooking Oil 5L", "WH-OIL", "9565000000002", 8, 38, "transfer"),
      ]
    );
    writeCsv(dir, "price-tiers.csv", ["name", "discount_percent"], [
      ["Retail", 0],
      ["Silver", 5],
      ["Gold", 10],
      ["Platinum", 15],
      ["Distributor", 20],
    ]);
  },

  laundry() {
    const dir = path.join(ROOT, "laundry");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Services retail", ""], ["Detergent", "Services retail"], ["Bags", "Services retail"]],
      [
        productRow("Detergent Refill", "LAU-DET", "9566000000001", "Detergent", 12, 5, 60),
        productRow("Laundry Bag", "LAU-BAG", "9566000000002", "Bags", 8, 3, 40),
        productRow("Fabric Softener", "LAU-SOFT", "9566000000003", "Detergent", 15, 6, 35),
      ],
      null,
      [
        pastSale("LAU-001", "2026-06-12", 1, "Detergent Refill", "LAU-DET", "9566000000001", 1, 12),
        pastSale("LAU-002", "2026-07-03", 8, "Laundry Bag", "LAU-BAG", "9566000000002", 2, 8, "ewallet"),
      ]
    );
    writeCsv(dir, "tickets.csv", ["ticket_number", "customer_name", "customer_ic", "customer_phone", "status", "item_count", "notes"], [
      ["T-1001", "Siti Aminah", "880202085432", "0198765432", "received", 8, "Express"],
      ["T-1002", "Aisyah Rahman", "940707145444", "0115566778", "washing", 12, ""],
      ["T-1003", "Wong Siew Lan", "880612145000", "0195566778", "ready", 5, "No softener"],
      ["T-1004", "Jessica Ng", "950430145202", "0168899001", "delivered", 3, ""],
      ["T-1005", "Farah Zainal", "970818145666", "0136677889", "received", 10, "Hotel linens"],
      ["T-1006", "Priya Devi", "920414145888", "0164455667", "washing", 6, ""],
    ]);
  },

  physio() {
    const dir = path.join(ROOT, "physio");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Therapy aids", ""], ["Supports", "Therapy aids"]],
      [
        productRow("Knee Support", "PHY-KNEE", "9567000000001", "Supports", 45, 20, 25),
        productRow("Resistance Band", "PHY-BAND", "9567000000002", "Therapy aids", 25, 10, 40),
        productRow("Hot Pack", "PHY-HOT", "9567000000003", "Therapy aids", 18, 7, 30),
      ],
      null,
      null
    );
    writeServices(
      dir,
      [["Assessment", "Initial"], ["Therapy", "Session"], ["Rehab", "Rehab plan"]],
      [
        ["Initial assessment", "Assessment", 100, ""],
        ["Therapy 30 min", "Therapy", 80, ""],
        ["Therapy 60 min", "Therapy", 140, ""],
        ["Rehab follow-up", "Rehab", 90, ""],
      ],
      [
        appt(0, "Assessment", "2026-08-04 09:00", "2026-08-04 09:45"),
        appt(1, "Therapy", "2026-08-04 10:00", "2026-08-04 10:30"),
        appt(9, "Therapy", "2026-08-05 11:00", "2026-08-05 12:00"),
        appt(14, "Rehab", "2026-08-06 15:00", "2026-08-06 15:45"),
      ]
    );
    writeCsv(dir, "session-packages.csv", ["customer_name", "customer_ic", "customer_phone", "name", "total_sessions", "used_sessions"], [
      ["Ahmad bin Ali", "900101145678", "0123456789", "Back pain 10x", 10, 3],
      ["Siti Aminah", "880202085432", "0198765432", "Knee rehab 8x", 8, 2],
      ["Gurpreet Singh", "890303145555", "0142233445", "Sports 12x", 12, 5],
      ["Wong Siew Lan", "880612145000", "0195566778", "Shoulder 6x", 6, 1],
    ]);
  },

  lab() {
    const dir = path.join(ROOT, "lab");
    writeCustomers(dir);
    writeServices(
      dir,
      [["Blood", "Blood tests"], ["Urine", "Urinalysis"], ["Imaging ref", "External imaging"]],
      [
        ["FBC", "Blood", 35, "Full blood count"],
        ["Lipid profile", "Blood", 55, ""],
        ["HbA1c", "Blood", 45, ""],
        ["Urine FEME", "Urine", 25, ""],
        ["Referral ultrasound", "Imaging ref", 20, "Admin fee"],
      ],
      [
        appt(0, "Blood", "2026-08-04 08:00", "2026-08-04 08:20", "scheduled", "Fasting"),
        appt(9, "Blood", "2026-08-04 08:30", "2026-08-04 08:50", "scheduled", "Fasting"),
        appt(1, "Urine", "2026-08-05 09:00", "2026-08-05 09:15"),
      ]
    );
    writeCsv(dir, "lab-results.csv", ["customer_name", "customer_ic", "customer_phone", "test_name", "status", "result_summary"], [
      ["Ahmad bin Ali", "900101145678", "0123456789", "FBC", "ready", "Within normal limits"],
      ["Gurpreet Singh", "890303145555", "0142233445", "Lipid profile", "ready", "LDL slightly high"],
      ["Siti Aminah", "880202085432", "0198765432", "Urine FEME", "pending", ""],
      ["Jessica Ng", "950430145202", "0168899001", "HbA1c", "ready", "6.2%"],
      ["Hafiz Abdullah", "850909145999", "0123344556", "FBC", "pending", ""],
    ]);
  },

  fnb() {
    const dir = path.join(ROOT, "fnb");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Menu", ""], ["Mains", "Menu"], ["Drinks", "Menu"], ["Sides", "Menu"]],
      [
        productRow("Nasi Lemak", "FNB-NL", "9568000000001", "Mains", 8.5, 3, 999, "Kitchen item"),
        productRow("Chicken Chop", "FNB-CC", "9568000000002", "Mains", 16, 7, 999),
        productRow("Teh Tarik", "FNB-TT", "9568000000003", "Drinks", 3, 0.8, 999),
        productRow("Iced Lemon Tea", "FNB-ILT", "9568000000004", "Drinks", 4.5, 1.2, 999),
        productRow("French Fries", "FNB-FF", "9568000000005", "Sides", 6, 2, 999),
        productRow("Roti Canai", "FNB-RC", "9568000000006", "Mains", 2.5, 0.8, 999),
      ],
      DEFAULT_SUPPLIERS.slice(0, 8),
      [
        pastSale("FNB-001", "2026-07-20", 0, "Nasi Lemak", "FNB-NL", "9568000000001", 2, 8.5),
        pastSale("FNB-001", "2026-07-20", 0, "Teh Tarik", "FNB-TT", "9568000000003", 2, 3),
        pastSale("FNB-002", "2026-07-21", 19, "Chicken Chop", "FNB-CC", "9568000000002", 1, 16, "card"),
        pastSale("FNB-002", "2026-07-21", 19, "Iced Lemon Tea", "FNB-ILT", "9568000000004", 1, 4.5, "card"),
      ]
    );
    writeCsv(dir, "dining-tables.csv", ["name", "seats", "status"], [
      ["T1", 2, "free"], ["T2", 2, "occupied"], ["T3", 4, "free"], ["T4", 4, "occupied"],
      ["T5", 4, "free"], ["T6", 6, "free"], ["T7", 6, "reserved"], ["T8", 8, "free"],
      ["Bar1", 1, "free"], ["Bar2", 1, "free"],
    ]);
  },

  hotel() {
    const dir = path.join(ROOT, "hotel");
    writeCustomers(dir);
    writeCsv(dir, "rooms.csv", ["room_number", "room_type", "status", "rate"], [
      ["101", "standard", "vacant", 150],
      ["102", "standard", "occupied", 150],
      ["103", "standard", "vacant", 150],
      ["201", "deluxe", "vacant", 220],
      ["202", "deluxe", "occupied", 220],
      ["203", "deluxe", "cleaning", 220],
      ["301", "suite", "vacant", 380],
      ["302", "suite", "reserved", 380],
      ["401", "family", "vacant", 280],
      ["402", "family", "occupied", 280],
    ]);
  },

  property() {
    const dir = path.join(ROOT, "property");
    writeCustomers(dir);
    writeCsv(dir, "listings.csv", ["title", "status", "notes"], [
      ["Condo SS15 3R2B", "available", "Fully furnished"],
      ["Terrace Puchong", "available", "Near MRT"],
      ["Shop lot Subang", "reserved", "Ground floor"],
      ["Apartment Cheras", "available", "High floor"],
      ["Bungalow PJ", "sold", "Closed Jul 2026"],
      ["Studio Cyberjaya", "available", "Student area"],
      ["Factory Klang", "available", "1 acre land"],
      ["Office Bangsar", "available", "Ready office"],
    ]);
  },

  courier() {
    const dir = path.join(ROOT, "courier");
    writeCustomers(dir);
    writeCsv(dir, "shipments.csv", ["tracking_no", "status", "notes"], [
      ["AVC2607001", "created", "Kajang → PJ"],
      ["AVC2607002", "picked_up", "Documents"],
      ["AVC2607003", "in_transit", "Fragile"],
      ["AVC2607004", "out_for_delivery", "COD"],
      ["AVC2607005", "delivered", "Signed by receiver"],
      ["AVC2607006", "created", "Same-day"],
      ["AVC2607007", "in_transit", "East Malaysia"],
      ["AVC2607008", "returned", "Address incomplete"],
    ]);
  },

  contractor() {
    const dir = path.join(ROOT, "contractor");
    writeCustomers(dir);
    writeCsv(dir, "projects.csv", ["name", "status", "claim_amount"], [
      ["Renovation SS15 shop", "active", 45000],
      ["House extension Kajang", "active", 82000],
      ["Office fit-out Bangsar", "completed", 120000],
      ["Waterproofing condo", "active", 18000],
      ["School hall paint", "quoted", 25000],
      ["Factory floor epoxy", "active", 60000],
    ]);
  },

  manufacturing() {
    const dir = path.join(ROOT, "manufacturing");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Raw materials", ""], ["Finished goods", ""]],
      [
        productRow("Steel Sheet A", "MFG-ST", "9569000000001", "Raw materials", 0, 40, 500, "Cost tracked"),
        productRow("Plastic Resin", "MFG-RS", "9569000000002", "Raw materials", 0, 12, 800),
        productRow("Widget Pro", "MFG-WP", "9569000000003", "Finished goods", 85, 45, 120),
        productRow("Widget Lite", "MFG-WL", "9569000000004", "Finished goods", 55, 28, 200),
      ],
      DEFAULT_SUPPLIERS.slice(0, 6),
      [
        pastSale("MFG-001", "2026-06-01", 4, "Widget Pro", "MFG-WP", "9569000000003", 20, 85, "transfer"),
        pastSale("MFG-002", "2026-07-10", 9, "Widget Lite", "MFG-WL", "9569000000004", 50, 55, "transfer"),
      ]
    );
    writeCsv(dir, "work-orders.csv", ["name", "status", "notes"], [
      ["WO-2401 Widget Pro batch", "planned", "Qty 100"],
      ["WO-2402 Widget Lite", "in_progress", "Qty 200"],
      ["WO-2403 Custom bracket", "planned", "Client Raj"],
      ["WO-2404 Resin mould A", "done", ""],
      ["WO-2405 Steel cut run", "in_progress", ""],
    ]);
  },

  legal() {
    const dir = path.join(ROOT, "legal");
    writeCustomers(dir);
    writeCsv(dir, "matters.csv", ["title", "status", "notes"], [
      ["Sale & purchase — SS15 condo", "open", "SPA drafting"],
      ["Employment dispute — Faiz", "open", "Letter of demand"],
      ["Company incorporation — Teo Sdn Bhd", "closed", "Completed"],
      ["Tenancy agreement — Bangsar", "open", ""],
      ["Will drafting — Wong", "open", "Pending docs"],
      ["Debt recovery — Kumar", "open", "Stage 1"],
      ["Trademark filing — Snack World", "closed", ""],
    ]);
  },

  events() {
    const dir = path.join(ROOT, "events");
    writeCustomers(dir);
    writeCsv(dir, "events.csv", ["title", "event_date", "status"], [
      ["Wedding — Ng & Lim", "2026-09-12", "planning"],
      ["Corporate dinner — Raj Corp", "2026-08-20", "confirmed"],
      ["Birthday — Sofea 21st", "2026-08-30", "planning"],
      ["Product launch — Fashion Co", "2026-10-05", "planning"],
      ["Open house Raya", "2026-04-15", "done"],
      ["Seminar — Legal update", "2026-09-01", "confirmed"],
    ]);
  },

  farm() {
    const dir = path.join(ROOT, "farm");
    writeCustomers(dir);
    writeRetailCatalog(
      dir,
      [["Produce", ""], ["Inputs", ""], ["Tools", ""]],
      [
        productRow("Fertilizer 25kg", "FRM-FER", "9570000000001", "Inputs", 55, 35, 80),
        productRow("Pesticide 1L", "FRM-PES", "9570000000002", "Inputs", 40, 22, 40),
        productRow("Fresh Eggs Tray", "FRM-EGG", "9570000000003", "Produce", 14, 8, 60),
        productRow("Leafy Greens Bundle", "FRM-GRN", "9570000000004", "Produce", 5, 2, 100),
        productRow("Hoe", "FRM-HOE", "9570000000005", "Tools", 35, 15, 20),
      ],
      DEFAULT_SUPPLIERS.slice(0, 5),
      [
        pastSale("FRM-001", "2026-07-05", 0, "Fresh Eggs Tray", "FRM-EGG", "9570000000003", 3, 14),
        pastSale("FRM-002", "2026-07-18", 10, "Leafy Greens Bundle", "FRM-GRN", "9570000000004", 5, 5, "ewallet"),
      ]
    );
    writeCsv(dir, "plots.csv", ["name", "crop", "status"], [
      ["Plot A North", "Chili", "growing"],
      ["Plot A South", "Leafy greens", "growing"],
      ["Plot B", "Corn", "idle"],
      ["Plot C Greenhouse", "Tomato", "growing"],
      ["Plot D", "Durian sapling", "idle"],
      ["Pond 1", "Tilapia", "growing"],
    ]);
  },
};

function writeRootReadme() {
  const niches = Object.keys(generators).sort();
  const lines = [
    "# Allvisor demo data (by niche)",
    "",
    "Each folder under `demo-data/<niche>/` has sample CSVs for that business type.",
    "",
    "## Admin import (supported today)",
    "Import in **Admin → Data import**. Order:",
    "1. `customers.csv`",
    "2. `product-categories.csv` (if present)",
    "3. `products.csv`",
    "4. `suppliers.csv` (POS niches with logistics)",
    "5. `past-sales.csv`",
    "6. `service-categories.csv` → `service-items.csv` → `appointments.csv` (care niches)",
    "",
    "Headers match Admin templates in `src/lib/data-import.ts`.",
    "",
    "## Niche-only CSVs",
    "Files such as `subjects.csv`, `pets.csv`, `rooms.csv`, `job-cards.csv` match table columns for manual seed / future import — they are **not** wired to Admin CSV import yet.",
    "",
    "## Niches",
    "",
  ];
  for (const n of niches) {
    const files = fs.readdirSync(path.join(ROOT, n)).filter((f) => f.endsWith(".csv")).sort();
    lines.push(`### \`${n}/\``);
    lines.push(files.map((f) => `- \`${f}\``).join("\n"));
    lines.push("");
  }
  lines.push("## Regenerate");
  lines.push("```bash");
  lines.push("node scripts/generate-demo-data.cjs");
  lines.push("```");
  lines.push("");
  lines.push("## Notes");
  lines.push("- Retail barcode `8717` = Tali Nylon (POS scan test)");
  lines.push("- Run `019_retail_ops.sql` before product category / supplier imports");
  lines.push("- Dates use 2026 for demo appointments / sales");
  lines.push("");
  fs.writeFileSync(path.join(ROOT, "README.md"), lines.join("\n"), "utf8");
}

function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  // Remove old flat demo CSVs at root
  for (const f of fs.readdirSync(ROOT)) {
    if (f.startsWith("demo-") && f.endsWith(".csv")) {
      fs.unlinkSync(path.join(ROOT, f));
    }
  }
  for (const [name, fn] of Object.entries(generators)) {
    fn();
    console.log("wrote", name);
  }
  writeRootReadme();
  console.log("done —", Object.keys(generators).length, "niches");
}

main();
