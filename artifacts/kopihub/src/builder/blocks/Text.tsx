import type { ComponentConfig } from "@measured/puck";

export type TextProps = { text: string; align: "left" | "center" | "right" };
const align = { left: "text-left", center: "text-center", right: "text-right" };

export const Text: ComponentConfig<TextProps> = {
  fields: {
    text: { type: "textarea" },
    align: {
      type: "select",
      options: [
        { label: "Kiri", value: "left" },
        { label: "Tengah", value: "center" },
        { label: "Kanan", value: "right" },
      ],
    },
  },
  defaultProps: { text: "Tulis paragraf di sini.", align: "left" },
  render: ({ text, align: a }) => (
    <p className={`${align[a]} text-base leading-relaxed my-3 whitespace-pre-wrap`}>{text}</p>
  ),
};
