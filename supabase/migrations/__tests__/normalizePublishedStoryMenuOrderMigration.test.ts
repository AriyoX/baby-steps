import { readFileSync } from "fs"
import path from "path"

describe("published story menu order migration", () => {
  const sql = readFileSync(
    path.join(
      __dirname,
      "..",
      "20260714213732_normalize_published_story_menu_order.sql",
    ),
    "utf8",
  )
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

  it("preserves array order, keeps existing explicit values, and bumps the cache version", () => {
    expect(sql).toContain("with ordinality as card(value, ordinality)")
    expect(sql).toContain("and not card.value ? 'order'")
    expect(sql).toContain(
      "card.value || jsonb_build_object('order', card.ordinality::integer)",
    )
    expect(sql).toContain("order by card.ordinality")
    expect(sql).toContain(
      "content_version = content_item.content_version + 1",
    )
    expect(sql).toContain(
      "content_item.payload is distinct from normalized_story_menu.normalized_payload",
    )
  })

  it("only targets story child-menu rows with a cards array", () => {
    expect(sql).toContain("content_item.content_type = 'child_menu'")
    expect(sql).toContain("content_item.slug = 'stories'")
    expect(sql).toContain(
      "jsonb_typeof(content_item.payload -> 'cards') = 'array'",
    )
  })
})
