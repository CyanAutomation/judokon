export interface Judoka {
  id: string; // Unique identifier for the judoka
  name: string; // First name of the judoka
  surname: string; // Last name of the judoka
  country: string; // Country code (e.g., "JP" for Japan)
  weightClass: string; // Weight class (e.g., "-52kg")
  stats: {
    power: number; // Power rating (1-10)
    speed: number; // Speed rating (1-10)
    technique: number; // Technique rating (1-10)
    kumiKata: number; // Grip fighting rating (1-10)
    neWaza: number; // Groundwork rating (1-10)
  };
  signatureMoveId?: string; // Optional ID of the judoka's signature move
  lastUpdated?: string | Date; // Can be a string (from JSON) or a Date object
}

export interface GokyoEntry {
  id: string; // Unique identifier for the technique
  name: string; // Name of the technique (e.g., "Uchi Mata")
}

export type JudokaCard = {
  judoka: Judoka; // The judoka displayed on the card
  signatureMove: string; // The name of the signature move
};

export interface CountryCodeEntry {
  code: string;
  name: string;
}