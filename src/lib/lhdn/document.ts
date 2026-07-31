import type { LhdnInvoicePayload } from "./types";
import { normalizeTin } from "./tin";

function money(amount: number, currency = "MYR") {
  return [{ _: Number(amount.toFixed(2)), currencyID: currency }];
}

function text(value: string) {
  return [{ _: value }];
}

function idScheme(value: string, schemeID: string) {
  return [{ ID: [{ _: value, schemeID }] }];
}

/**
 * Build MyInvois UBL 2.1 Invoice JSON (document type version 1.0 — no digital signature).
 * Structure aligned with official SDK sample:
 * https://sdk.myinvois.hasil.gov.my/files/sdksamples/1.0-Invoice-Sample.json
 */
export function buildMyInvoisInvoiceDocument(payload: LhdnInvoicePayload) {
  const currency = "MYR";
  const taxAmount = Number(payload.taxAmount || 0);
  const total = Number(payload.total || 0);
  const lineSum = payload.lines.reduce((s, l) => s + Number(l.lineTotal || 0), 0);
  const taxExclusive = Number((total - taxAmount).toFixed(2));
  const taxableBase = lineSum > 0 ? lineSum : taxExclusive;
  const now = new Date();
  const issueTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}Z`;

  const supplierIdValue = (payload.supplierBrn || "").replace(/\s+/g, "").trim();
  const supplierTin = normalizeTin(payload.supplierTin);
  const isIndividualTin = supplierTin.startsWith("IG");
  // IG sole prop: MyInvois uses NRIC (often same as profile ID Number), not BRN "NA".
  const supplierIdScheme = isIndividualTin ? "NRIC" : "BRN";
  const supplierId =
    supplierIdValue && supplierIdValue.toUpperCase() !== "NA"
      ? supplierIdValue
      : isIndividualTin
        ? ""
        : "NA";
  const supplierSst = (payload.supplierSst || "NA").trim() || "NA";
  const supplierPhone = (payload.supplierPhone || "+60000000000").replace(/\s/g, "");
  const supplierAddress = (payload.supplierAddress || "Malaysia").trim();
  const supplierCity = (payload.supplierCity || "Kota Kinabalu").trim();
  const supplierPostcode = (payload.supplierPostcode || "88000").trim();
  const supplierState = (payload.supplierStateCode || "12").trim(); // 12 = Sabah
  const msic = (payload.supplierMsic || process.env.LHDN_MSIC || "86201").trim();
  const msicName =
    (payload.supplierMsicName || process.env.LHDN_MSIC_NAME || "Medical and dental practice activities").trim();

  // General public / walk-in buyer without TIN (LHDN general TIN)
  const buyerTin = (payload.buyerTin || "EI00000000010").trim();
  const buyerBrn = (payload.buyerBrn || "NA").trim() || "NA";
  const buyerAddress = (payload.buyerAddress || supplierAddress).trim();
  const buyerCity = (payload.buyerCity || supplierCity).trim();
  const buyerPostcode = (payload.buyerPostcode || supplierPostcode).trim();
  const buyerState = (payload.buyerStateCode || supplierState).trim();
  const classification = (payload.itemClassification || "022").trim(); // 022 = healthcare services (CLASS)

  const taxCategoryId = taxAmount > 0 ? "02" : "06"; // 02 Service Tax / 06 Not Applicable

  const invoiceLines = payload.lines.map((line, index) => {
    const qty = Number(line.quantity) || 1;
    const lineTotal = Number(line.lineTotal) || 0;
    const unitPrice = Number(line.unitPrice) || lineTotal / qty;
    const lineTax = 0;
    return {
      ID: text(String(index + 1)),
      InvoicedQuantity: [{ _: qty, unitCode: "C62" }],
      LineExtensionAmount: money(lineTotal, currency),
      TaxTotal: [
        {
          TaxAmount: money(lineTax, currency),
          TaxSubtotal: [
            {
              TaxableAmount: money(lineTotal, currency),
              TaxAmount: money(lineTax, currency),
              TaxCategory: [
                {
                  ID: text(taxCategoryId),
                  TaxScheme: [
                    {
                      ID: [
                        {
                          _: "OTH",
                          schemeID: "UN/ECE 5153",
                          schemeAgencyID: "6",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      Item: [
        {
          CommodityClassification: [
            {
              ItemClassificationCode: [{ _: classification, listID: "CLASS" }],
            },
          ],
          Description: text(line.description || "Item"),
          OriginCountry: [{ IdentificationCode: text("MYS") }],
        },
      ],
      Price: [{ PriceAmount: money(unitPrice, currency) }],
    };
  });

  return {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [
      {
        ID: text(payload.invoiceNumber),
        IssueDate: text(payload.issueDate),
        IssueTime: text(issueTime),
        InvoiceTypeCode: [{ _: "01", listVersionID: "1.0" }],
        DocumentCurrencyCode: text(currency),
        TaxCurrencyCode: text(currency),
        AccountingSupplierParty: [
          {
            Party: [
              {
                IndustryClassificationCode: [{ _: msic, name: msicName }],
                PartyIdentification: [
                  ...idScheme(supplierTin, "TIN"),
                  ...(supplierId
                    ? idScheme(supplierId, supplierIdScheme)
                    : []),
                  ...idScheme(supplierSst, "SST"),
                  ...idScheme("NA", "TTX"),
                ],
                PostalAddress: [
                  {
                    CityName: text(supplierCity),
                    PostalZone: text(supplierPostcode),
                    CountrySubentityCode: text(supplierState),
                    AddressLine: [
                      { Line: text(supplierAddress.slice(0, 150)) },
                      { Line: text("-") },
                      { Line: text("-") },
                    ],
                    Country: [
                      {
                        IdentificationCode: [
                          {
                            _: "MYS",
                            listID: "ISO3166-1",
                            listAgencyID: "6",
                          },
                        ],
                      },
                    ],
                  },
                ],
                PartyLegalEntity: [
                  { RegistrationName: text(payload.supplierName) },
                ],
                Contact: [{ Telephone: text(supplierPhone) }],
              },
            ],
          },
        ],
        AccountingCustomerParty: [
          {
            Party: [
              {
                PostalAddress: [
                  {
                    CityName: text(buyerCity),
                    PostalZone: text(buyerPostcode),
                    CountrySubentityCode: text(buyerState),
                    AddressLine: [
                      { Line: text(buyerAddress.slice(0, 150)) },
                      { Line: text("-") },
                      { Line: text("-") },
                    ],
                    Country: [
                      {
                        IdentificationCode: [
                          {
                            _: "MYS",
                            listID: "ISO3166-1",
                            listAgencyID: "6",
                          },
                        ],
                      },
                    ],
                  },
                ],
                PartyLegalEntity: [{ RegistrationName: text(payload.buyerName) }],
                PartyIdentification: [
                  ...idScheme(buyerTin, "TIN"),
                  ...idScheme(buyerBrn, "BRN"),
                  ...idScheme("NA", "SST"),
                  ...idScheme("NA", "TTX"),
                ],
              },
            ],
          },
        ],
        TaxTotal: [
          {
            TaxAmount: money(taxAmount, currency),
            TaxSubtotal: [
              {
                TaxableAmount: money(taxableBase, currency),
                TaxAmount: money(taxAmount, currency),
                TaxCategory: [
                  {
                    ID: text(taxCategoryId),
                    TaxScheme: [
                      {
                        ID: [
                          {
                            _: "OTH",
                            schemeID: "UN/ECE 5153",
                            schemeAgencyID: "6",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        LegalMonetaryTotal: [
          {
            LineExtensionAmount: money(taxableBase, currency),
            TaxExclusiveAmount: money(taxExclusive, currency),
            TaxInclusiveAmount: money(total, currency),
            PayableAmount: money(total, currency),
          },
        ],
        InvoiceLine: invoiceLines,
      },
    ],
  };
}
