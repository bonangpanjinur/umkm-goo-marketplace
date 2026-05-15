import type { ComponentConfig } from "@measured/puck";

export type HeadingProps = {
  text: string;
  level: "h1" | "h2" | "h3";
  align: "left" | "center" | "right";
};

const sizes = { h1: "text-4xl md:text-5xl font-bold", h2: "text-3xl md:text-4xl font-bold", h3: "text-2xl font-semibold" };
const align = { left: "text-left", center: "text-center", right: "text-right" };

export const Heading: ComponentConfig<HeadingProps> = {
  fields: {
    text: { type: "text" },
    level: {
      type: "select",
      options: [
        { label: "H1", value: "h1" },
        { label: "H2", value: "h2" },
        { label: "H3", value: "h3" },
      ],
    },
    align: {
      type: "select",
      options: [
        { label: "Kiri", value: "left" },
        { label: "Tengah", value: "center" },
        { label: "Kanan", value: "right" },
      ],
    },
  },
  defaultProps: { text: "Judul Anda", level: "h2", align: "left" },
  render: ({ text, level, align: a }) => {
    const Tag = level;
    return <Tag className={`${sizes[level]} ${align[a]} my-4`}>{text}</Tag>;
  },
};
