/** Later bases — laundry, physio, lab, F&B, hotel, specialty. */
export const laundryCapabilities = ["laundry_tickets", "pos"] as const;
export const physioCapabilities = ["session_packages", "appointments", "allergies"] as const;
export const labCapabilities = ["lab_results", "appointments"] as const;
export const fnbCapabilities = ["tables_kot", "pos"] as const;
export const hotelCapabilities = ["rooms"] as const;
export const specialtyCapabilities = [
  "property_listings",
  "courier_tracking",
  "project_claims",
  "bom_wip",
  "matter_billing",
  "event_timeline",
  "farm_plots",
] as const;
