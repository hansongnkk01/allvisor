import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { savePrintSettingsAction } from "@/app/retail-actions";
import { BluetoothStubButton, ReceiptTestButton, StickerTestButton } from "@/components/PrinterTestButtons";

type ReceiptDesign = { widthMm?: number; showLogo?: boolean; showAddress?: boolean; footer?: string };
type StickerDesign = { widthMm?: number; heightMm?: number; showName?: boolean; showPrice?: boolean; showBarcode?: boolean };

export default async function PrintersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("RetailPages");
  const ctx = await requireOrg(locale);
  if (ctx.organization.niche !== "retail") redirect({ href: "/dashboard", locale });
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("print_settings")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  const receipt = (settings?.receipt_design || {}) as ReceiptDesign;
  const sticker = (settings?.sticker_design || {}) as StickerDesign;
  const receiptWidth = Number(receipt.widthMm || 80);
  const stickerWidth = Number(sticker.widthMm || 40);
  const stickerHeight = Number(sticker.heightMm || 30);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("printersTitle")} subtitle={t("printersSubtitle")} />
      <ActionForm action={savePrintSettingsAction} className="stack">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
          <div className="surface stack" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Receipt printer</h3>
            <input className="input" name="receipt_printer_name" defaultValue={settings?.receipt_printer_name || ""} placeholder="Printer name" />
            <select className="select" name="receipt_connection" defaultValue={settings?.receipt_connection || "browser"}>
              <option value="browser">Browser print</option><option value="bluetooth">Bluetooth</option><option value="usb">USB</option>
            </select>
            <div className="field"><label>Paper width (mm)</label><input className="input" name="receipt_width" type="number" min="40" max="120" defaultValue={receiptWidth} /></div>
            <label className="row"><input type="checkbox" name="receipt_show_logo" defaultChecked={receipt.showLogo !== false} /> Show logo</label>
            <label className="row"><input type="checkbox" name="receipt_show_address" defaultChecked={receipt.showAddress !== false} /> Show address</label>
            <div className="field"><label>Footer</label><input className="input" name="receipt_footer" defaultValue={receipt.footer || "Thank you"} /></div>
            <div className="row"><ReceiptTestButton width={receiptWidth} footer={receipt.footer || "Thank you"} /><BluetoothStubButton /></div>
          </div>
          <div className="surface stack" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Sticker printer</h3>
            <input className="input" name="sticker_printer_name" defaultValue={settings?.sticker_printer_name || ""} placeholder="Printer name" />
            <select className="select" name="sticker_connection" defaultValue={settings?.sticker_connection || "browser"}>
              <option value="browser">Browser print</option><option value="bluetooth">Bluetooth</option><option value="usb">USB</option>
            </select>
            <div className="row"><div className="field"><label>Width (mm)</label><input className="input" name="sticker_width" type="number" min="20" max="100" defaultValue={stickerWidth} /></div><div className="field"><label>Height (mm)</label><input className="input" name="sticker_height" type="number" min="10" max="100" defaultValue={stickerHeight} /></div></div>
            <label className="row"><input type="checkbox" name="sticker_show_name" defaultChecked={sticker.showName !== false} /> Product name</label>
            <label className="row"><input type="checkbox" name="sticker_show_price" defaultChecked={sticker.showPrice !== false} /> Price</label>
            <label className="row"><input type="checkbox" name="sticker_show_barcode" defaultChecked={sticker.showBarcode !== false} /> Barcode text</label>
            <div style={{ width: `${stickerWidth}mm`, minHeight: `${stickerHeight}mm`, border: "1px dashed var(--line)", padding: 8, textAlign: "center", background: "white", color: "#111" }}>
              {sticker.showName !== false ? <strong>Sample Product</strong> : null}
              {sticker.showPrice !== false ? <div>RM 12.00</div> : null}
              {sticker.showBarcode !== false ? <div style={{ fontFamily: "monospace", marginTop: 4 }}>9551234567890</div> : null}
            </div>
            <div className="row"><StickerTestButton width={stickerWidth} height={stickerHeight} /><BluetoothStubButton /></div>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: "start" }}>Save printer settings</button>
      </ActionForm>
    </div>
  );
}
