/** WMO weather interpretation codes (Open-Meteo). */

export function weatherCodeLabelKey(code: number | null | undefined): string {
  if (code == null) {
    return 'weatherCodeUnknown';
  }
  if (code === 0) {
    return 'weatherCodeClear';
  }
  if (code === 1) {
    return 'weatherCodeMainlyClear';
  }
  if (code === 2) {
    return 'weatherCodePartlyCloudy';
  }
  if (code === 3) {
    return 'weatherCodeOvercast';
  }
  if (code === 45 || code === 48) {
    return 'weatherCodeFog';
  }
  if (code >= 51 && code <= 57) {
    return 'weatherCodeDrizzle';
  }
  if (code >= 61 && code <= 67) {
    return 'weatherCodeRain';
  }
  if (code >= 71 && code <= 77) {
    return 'weatherCodeSnow';
  }
  if (code >= 80 && code <= 82) {
    return 'weatherCodeShowers';
  }
  if (code >= 85 && code <= 86) {
    return 'weatherCodeSnowShowers';
  }
  if (code >= 95 && code <= 99) {
    return 'weatherCodeThunderstorm';
  }
  return 'weatherCodeUnknown';
}

export function weatherCodeEmoji(code: number | null | undefined): string {
  if (code == null) {
    return '—';
  }
  if (code === 0) {
    return '☀️';
  }
  if (code === 1) {
    return '🌤️';
  }
  if (code === 2) {
    return '⛅';
  }
  if (code === 3) {
    return '☁️';
  }
  if (code === 45 || code === 48) {
    return '🌫️';
  }
  if (code >= 51 && code <= 67) {
    return '🌧️';
  }
  if (code >= 71 && code <= 77) {
    return '❄️';
  }
  if (code >= 80 && code <= 82) {
    return '🌦️';
  }
  if (code >= 85 && code <= 86) {
    return '🌨️';
  }
  if (code >= 95) {
    return '⛈️';
  }
  return '🌡️';
}
