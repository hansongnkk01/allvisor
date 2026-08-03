"use client";

function openPrintPreview(title: string, body: string, width: number, height?: number) {
  const popup = window.open("", "_blank", "width=520,height=700");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${title}</title><style>
    @page{size:${width}mm ${height ? `${height}mm` : "auto"};margin:3mm}
    body{font-family:Arial,sans-serif;width:${width - 6}mm;margin:0;color:#111}
    .center{text-align:center}.line{border-top:1px dashed #333;margin:10px 0}
    .barcode{font-family:monospace;letter-spacing:3px;font-size:16px}
  </style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),150)</script></body></html>`);
  popup.document.close();
}

export function ReceiptTestButton({ width, footer }: { width: number; footer: string }) {
  return <button className="btn btn-soft" type="button" onClick={() => openPrintPreview("Receipt test", `<div class="center"><strong>ALLVISOR SHOP</strong><p>Test receipt</p></div><div class="line"></div><p>Sample item <span style="float:right">RM 12.00</span></p><div class="line"></div><p><strong>Total <span style="float:right">RM 12.00</span></strong></p><p class="center">${footer}</p>`, width)}>Test receipt print</button>;
}

export function StickerTestButton({ width, height }: { width: number; height: number }) {
  return <button className="btn btn-soft" type="button" onClick={() => openPrintPreview("Sticker test", `<div class="center"><strong>Sample Product</strong><h3>RM 12.00</h3><div class="barcode">|||| ||| ||||</div><small>9551234567890</small></div>`, width, height)}>Test sticker print</button>;
}

export function BluetoothStubButton() {
  return <button className="btn btn-ghost" type="button" onClick={() => alert("Bluetooth connection is coming. Use browser print for now.")}>Connect Bluetooth</button>;
}
