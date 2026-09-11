export const pairReportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    relationshipType: { type: "string" },
    headline: { type: "string" },
    summary: { type: "string" },
    attraction: { type: "string" },
    personANeeds: { type: "string" },
    personBNeeds: { type: "string" },
    interactionCycle: { type: "string" },
    conflictPattern: { type: "string" },
    risks: {
      type: "array",
      items: { type: "string" },
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
    },
    communicationScripts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          situation: { type: "string" },
          personA: { type: "string" },
          personB: { type: "string" },
        },
        required: ["situation", "personA", "personB"],
      },
    },
  },
  required: [
    "relationshipType",
    "headline",
    "summary",
    "attraction",
    "personANeeds",
    "personBNeeds",
    "interactionCycle",
    "conflictPattern",
    "risks",
    "suggestions",
    "communicationScripts",
  ],
} as const;
