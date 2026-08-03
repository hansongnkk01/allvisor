/**
 * Salon niche module — hybrid care + commerce.
 *
 * Distinct capability: commissions (hasCapability(niche, "commissions")).
 * Also uses booking (appointments, service_duration) and commerce (pos) modules.
 */
export const salonCapabilities = [
  "appointments",
  "service_duration",
  "commissions",
  "pos",
] as const;
