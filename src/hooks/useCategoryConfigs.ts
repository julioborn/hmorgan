import useSWR from "swr";

export type CategoryConfigEntry = { imageUrl?: string; imagePosition?: string };
export type CategoryConfigMap = Record<string, CategoryConfigEntry>;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCategoryConfigs(): CategoryConfigMap {
    const { data } = useSWR<Array<{ categoria: string; imageUrl?: string; imagePosition?: string }>>(
        "/api/categories/config",
        fetcher,
        { revalidateOnFocus: false }
    );
    const map: CategoryConfigMap = {};
    (data || []).forEach((c) => {
        map[c.categoria] = { imageUrl: c.imageUrl, imagePosition: c.imagePosition };
    });
    return map;
}
