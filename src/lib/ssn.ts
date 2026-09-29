import type { FoodProduct } from "./off";

export type SsnCeliacStatus = "yes" | "verify";

export interface SsnCeliacAssessment {
  status: SsnCeliacStatus;
  title: string;
  detail: string;
}

const STRONG_MARKERS = [
  /ssn[-_: ]?erogabile/i,
  /erogabile.*ssn/i,
  /registro[-_: ]?nazionale/i,
  /specificamente[-_: ]?formulat[oa].*celiac/i,
  /bollino[-_: ]?verde.*ssn/i,
];

export function assessSsnCeliac(product: FoodProduct): SsnCeliacAssessment {
  const text = [
    product.name,
    product.brand,
    product.ingredientsText,
    ...product.labelTags,
  ].join(" ");

  if (STRONG_MARKERS.some((pattern) => pattern.test(text))) {
    return {
      status: "yes",
      title: "Erogabile SSN",
      detail: "La confezione o i dati prodotto contengono un riferimento esplicito all'erogabilita per celiachia.",
    };
  }

  return {
    status: "verify",
    title: "Da verificare nel Registro SSN",
    detail: "Non vedo un riferimento esplicito sufficiente. Il controllo definitivo va fatto sul Registro nazionale del Ministero della Salute.",
  };
}
