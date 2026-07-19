"use client";

import { useRouter } from "next/navigation";
import { tagVariant } from "@/components/admin/tag-variant";
import { Tag } from "@/components/ui/tag";

type Hit = {
  slug: string;
  kind: string;
  name: string;
  country: string | null;
  tags: string[];
};

export function EntityResultRows({ hits }: { hits: Hit[] }) {
  const router = useRouter();

  return (
    <tbody>
      {hits.map((hit) => (
        <tr
          key={hit.slug}
          className="cursor-pointer"
          onClick={() => router.push(`/admin/entities/${hit.slug}`)}
        >
          <td>{hit.name}</td>
          <td className="type-data">{hit.slug}</td>
          <td>{hit.kind}</td>
          <td>{hit.country ?? ""}</td>
          <td>
            <span className="flex flex-wrap gap-1">
              {hit.tags.map((tag) => (
                <Tag key={tag} variant={tagVariant(tag)}>
                  {tag}
                </Tag>
              ))}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
