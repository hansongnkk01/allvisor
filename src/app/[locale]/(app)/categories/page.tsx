import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { hasCapability } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  bulkAssignProductCategoryAction,
  createProductCategoryAction,
} from "@/app/retail-actions";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("RetailPages");
  const ctx = await requireOrg(locale);
  if (!hasCapability(ctx.organization.niche, "product_categories")) redirect({ href: "/dashboard", locale });
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name, parent_id, products(count)")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
    supabase
      .from("products")
      .select("id, name, sku, category_id")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
  ]);
  const categoryName = new Map((categories || []).map((category) => [category.id, category.name]));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("categoriesTitle")} subtitle={t("categoriesSubtitle")} />
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
    </div>
  );
}
