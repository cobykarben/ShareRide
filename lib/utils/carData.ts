/**
 * Car Brands and Models Data
 * 
 * This file contains standardized car brand and model data extracted from Cars.csv.
 * Used for dropdown selections in car preset forms to ensure consistency.
 * Includes default seat counts for automatic seat selection.
 */

// Car data structure: brand -> { model: defaultSeats }
export const CAR_BRANDS_AND_MODELS: Record<string, Record<string, number>> = {
  Toyota: { Corolla: 5, Camry: 5, RAV4: 5, Highlander: 7, Prius: 5, Tacoma: 5, Tundra: 5, "4Runner": 7, "Land Cruiser": 7, Sienna: 7 },
  Honda: { Civic: 5, Accord: 5, "CR-V": 5, "HR-V": 5, Pilot: 8, Odyssey: 7, Ridgeline: 5, Fit: 5 },
  Ford: { "F-150": 5, Mustang: 4, Escape: 5, Explorer: 7, Edge: 5, Bronco: 5, Ranger: 5, Expedition: 8, Focus: 5 },
  Chevrolet: { Silverado: 5, Malibu: 5, Equinox: 5, Tahoe: 7, Suburban: 8, Traverse: 7, Colorado: 5, Corvette: 2, Camaro: 4 },
  Nissan: { Altima: 5, Sentra: 5, Rogue: 5, Pathfinder: 7, Armada: 8, Frontier: 5, Maxima: 5, Versa: 5, Leaf: 5 },
  Hyundai: { Elantra: 5, Sonata: 5, Tucson: 5, "Santa Fe": 5, Palosade: 7, Kona: 5, Venue: 5, "Ioniq 5": 5, "Ioniq 6": 5 },
  Kia: { Forte: 5, Optima: 5, K5: 5, Sorento: 7, Sportage: 5, Telluride: 7, Soul: 5, EV6: 5, Niro: 5 },
  Volkswagen: { Jetta: 5, Passat: 5, Atlas: 7, Tiguan: 5, Taos: 5, Golf: 5, GTI: 5, "ID.4": 5 },
  BMW: { "3 Series": 5, "5 Series": 5, "7 Series": 5, X1: 5, X3: 5, X5: 5, X7: 7, M3: 5, M5: 5 },
  "Mercedes-Benz": { "C-Class": 5, "E-Class": 5, "S-Class": 5, GLA: 5, GLC: 5, GLE: 5, GLS: 7, "G-Class": 5 },
  Audi: { A3: 5, A4: 5, A6: 5, A8: 5, Q3: 5, Q5: 5, Q7: 7, Q8: 5, "e-tron": 5 },
  Tesla: { "Model 3": 5, "Model S": 5, "Model X": 7, "Model Y": 5, Cybertruck: 5 },
  Subaru: { Impreza: 5, Legacy: 5, Outback: 5, Forester: 5, Crosstrek: 5, Ascent: 8, BRZ: 4, WRX: 5 },
  Mazda: { Mazda3: 5, Mazda6: 5, "CX-3": 5, "CX-5": 5, "CX-30": 5, "CX-50": 5, "CX-9": 7, "MX-5 Miata": 2 },
  Lexus: { IS: 5, ES: 5, GS: 5, LS: 5, NX: 5, RX: 5, GX: 7, LX: 7 },
  Acura: { ILX: 5, TLX: 5, RDX: 5, MDX: 7, NSX: 2 },
  Jeep: { Wrangler: 5, "Grand Cherokee": 5, Cherokee: 5, Compass: 5, Renegade: 5, Gladiator: 5 },
  Ram: { 1500: 5, 2500: 5, 3500: 5, ProMaster: 2 },
  GMC: { Sierra: 5, Canyon: 5, Acadia: 7, Terrain: 5, Yukon: 7 },
  Dodge: { Charger: 5, Challenger: 5, Durango: 7, Journey: 5 },
  Chrysler: { 300: 5, Pacifica: 7, Voyager: 7 },
  Volvo: { S60: 5, S90: 5, XC40: 5, XC60: 5, XC90: 7 },
  Porsche: { 911: 4, Cayenne: 5, Macan: 5, Panamera: 4, Taycan: 4 },
  Jaguar: { XE: 5, XF: 5, "F-Pace": 5, "E-Pace": 5, "F-Type": 2 },
  "Land Rover": { "Range Rover": 7, "Range Rover Sport": 5, Discovery: 7, Defender: 5, Evoque: 5 },
  Mini: { Cooper: 4, Countryman: 5, Clubman: 5 },
  Fiat: { 500: 4, "500X": 5, "500L": 5 },
  "Alfa Romeo": { Giulia: 5, Stelvio: 5, Tonale: 5 },
  Mitsubishi: { Mirage: 5, Lancer: 5, Outlander: 7, "Eclipse Cross": 5, Pajero: 7 },
  Infiniti: { Q50: 5, Q60: 4, QX50: 5, QX60: 7, QX80: 8 },
  Genesis: { G70: 5, G80: 5, G90: 5, GV70: 5, GV80: 5 },
  Buick: { Encore: 5, Envision: 5, Enclave: 7, Regal: 5 },
  Cadillac: { CT4: 5, CT5: 5, Escalade: 7, XT4: 5, XT5: 5, XT6: 7 },
  Lincoln: { Corsair: 5, Nautilus: 5, Aviator: 7, Navigator: 8 },
};

/**
 * Get all car brands as a sorted array
 */
export function getAllBrands(): string[] {
  return Object.keys(CAR_BRANDS_AND_MODELS).sort();
}

/**
 * Get all models for a specific brand
 */
export function getModelsForBrand(brand: string): string[] {
  const brandData = CAR_BRANDS_AND_MODELS[brand];
  return brandData ? Object.keys(brandData).sort() : [];
}

/**
 * Get default seat count for a specific brand and model
 * Returns the total number of seats (including driver)
 */
export function getDefaultSeatsForModel(brand: string, model: string): number | null {
  const brandData = CAR_BRANDS_AND_MODELS[brand];
  if (!brandData) return null;
  return brandData[model] ?? null;
}

/**
 * Get available passenger seats for a model
 * Returns an array of seat numbers [2, 3, 4, ..., totalSeats]
 * Seat 1 is always the driver's seat
 */
export function getAvailableSeatsForModel(brand: string, model: string): number[] {
  const totalSeats = getDefaultSeatsForModel(brand, model);
  if (!totalSeats || totalSeats < 2) return [];
  
  // Generate array from 2 to totalSeats (seat 1 is driver)
  return Array.from({ length: totalSeats - 1 }, (_, i) => i + 2);
}

/**
 * Check if a brand exists in our data
 */
export function isValidBrand(brand: string): boolean {
  return brand in CAR_BRANDS_AND_MODELS;
}

/**
 * Check if a model exists for a specific brand
 */
export function isValidModelForBrand(brand: string, model: string): boolean {
  const brandData = CAR_BRANDS_AND_MODELS[brand];
  return brandData ? model in brandData : false;
}

