import { z } from "zod";

/**
 * Schema dei campi estratti dall'analisi AI e modificabili dal sales.
 * E' la "forma" della scheda lead prima dell'invio a Salesforce.
 */
export const leadFieldsSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  leadSource: z.string().nullable().optional(),
  rating: z.enum(["Hot", "Warm", "Cold"]).nullable().optional(),
  estimatedValue: z.string().nullable().optional(),
  nextStep: z.string().nullable().optional(),
  aiSummary: z.string().nullable().optional()
});

export type LeadFields = z.infer<typeof leadFieldsSchema>;

export const saveLeadSchema = leadFieldsSchema.extend({
  textNotes: z.string().nullable().optional(),
  audioTranscript: z.string().nullable().optional(),
  rawOcr: z.string().nullable().optional(),
  cardImageRef: z.string().nullable().optional()
});

export type SaveLeadInput = z.infer<typeof saveLeadSchema>;
