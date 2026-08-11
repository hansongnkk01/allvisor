# Allvisor scope constraints (post niche critique)

These limits keep the product useful for Malaysian SME floor staff. Do not expand past them without a deliberate product decision.

## Ship now (done / in progress)

- Shared primitives: status pipeline board, invoice-from-entity, deposit invoice flag, WhatsApp copy/open, POS discount/void reason audit
- Tier-1 risk: pharmacy batches FEFO + Rx attach + controlled register; electronics serial lifecycle + POS capture; courier COD/POD board; retail discount audit
- Tier-2 workflow: workshop job board, optical lab board, laundry board, physio/salon session packages, salon commission entries
- Tier-3 care: clinic queue + clinical notes + MC letters; vet vaccinations; lab TAT board; tuition term fees; gym memberships renew/freeze + PT sessions
- Hotel resthouse MVP: room status + check-in/out + deposit/folio invoice (not a full PMS)
- Wholesale invoice-first nav + customer price tiers + MOQ on POS

## Explicitly rejected until boards + billing glue are solid

- Patient / member / parent portals
- Teleconsult / video link productisation
- Full kitchen display system (KDS) and drag-drop floor map editors
- OTA / channel manager for hotels
- National e-prescription network integrations
- RFID / manufacturer serial validation services
- AI clinical note coding / LLM note writing as a dependency
- Full property management (tenancy portfolio) beyond agency listings
- Full manufacturing MRP / machine routing
- Legal trust / client account ledger
- Farm livestock module inside the plots niche

## Daily Close rule

Max **3–5** money/risk checklist items. Do not turn Daily Close into a compliance exam.

## Design rule

Prefer one status board + Create invoice + WhatsApp over new owner KPI cards.
