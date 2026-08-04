# Allvisor demo data (by niche)

Each folder under `demo-data/<niche>/` has sample CSVs for that business type.

## Admin import (supported today)
Import in **Admin → Data import**. Order:
1. `customers.csv`
2. `product-categories.csv` (if present)
3. `products.csv`
4. `suppliers.csv` (POS niches with logistics)
5. `past-sales.csv`
6. `service-categories.csv` → `service-items.csv` → `appointments.csv` (care niches)

Headers match Admin templates in `src/lib/data-import.ts`.

## Niche-only CSVs
Files such as `subjects.csv`, `pets.csv`, `rooms.csv`, `job-cards.csv` match table columns for manual seed / future import — they are **not** wired to Admin CSV import yet.

## Niches

### `clinic/`
- `appointments.csv`
- `customers.csv`
- `product-categories.csv`
- `products.csv`
- `service-categories.csv`
- `service-items.csv`

### `contractor/`
- `customers.csv`
- `projects.csv`

### `courier/`
- `customers.csv`
- `shipments.csv`

### `electronics/`
- `customers.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `serials.csv`
- `suppliers.csv`

### `events/`
- `customers.csv`
- `events.csv`

### `farm/`
- `customers.csv`
- `past-sales.csv`
- `plots.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`

### `fashion/`
- `customers.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`
- `variants.csv`

### `fnb/`
- `customers.csv`
- `dining-tables.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`

### `gym/`
- `checkins.csv`
- `classes.csv`
- `customers.csv`
- `memberships.csv`

### `hotel/`
- `customers.csv`
- `rooms.csv`

### `lab/`
- `appointments.csv`
- `customers.csv`
- `lab-results.csv`
- `service-categories.csv`
- `service-items.csv`

### `laundry/`
- `customers.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `tickets.csv`

### `legal/`
- `customers.csv`
- `matters.csv`

### `manufacturing/`
- `customers.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`
- `work-orders.csv`

### `optical/`
- `appointments.csv`
- `customers.csv`
- `eye-prescriptions.csv`
- `lab-orders.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `service-categories.csv`
- `service-items.csv`
- `suppliers.csv`

### `pharmacy/`
- `batches.csv`
- `customers.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`

### `physio/`
- `appointments.csv`
- `customers.csv`
- `product-categories.csv`
- `products.csv`
- `service-categories.csv`
- `service-items.csv`
- `session-packages.csv`

### `property/`
- `customers.csv`
- `listings.csv`

### `retail/`
- `customers.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`

### `salon/`
- `appointments.csv`
- `commission-rules.csv`
- `customers.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `service-categories.csv`
- `service-items.csv`
- `suppliers.csv`

### `tuition/`
- `assessments.csv`
- `attendance.csv`
- `class-enrollments.csv`
- `classes.csv`
- `customers.csv`
- `subject-enrollments.csv`
- `subjects.csv`

### `vet/`
- `appointments.csv`
- `customers.csv`
- `past-sales.csv`
- `pet-vaccinations.csv`
- `pets.csv`
- `product-categories.csv`
- `products.csv`
- `service-categories.csv`
- `service-items.csv`

### `wholesale/`
- `customers.csv`
- `past-sales.csv`
- `price-tiers.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`

### `workshop/`
- `customers.csv`
- `job-cards.csv`
- `job-lines.csv`
- `past-sales.csv`
- `product-categories.csv`
- `products.csv`
- `suppliers.csv`
- `vehicles.csv`

## Regenerate
```bash
node scripts/generate-demo-data.cjs
```

## Notes
- Retail barcode `8717` = Tali Nylon (POS scan test)
- Run `019_retail_ops.sql` before product category / supplier imports
- Dates use 2026 for demo appointments / sales
