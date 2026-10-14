import { createFileRoute } from "@tanstack/react-router";
import { OrbitExperience } from "@/components/orbit/OrbitExperience";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ORBIT — Beyond the familiar" },
      { name: "description", content: "A scroll-driven 3D journey from Earth past the Moon, through an asteroid field and Saturn's rings to a distant galaxy." },
      { property: "og:title", content: "ORBIT — Beyond the familiar" },
      { property: "og:description", content: "Scroll through space: Earth, the Moon, the asteroid belt, Saturn and a distant galaxy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbitExperience,
});
