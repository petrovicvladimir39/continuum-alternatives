import { NextResponse } from "next/server";
import { db, sql } from "@continuum/db";

export const dynamic = "force-dynamic";

/**
 * /api/serbia/entities — GeoJSON for the Serbia map.
 *
 * Every Serbian entity we can actually place (rooftop / street / city), with
 * the display fields the pins and the entity sheet need. Precision travels
 * with each feature so the map can style honestly: a city-centroid pin is
 * not the same claim as a rooftop one.
 */
export async function GET(request: Request): Promise<NextResponse> {
  // VIEWPORT-BOUNDED, ZOOM-AWARE. Shipping the whole country in one response
  // was 6.8 MB and the browser refused to cache it. tippecanoe (and therefore
  // real MVT generation) is unavailable on this box, so the equivalent win is
  // to serve only what the viewport needs: a revenue-ranked head at low zoom,
  // everything inside the bbox once zoomed in.
  const url = new URL(request.url);
  const bbox = (url.searchParams.get("bbox") ?? "")
    .split(",")
    .map((n) => Number.parseFloat(n));
  const zoom = Number.parseFloat(url.searchParams.get("z") ?? "6");
  const hasBbox = bbox.length === 4 && bbox.every((n) => Number.isFinite(n));
  const [west, south, east, north] = hasBbox ? bbox : [18.5, 41.8, 23.2, 46.3];
  // Below z9 the map is clustered anyway, so a ranked head is indistinguishable
  // on screen and a fraction of the bytes.
  // Sized to what the screen can actually show: symbol collision hides most
  // pins beyond ~1.5k in a dense city, so a bigger page is bytes with no
  // visible benefit. Panning accumulates, so coverage is not lost.
  const limit = zoom >= 11 ? 1500 : zoom >= 9 ? 1200 : 900;

  const rows = await db.execute(sql`
    SELECT
      e.id, e.name, e.slug, e.summary,
      o.logo_url, o.website, o.corporate_email, o.corporate_phone,
      o.hq_city, o.registry_id, o.tax_id, o.legal_form_native, o.legal_status,
      o.primary_role, o.founded_year,
      o.registered_address->>'street' AS street,
      o.category_fields->>'nace_code'   AS nace_code,
      o.category_fields->>'nace_label'  AS nace_label,
      o.category_fields->>'revenue_rsd' AS revenue_rsd,
      o.category_fields->>'employees'   AS employees,
      o.category_fields->'firmographics'->>'company_type'      AS company_type,
      o.category_fields->'firmographics'->>'employee_range'    AS employee_range,
      o.category_fields->'firmographics'->>'revenue_range_rsd' AS revenue_range,
      o.category_fields->'firmographics'->>'linkedin_url'      AS linkedin_url,
      o.category_fields->'nbs_banks'    AS nbs_banks,
      cls.asset_class AS l1, cls.sub_class AS l2,
      loc.lat, loc.lon, loc.precision,
      (SELECT count(*)::int FROM edges g
        WHERE g.source_entity_id = e.id AND g.edge_type = 'serviced_by') AS bank_count
    FROM entities e
    JOIN organizations o ON o.entity_id = e.id
    JOIN LATERAL (
      SELECT el.lat, el.lon, el.precision FROM entity_locations el
      WHERE el.entity_id = e.id AND el.lat IS NOT NULL
      ORDER BY CASE el.precision WHEN 'rooftop' THEN 1 WHEN 'street' THEN 2 ELSE 3 END
      LIMIT 1
    ) loc ON true
    LEFT JOIN LATERAL (
      SELECT ec.asset_class, ec.sub_class FROM entity_classifications ec
      WHERE ec.entity_id = e.id
      ORDER BY (ec.status = 'approved') DESC, ec.confidence DESC NULLS LAST LIMIT 1
    ) cls ON true
    WHERE e.country = 'RS'
      AND loc.lon BETWEEN ${west} AND ${east}
      AND loc.lat BETWEEN ${south} AND ${north}
      ${url.searchParams.get("logos") === "1" ? sql`AND o.logo_url IS NOT NULL` : sql``}
    ORDER BY (o.category_fields->>'revenue_rsd')::numeric DESC NULLS LAST
    LIMIT ${limit}
  `);

  const features = (rows.rows as Record<string, unknown>[]).map((r) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [Number(r.lon), Number(r.lat)] },
    properties: {
      id: String(r.id),
      name: String(r.name ?? ""),
      slug: String(r.slug ?? ""),
      logo: r.logo_url === null ? null : String(r.logo_url),
      l1: r.l1 === null ? "unclassified" : String(r.l1),
      l2: r.l2 === null ? null : String(r.l2),
      role: r.primary_role === null ? null : String(r.primary_role),
      city: r.hq_city === null ? null : String(r.hq_city),
      precision: String(r.precision ?? "city"),
      companyType: r.company_type === null ? null : String(r.company_type),
      employeeRange: r.employee_range === null ? null : String(r.employee_range),
      revenueRange: r.revenue_range === null ? null : String(r.revenue_range),
      revenue: r.revenue_rsd === null ? null : Number(r.revenue_rsd),
      employees: r.employees === null ? null : Number(r.employees),
      nace: r.nace_code === null ? null : `${String(r.nace_code)} — ${String(r.nace_label ?? "")}`,
      website: r.website === null ? null : String(r.website),
      email: r.corporate_email === null ? null : String(r.corporate_email),
      phone: r.corporate_phone === null ? null : String(r.corporate_phone),
      linkedin: r.linkedin_url === null ? null : String(r.linkedin_url),
      street: r.street === null ? null : String(r.street),
      mb: r.registry_id === null ? null : String(r.registry_id),
      pib: r.tax_id === null ? null : String(r.tax_id),
      legalForm: r.legal_form_native === null ? null : String(r.legal_form_native),
      status: r.legal_status === null ? null : String(r.legal_status),
      founded: r.founded_year === null ? null : Number(r.founded_year),
      // Trimmed deliberately: at 1,200 chars across ~6,700 features the
      // payload hit 9.4 MB and the browser refused to cache it
      // (ERR_CACHE_WRITE_FAILURE), so the map never received its data.
      summary: r.summary === null ? null : String(r.summary).slice(0, 260),
      banks: Array.isArray(r.nbs_banks) ? (r.nbs_banks as string[]).slice(0, 8) : [],
      bankCount: Number(r.bank_count ?? 0),
    },
  }));

  // no-store: the collection is large enough that the HTTP cache rejects the
  // write, which surfaced as a silently failed fetch rather than an error.
  return NextResponse.json(
    { type: "FeatureCollection", features },
    { headers: { "cache-control": "no-store" } },
  );
}
