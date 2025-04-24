import countryCodeMapping from './data/countryCodeMapping.json';

export function getCountryNameFromCode(code) {
    if (!code) return 'Unknown';
    const match = countryCodeMapping.find(
      entry => entry.code.toLowerCase() === code.toLowerCase() && entry.active
    );
    return match?.country ?? code;
}

// Generate flag URL
export function getFlagUrl(countryCode) {
    // If the country code is missing, return the placeholder flag from the assets/images directory
    if (!countryCode) {
      console.warn("Missing country code. Using placeholder flag.")
      return "assets/images/placeholder-flag.png"
    }
    // Return the URL for the country flag using FlagCDN
    return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`
  }