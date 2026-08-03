# Allvisor demo CSV files (20 rows each)

## Retail — import order in Admin
1. `demo-customers.csv` → **Customers**
2. `demo-product-categories.csv` → **Product categories**
3. `demo-products.csv` → **Inventory / products**
4. `demo-suppliers.csv` → **Suppliers**
5. `demo-past-sales.csv` → **Past sales / receipts** (fills customer History)

## Past sales CSV format
One row = one line item. Same `invoice_number` groups into one receipt.
Match customer by IC / phone / name. Match product by barcode / SKU / name.
**Does not reduce stock** (historical import only).

After import, open **Customers → History** (e.g. Daniel Teo) to see past purchases.

## Clinic
1. customers → service categories → service items → products → appointments

## Notes
- Barcode `8717` = Tali Nylon for POS scan tests
- Run `019_retail_ops.sql` before retail category/supplier/product field imports
