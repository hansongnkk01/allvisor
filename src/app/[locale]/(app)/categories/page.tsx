import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { hasCapability } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { FilterableRows } from "@/components/FilterableRows";
import {
  bulkAssignProductCategoryAction,
  createProductCategoryAction,
} from "@/app/retail-actions";
import {
  deleteServiceCategoryAction,
  deleteServiceItemAction,
  isSectionUnlocked,
  upsertServiceCategoryAction,
  upsertServiceItemAction,
} from "@/app/actions";
import { SectionLockGate } from "@/components/SectionLockGate";
import { formatCurrency } from "@/lib/utils";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("RetailPages");
  const tAdmin = await getTranslations("Admin");
  const ctx = await requireOrg(locale);
  const niche = ctx.organization.niche;
  const isRetail = hasCapability(niche, "product_categories");
  // Service niches manage their menu here too (moved out of the Admin tab).
  const hasServiceMenu = hasCapability(niche, "admin");
  if (!isRetail && !hasServiceMenu) redirect({ href: "/dashboard", locale });

  // Category/service settings live behind the Manager Zone password — same
  // protection they had when they were part of the Admin tab.
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) {
    return (
      <SectionLockGate
        section="admin"
        title={t("categoriesTitle")}
        subtitle={t("categoriesSubtitle")}
      />
    );
  }

  const supabase = await createClient();
  const orgId = ctx.organization.id;

  const [
    { data: categories },
    { data: products },
    { data: serviceCategories },
    { data: serviceItems },
  ] = await Promise.all([
    isRetail
      ? supabase
          .from("product_categories")
          .select("id, name, parent_id, products(count)")
          .eq("organization_id", orgId)
          .order("name")
      : Promise.resolve({ data: null }),
    isRetail
      ? supabase
          .from("products")
          .select("id, name, sku, category_id")
          .eq("organization_id", orgId)
          .order("name")
      : Promise.resolve({ data: null }),
    hasServiceMenu
      ? supabase
          .from("service_categories")
          .select("*")
          .eq("organization_id", orgId)
          .order("name")
      : Promise.resolve({ data: null }),
    hasServiceMenu
      ? supabase
          .from("service_items")
          .select("*, service_categories(name)")
          .eq("organization_id", orgId)
          .order("name")
      : Promise.resolve({ data: null }),
  ]);
  const categoryName = new Map((categories || []).map((category) => [category.id, category.name]));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("categoriesTitle")} subtitle={t("categoriesSubtitle")} />

      {hasServiceMenu ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{tAdmin("categoriesTitle")}</h3>
            <ActionForm action={upsertServiceCategoryAction} className="stack">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.65rem",
                }}
              >
                <div className="field">
                  <label>{tAdmin("categoryName")}</label>
                  <input name="name" required className="input" />
                </div>
                <div className="field">
                  <label>{tAdmin("description")}</label>
                  <input name="description" className="input" />
                </div>
              </div>
              <button type="submit" className="btn btn-soft">
                {tAdmin("addCategory")}
              </button>
            </ActionForm>
            <FilterableRows placeholder={tAdmin("searchCategories")}>
              {(serviceCategories || []).map((c) => (
                <tr
                  key={c.id}
                  data-search={`${c.name} ${c.description || ""}`.toLowerCase()}
                >
                  <td>
                    <span className="badge">{c.name}</span>
                  </td>
                  <td>{c.description || "—"}</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteServiceCategoryAction(c.id);
                      }}
                    >
                      <button type="submit" className="btn btn-ghost">
                        {tAdmin("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </FilterableRows>
          </div>

          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{tAdmin("servicesTitle")}</h3>
            <ActionForm action={upsertServiceItemAction} className="stack">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "0.65rem",
                }}
              >
                <div className="field">
                  <label>{tAdmin("serviceName")}</label>
                  <input name="name" required className="input" />
                </div>
                <div className="field">
                  <label>{tAdmin("assignCategory")}</label>
                  <select name="category_id" required className="select" defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {(serviceCategories || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{tAdmin("price")}</label>
                  <input
                    name="unit_price"
                    type="number"
                    step="0.01"
                    defaultValue={0}
                    className="input"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-soft">
                {tAdmin("addService")}
              </button>
            </ActionForm>
            <FilterableRows placeholder={tAdmin("searchServices")}>
              {(serviceItems || []).map((s) => (
                <tr
                  key={s.id}
                  data-search={`${s.name} ${s.service_categories?.name || s.category || ""}`.toLowerCase()}
                >
                  <td>{s.name}</td>
                  <td>{s.service_categories?.name || s.category}</td>
                  <td>{formatCurrency(Number(s.unit_price || 0))}</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteServiceItemAction(s.id);
                      }}
                    >
                      <button type="submit" className="btn btn-ghost">
                        {tAdmin("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </FilterableRows>
          </div>
        </>
      ) : null}

      {isRetail ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Create category</h3>
            <ActionForm action={createProductCategoryAction} className="row" style={{ flexWrap: "wrap" }}>
              <input className="input" name="name" required placeholder="Category name" style={{ maxWidth: 260 }} />
              <select className="select" name="parent_id" defaultValue="" style={{ maxWidth: 260 }}>
                <option value="">Top-level category</option>
                {(categories || [])
                  .filter((category) => !category.parent_id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      Subcategory of {category.name}
                    </option>
                  ))}
              </select>
              <button className="btn btn-primary" type="submit">Create</button>
            </ActionForm>
          </div>

          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Categories</h3>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Name</th><th>Parent</th><th>Products</th></tr></thead>
                <tbody>
                  {(categories || []).map((category) => {
                    const countRow = Array.isArray(category.products)
                      ? category.products[0] as { count?: number } | undefined
                      : category.products as { count?: number } | null;
                    return (
                      <tr key={category.id}>
                        <td><strong>{category.name}</strong></td>
                        <td>{category.parent_id ? categoryName.get(category.parent_id) || "—" : "—"}</td>
                        <td>{countRow?.count || 0}</td>
                      </tr>
                    );
                  })}
                  {!categories?.length ? <tr><td colSpan={3} className="muted">No categories yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Bulk assign products</h3>
            <ActionForm action={bulkAssignProductCategoryAction} className="stack">
              <div className="row" style={{ flexWrap: "wrap" }}>
                <select className="select" name="category_id" defaultValue="" style={{ maxWidth: 300 }}>
                  <option value="">Uncategorized</option>
                  {(categories || []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parent_id ? `${categoryName.get(category.parent_id)} / ` : ""}{category.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary" type="submit">Assign selected</button>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Select</th><th>Product</th><th>SKU</th><th>Current category</th></tr></thead>
                  <tbody>
                    {(products || []).map((product) => (
                      <tr key={product.id}>
                        <td><input type="checkbox" name="product_ids" value={product.id} aria-label={`Select ${product.name}`} /></td>
                        <td>{product.name}</td>
                        <td>{product.sku || "—"}</td>
                        <td>{product.category_id ? categoryName.get(product.category_id) || "—" : "Uncategorized"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ActionForm>
          </div>
        </>
      ) : null}
    </div>
  );
}
