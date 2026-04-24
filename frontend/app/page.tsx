import type { Metadata } from "next"
import { PublicSiteHome } from "@/components/public-site-home"

export const metadata: Metadata = {
  title: "Inicio | Asociación de Espina Bífida",
  description:
    "Sitio de bienvenida de la Asociación de Espina Bífida. El acceso al sistema administrativo está en el panel para personal autorizado.",
}

export default function HomePage() {
  return <PublicSiteHome />
}
