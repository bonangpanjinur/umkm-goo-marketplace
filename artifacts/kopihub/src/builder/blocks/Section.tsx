import type { ComponentConfig, DropZone } from "@measured/puck";

export type SectionProps = {
  background: "default" | "muted" | "primary" | "card";
  paddingY: "sm" | "md" | "lg" | "xl";
  maxWidth: "narrow" | "wide" | "full";
};

const padMap = { sm: "py-6", md: "py-12", lg: "py-20", xl: "py-28" };
const bgMap = {
  default: "bg-background text-foreground",
  muted: "bg-muted text-foreground",
  primary: "bg-primary text-primary-foreground",
  card: "bg-card text-card-foreground",
};
const widthMap = { narrow: "max-w-3xl", wide: "max-w-6xl", full: "max-w-none" };

export const Section: ComponentConfig<SectionProps> = {
  fields: {
    background: {
      type: "select",
      options: [
        { label: "Default", value: "default" },
        { label: "Muted", value: "muted" },
        { label: "Primary", value: "primary" },
        { label: "Card", value: "card" },
      ],
    },
    paddingY: {
      type: "select",
      options: [
        { label: "Kecil", value: "sm" },
        { label: "Sedang", value: "md" },
        { label: "Besar", value: "lg" },
        { label: "Sangat besar", value: "xl" },
      ],
    },
    maxWidth: {
      type: "select",
      options: [
        { label: "Sempit", value: "narrow" },
        { label: "Lebar", value: "wide" },
        { label: "Penuh", value: "full" },
      ],
    },
  },
  defaultProps: { background: "default", paddingY: "md", maxWidth: "wide" },
  render: ({ background, paddingY, maxWidth }) => (
    <section className={`${bgMap[background]} ${padMap[paddingY]} px-4`}>
      <div className={`mx-auto ${widthMap[maxWidth]}`}>
        <DropZone zone="content" />
      </div>
    </section>
  ),
};
