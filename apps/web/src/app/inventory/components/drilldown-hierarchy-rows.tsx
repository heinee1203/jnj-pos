"use client";

import { useMemo } from "react";
import { Car, Tag } from "lucide-react";
import {
  useGroupedCounts,
  type BrandCountRow,
  type MakeCountRow,
} from "@/hooks/use-grouped-counts";
import { DrilldownGroupRow } from "./drilldown-group-row";
import { DrilldownItemsTable, DrilldownLoadingRow } from "./drilldown-items-table";

const NONE = "__none__";

function sortNullLast<T extends { id?: string | null; name?: string; make?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aNull = a.id === null || a.id === NONE || a.make === NONE;
    const bNull = b.id === null || b.id === NONE || b.make === NONE;
    if (aNull && !bNull) return 1;
    if (!aNull && bNull) return -1;
    return 0;
  });
}

type MakeRowsProps = {
  token: string;
  locationId: string;
  categoryId: string;
  brandId: string;
  brandKey: string;
  stockStatus?: string;
  showFinancials: boolean;
  onSelectProduct: (id: string) => void;
  colCount: number;
  expandedMakes: Set<string>;
  onToggleMake: (key: string) => void;
  allLocations?: boolean;
};

function MakeRows({
  token,
  locationId,
  categoryId,
  brandId,
  brandKey,
  stockStatus,
  showFinancials,
  onSelectProduct,
  colCount,
  expandedMakes,
  onToggleMake,
  allLocations,
}: MakeRowsProps) {
  const { data, isLoading } = useGroupedCounts<MakeCountRow>(
    token,
    locationId,
    "vehicleMake",
    {
      categoryId,
      brandId,
      stockStatus,
      allLocations,
    },
    { enabled: true },
  );

  const rows = useMemo(() => {
    if (!data?.data) return [];
    return [...data.data].sort((a, b) => {
      const aNull = a.make === NONE || a.make === "";
      const bNull = b.make === NONE || b.make === "";
      if (aNull && !bNull) return 1;
      if (!aNull && bNull) return -1;
      return 0;
    });
  }, [data]);

  if (isLoading) return <DrilldownLoadingRow colCount={colCount} />;

  return (
    <>
      {rows.map((row) => {
        const makeKey = `${brandKey}:${row.make || NONE}`;
        const isExpanded = expandedMakes.has(makeKey);
        const name = !row.make || row.make === NONE ? "Universal / No Make" : row.make;

        return (
          <MakeRowWithItems
            key={makeKey}
            name={name}
            itemCount={row.itemCount}
            isExpanded={isExpanded}
            onToggle={() => onToggleMake(makeKey)}
            token={token}
            locationId={locationId}
            categoryId={categoryId}
            brandId={brandId}
            vehicleMake={row.make || undefined}
            stockStatus={stockStatus}
            showFinancials={showFinancials}
            onSelectProduct={onSelectProduct}
            colCount={colCount}
            allLocations={allLocations}
          />
        );
      })}
    </>
  );
}

type MakeRowWithItemsProps = {
  name: string;
  itemCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  token: string;
  locationId: string;
  categoryId?: string;
  brandId?: string;
  vehicleMake?: string;
  stockStatus?: string;
  showFinancials: boolean;
  onSelectProduct: (id: string) => void;
  colCount: number;
  allLocations?: boolean;
};

function MakeRowWithItems({
  name,
  itemCount,
  isExpanded,
  onToggle,
  token,
  locationId,
  categoryId,
  brandId,
  vehicleMake,
  stockStatus,
  showFinancials,
  onSelectProduct,
  colCount,
  allLocations,
}: MakeRowWithItemsProps) {
  return (
    <>
      <DrilldownGroupRow
        colCount={colCount}
        icon={<Car size={11} className="shrink-0 text-muted-foreground" />}
        indentPx={60}
        isExpanded={isExpanded}
        meta={`${itemCount} items`}
        name={name}
        onToggle={onToggle}
        rowClassName="hover:bg-accent/50"
        titleClassName="text-[12px]"
      />
      {isExpanded && (
        <DrilldownItemsTable
          token={token}
          locationId={locationId}
          categoryId={categoryId}
          brandId={brandId}
          vehicleMake={vehicleMake}
          stockStatus={stockStatus}
          showFinancials={showFinancials}
          onSelectProduct={onSelectProduct}
          colCount={colCount}
          allLocations={allLocations}
        />
      )}
    </>
  );
}

type BrandRowsProps = {
  token: string;
  locationId: string;
  categoryId: string;
  catKey: string;
  stockStatus?: string;
  showFinancials: boolean;
  onSelectProduct: (id: string) => void;
  colCount: number;
  expandedBrands: Set<string>;
  expandedMakes: Set<string>;
  onToggleBrand: (key: string) => void;
  onToggleMake: (key: string) => void;
  allLocations?: boolean;
};

