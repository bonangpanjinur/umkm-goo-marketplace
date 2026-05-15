import type { ComponentConfig } from "@measured/puck";

export type ButtonProps = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "outline";
  align: "left" | "center" | "right";
};

const align = { left: "justify-start", center: "justify-center", right: "justify-end" };
const variants = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
};

export const Button: ComponentConfig<ButtonProps> = {
  fields: {
    label: { type: "text" },
    href: { type: "text" },
    variant: {
      type: "select",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Outline", value: "outline" },
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
  defaultProps: { label: "Klik di sini", href: "#", variant: "primary", align: "left" },
  render: ({ label, href, variant, align: a }) => (
    <div className={`flex ${align[a]} my-3`}>
      <a
        href={href}
        className={`${variants[variant]} inline-flex items-center px-5 py-2.5 rounded-lg font-medium text-sm transition`}
      >
        {label}
      </a>
    </div>
  ),
};
