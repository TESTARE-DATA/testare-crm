// Set di icone inline (stroke). Nessuna dipendenza esterna.
import type { SVGProps } from "react";

const PATHS: Record<string, string> = {
  home: "M3 11l9-8 9 8M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  dumbbell: "M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M2.5 16.5l5-5M16.5 7.5l5-5",
  layers: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
  medical: "M19 8h-2V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM12 11v6M9 14h6",
  live: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 12a7 7 0 0 1 7-7M19 12a7 7 0 0 1-7 7M8.5 8.5a5 5 0 0 0 0 7M15.5 15.5a5 5 0 0 0 0-7",
  load: "M3 3v18h18M7 16l4-6 3 4 5-8",
  chart: "M3 3v18h18M8 17V9M13 17V5M18 17v-6",
  stopwatch: "M12 13v-3M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM18 8l1.5-1.5",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  dashboard: "M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z",
  building: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01",
  chevron: "M9 18l6-6-6-6",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  pitch: "M3 5h18v14H3zM12 5v14M12 9a3 3 0 0 0 0 6M3 9h3v6H3M21 9h-3v6h3",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 0-3 3",
  trend: "M3 17l6-6 4 4 8-8M21 7h-5M21 7v5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z",
  target: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  clipboard: "M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4",
  plus: "M12 5v14M5 12h14",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  battery: "M3 8h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM22 11v2M6 11v2",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  pulse: "M3 12h3l2-6 4 12 2-6h7",
  soccer: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7l4 3-1.5 5h-5L8 10zM12 7V3M16 10l4-1.2M14.5 15l2.6 3.2M9.5 15L6.9 18.2M8 10L4 8.8",
  phone: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM10.5 5h3M12 18.2h.01",
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const d = PATHS[name] ?? PATHS.dashboard;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {d.split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={"M" + seg} />
      ))}
    </svg>
  );
}
