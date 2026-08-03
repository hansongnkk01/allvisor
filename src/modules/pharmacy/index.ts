/**
 * Pharmacy niche module — regulated retail with batch/expiry and Rx tracking.
 *
 * Distinct capabilities: batch_expiry, rx_attach (plus shared commerce pos/inventory).
 */
export const pharmacyCapabilities = ["batch_expiry", "rx_attach", "pos"] as const;
