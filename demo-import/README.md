# Allvisor demo import files

Folder ni untuk test feature **Import old data from other software**.

## Cara test (ikut order ni)

1. Unlock **Admin**
2. Scroll ke **Import data lama dari software lain**
3. Import ikut susunan:

| Order | File | Jenis data |
|------:|------|------------|
| 1 | `01-patients.csv` | Patients / customers |
| 2 | `02-service-categories.csv` | Service categories |
| 3 | `03-service-items.csv` | Service items |
| 4 | `04-products.csv` | Inventory / products |
| 5 | `05-appointments.csv` | Appointments |

Untuk setiap fail: pilih jenis data → **Choose CSV / Excel file** → pastikan preview ok → **Import into Allvisor**.

## Nota

- Appointments match pesakit ikut **IC** (paling reliable), jadi import patients dulu.
- Service items match kategori ikut **nama kategori** yang sama dengan `02-service-categories.csv`.
- Ada 10 patients, 6 categories, 10 services, 10 products, 10 appointments.
