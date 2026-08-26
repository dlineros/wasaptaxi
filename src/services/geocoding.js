import { Client } from '@googlemaps/google-maps-services-js';
import { config } from '../config/env.js';

const client = new Client({});

/**
 * Convierte una dirección en texto a coordenadas (lat, lng) usando Google Maps.
 * @param {string} address
 * @returns {Promise<{ latitude: number|null, longitude: number|null, formattedAddress: string }>}
 */
export async function geocodeAddress(address) {
  if (!config.googleMapsApiKey || !address) {
    return { latitude: null, longitude: null, formattedAddress: address };
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: config.googleMapsApiKey,
        language: 'es',
        components: { country: 'CL' }, // Priorizar Chile
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    return { latitude: null, longitude: null, formattedAddress: address };
  } catch (error) {
    console.error('Error en geocoding directo:', error.message);
    return { latitude: null, longitude: null, formattedAddress: address };
  }
}

/**
 * Convierte coordenadas (lat, lng) a una dirección legible usando Google Maps Geocoding.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ formattedAddress: string }>}
 */
export async function reverseGeocode(latitude, longitude) {
  if (!config.googleMapsApiKey) {
    return { formattedAddress: `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` };
  }

  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: config.googleMapsApiKey,
        language: 'es',
        result_type: ['street_address', 'route', 'locality'],
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      return { formattedAddress: response.data.results[0].formatted_address };
    }

    return { formattedAddress: `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` };
  } catch (error) {
    console.error('Error en reverse geocoding:', error.message);
    return { formattedAddress: `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` };
  }
}

/**
 * Calcula la distancia y tiempo estimado entre dos puntos.
 * @param {object} origin - { lat, lng }
 * @param {object} destination - { lat, lng }
 * @returns {{ distance: string, duration: string } | null}
 */
export async function getDistanceAndDuration(origin, destination) {
  if (!config.googleMapsApiKey) {
    return null;
  }

  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        key: config.googleMapsApiKey,
        language: 'es',
        mode: 'driving',
      },
    });

    const element = response.data.rows[0]?.elements[0];
    if (element && element.status === 'OK') {
      return {
        distance: element.distance.text,
        duration: element.duration.text,
      };
    }

    return null;
  } catch (error) {
    console.error('Error en distance matrix:', error.message);
    return null;
  }
}
