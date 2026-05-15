import type { ComponentConfig } from "@measured/puck";

export type ImageProps = { src: string; alt: string; rounded: boolean; aspect: "auto" | "square" | "video" | "wide" };
const aspectMap = { auto: "", square: "aspect-square", video: "aspect-video", wide: "aspect-[21/9]" };

export const Image: ComponentConfig<ImageProps> = {
  fields: {
    src: { type: "text" },
    alt: { type: "text" },
    rounded: { type: "radio", options: [{ label: "Ya", value: true }, { label: "Tidak", value: false }] },
    aspect: {
      type: "select",
      options: [
        { label: "Otomatis", value: "auto" },
        { label: "Persegi", value: "square" },
        { label: "Video 16:9", value: "video" },
        { label: "Wide 21:9", value: "wide" },
      ],
    },
  },
  defaultProps: { src: "", alt: "Gambar", rounded: true, aspect: "video" },
  render: ({ src, alt, rounded, aspect }) =>
    src ? (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${aspectMap[aspect]} w-full object-cover ${rounded ? "rounded-xl" : ""} my-3`}
      />
    ) : (
      <div className={`${aspectMap[aspect]} w-full bg-muted rounded-xl my-3 grid place-items-center text-muted-foreground text-sm`}>
        Tambahkan URL gambar
      </div>
    ),
};
