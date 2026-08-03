# Allvisor demo CSV files (20 rows each)

## Retail — import order in Admin
1. `demo-customers.csv` → Data type: **Customers**
2. `demo-product-categories.csv` → **Product categories** (parents first; subcategories use `parent`)
3. `demo-products.csv` → **Inventory / products** (category names must match step 2)
4. `demo-suppliers.csv` → **Suppliers**

## Clinic — full import set
1. `demo-customers.csv` → Patients / customers
2. `demo-service-categories.csv` → Service categories
3. `demo-service-items.csv` → Service items
4. `demo-products.csv` → Inventory / products (optional; category column needs product categories if used)
5. `demo-appointments.csv` → Appointments (patients must exist)

## Notes
- Product barcodes like `8717` are for POS scan testing.
- `price_on_sale=yes` on Custom cable cut = set price at POS.
- Run migration `019_retail_ops.sql` before importing product categories / suppliers / retail product fields.