function BrandRows({
  token,
  locationId,
  categoryId,
  catKey,
  stockStatus,
  showFinancials,
  onSelectProduct,
  colCount,
  expandedBrands,
  expandedMakes,
  onToggleBrand,
  onToggleMake,
  allLocations,
}: BrandRowsProps) {
  const { data, isLoading } = useGroupedCounts<BrandCountRow>(
    token,
    locationId,
    "brand",
    {
      categoryId,
      stockStatus,
      allLocations,
    },
    { enabled: true },
  );

  const rows = useMemo(() => sortNullLast(data?.data ?? []), [data]);

  if (isLoading) return <DrilldownLoadingRow colCount={colCount} />;

  return (
    <>
      {rows.map((row) => {
        const brandId = row.id ?? NONE;
        const brandKey = `${catKey}:${brandId}`;
        const isExpanded = expandedBrands.has(brandKey);
        const name = row.id ? row.name : "No Brand";

        return (
          <BrandRowWithChildren
            key={brandKey}
            brandKey={brandKey}
            name={name}
            itemCount={row.itemCount}
            makeCount={row.makeCount}
            isExpanded={isExpanded}
            onToggle={() => onToggleBrand(brandKey)}
            token={token}
            locationId={locationId}
            categoryId={categoryId}
            brandId={brandId}
            stockStatus={stockStatus}
            showFinancials={showFinancials}
            onSelectProduct={onSelectProduct}
            colCount={colCount}
            expandedMakes={expandedMakes}
            onToggleMake={onToggleMake}
            allLocations={allLocations}
          />
        );
      })}
    </>
  );
}

type BrandRowWithChildrenProps = {
  brandKey: string;
  name: string;
  itemCount: number;
  makeCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  token: string;
  locationId: string;
  categoryId: string;
  brandId: string;
  stockStatus?: string;
  showFinancials: boolean;
  onSelectProduct: (id: string) => void;
  colCount: number;
  expandedMakes: Set<string>;
  onToggleMake: (key: string) => void;
  allLocations?: boolean;
};

function BrandRowWithChildren({
  brandKey,
  name,
  itemCount,
  makeCount,
  isExpanded,
  onToggle,
  token,
  locationId,
  categoryId,
  brandId,
  stockStatus,
  showFinancials,
  onSelectProduct,
  colCount,
  expandedMakes,
  onToggleMake,
  allLocations,
}: BrandRowWithChildrenProps) {
  return (
    <>
      <DrilldownGroupRow
        colCount={colCount}
        icon={<Tag size={11} className="shrink-0 text-muted-foreground" />}
        indentPx={36}
        isExpanded={isExpanded}
        meta={`${itemCount} items · ${makeCount} makes`}
        name={name}
        onToggle={onToggle}
        rowClassName="bg-muted/10 hover:bg-muted/20"
        titleClassName="text-[12px]"
      />
      {isExpanded && (
        <MakeRows
          token={token}
          locationId={locationId}
          categoryId={categoryId}
          brandId={brandId}
          brandKey={brandKey}
          stockStatus={stockStatus}
          showFinancials={showFinancials}
          onSelectProduct={onSelectProduct}
          colCount={colCount}
          expandedMakes={expandedMakes}
          onToggleMake={onToggleMake}
          allLocations={allLocations}
        />
      )}
    </>
  );
}

export type DrilldownCategoryRowProps = {
  catKey: string;
  name: string;
  color: string | null;
  itemCount: number;
  brandCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  token: string;
  locationId: string;
  categoryId: string;
  stockStatus?: string;
  showFinancials: boolean;
  onSelectProduct: (id: string) => void;
  colCount: number;
  expandedBrands: Set<string>;
  expandedMakes: Set<string>;
  onToggleBrand: (key: string) => void;
  onToggleMake: (key: string) => void;
  allLocations?: boolean;
};

export function DrilldownCategoryRow({
  catKey,
  name,
  color,
  itemCount,
  brandCount,
  isExpanded,
  onToggle,
  token,
  locationId,
  categoryId,
  stockStatus,
  showFinancials,
  onSelectProduct,
  colCount,
  expandedBrands,
  expandedMakes,
  onToggleBrand,
  onToggleMake,
  allLocations,
}: DrilldownCategoryRowProps) {
  return (
    <>
      <DrilldownGroupRow
        colCount={colCount}
        icon={
          color ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
          ) : (
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/30" />
          )
        }
        indentPx={12}
        isExpanded={isExpanded}
        meta={`${itemCount} items · ${brandCount} brands`}
        name={name}
        onToggle={onToggle}
        rowClassName="bg-muted/30 hover:bg-muted/50"
        titleClassName="text-[13px] font-semibold"
      />
      {isExpanded && (
        <BrandRows
          token={token}
          locationId={locationId}
          categoryId={categoryId}
          catKey={catKey}
          stockStatus={stockStatus}
          showFinancials={showFinancials}
          onSelectProduct={onSelectProduct}
          colCount={colCount}
          expandedBrands={expandedBrands}
          expandedMakes={expandedMakes}
          onToggleBrand={onToggleBrand}
          onToggleMake={onToggleMake}
          allLocations={allLocations}
        />
      )}
    </>
  );
}
