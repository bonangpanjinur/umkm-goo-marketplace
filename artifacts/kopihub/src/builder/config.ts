import type { Config } from "@measured/puck";
import { Section, type SectionProps } from "./blocks/Section";
import { Heading, type HeadingProps } from "./blocks/Heading";
import { Text, type TextProps } from "./blocks/Text";
import { Image, type ImageProps } from "./blocks/Image";
import { Button, type ButtonProps } from "./blocks/Button";
import { MenuGrid, type MenuGridProps } from "./blocks/MenuGrid";
import { ShopInfo, type ShopInfoProps } from "./blocks/ShopInfo";
import { WhatsAppCTA, type WhatsAppCTAProps } from "./blocks/WhatsAppCTA";

export type BuilderProps = {
  Section: SectionProps;
  Heading: HeadingProps;
  Text: TextProps;
  Image: ImageProps;
  Button: ButtonProps;
  MenuGrid: MenuGridProps;
  ShopInfo: ShopInfoProps;
  WhatsAppCTA: WhatsAppCTAProps;
};

export const builderConfig: Config<BuilderProps> = {
  categories: {
    layout: { title: "Layout", components: ["Section"] },
    konten: { title: "Konten", components: ["Heading", "Text", "Image", "Button"] },
    toko: { title: "Toko", components: ["MenuGrid", "ShopInfo", "WhatsAppCTA"] },
  },
  components: {
    Section,
    Heading,
    Text,
    Image,
    Button,
    MenuGrid,
    ShopInfo,
    WhatsAppCTA,
  },
};
