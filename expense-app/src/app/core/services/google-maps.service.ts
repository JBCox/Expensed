import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, from, of, throwError, firstValueFrom } from 'rxjs';
import { map, switchMap, filter, take, timeout, catchError } from 'rxjs/operators';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distance: number; // in miles
  duration: number; // in minutes
  origin: LatLng;
  destination: LatLng;
  polyline: string;
}

// Google Maps API type definitions (minimal subset we use)
interface GoogleMapsNamespace {
  Geocoder: new () => GoogleGeocoder;
  DistanceMatrixService: new () => GoogleDistanceMatrixService;
  LatLng: new (lat: number, lng: number) => GoogleLatLng;
  TravelMode: { DRIVING: string };
  UnitSystem: { IMPERIAL: number };
  geometry: {
    spherical: {
      computeDistanceBetween: (from: GoogleLatLng, to: GoogleLatLng) => number;
    };
  };
}

interface GoogleGeocoder {
  geocode: (request: { address?: string; location?: { lat: number; lng: number } }) => Promise<GoogleGeocoderResponse>;
}

interface GoogleGeocoderResponse {
  results: {
    formatted_address: string;
    geometry: {
      location: {
        lat: () => number;
        lng: () => number;
      };
    };
  }[];
}

interface GoogleDistanceMatrixService {
  getDistanceMatrix: (request: GoogleDistanceMatrixRequest) => Promise<GoogleDistanceMatrixResponse>;
}

interface GoogleDistanceMatrixRequest {
  origins: (string | GoogleLatLng)[];
  destinations: (string | GoogleLatLng)[];
  travelMode: string;
  unitSystem: number;
}

interface GoogleDistanceMatrixResponse {
  rows: {
    elements: {
      status: string;
      distance?: { value: number; text: string };
      duration?: { value: number; text: string };
    }[];
  }[];
}

interface GoogleLatLng {
  lat: () => number;
  lng: () => number;
}

interface WindowWithGoogle extends Window {
  google?: {
    maps?: GoogleMapsNamespace;
  };
}

/**
 * Google Maps Service
 * Handles all Google Maps API interactions
 */
@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private loaderSubject = new BehaviorSubject<boolean>(false);
  private googleMaps?: GoogleMapsNamespace;

  constructor() {
    this.initLoader();
  }

  /**
   * Initialize Google Maps loader
   */
  private async initLoader(): Promise<void> {
    try {
      // Check if already loaded
      const windowWithGoogle = window as unknown as WindowWithGoogle;
      if (windowWithGoogle.google?.maps) {
        this.googleMaps = windowWithGoogle.google.maps;
        this.loaderSubject.next(true);
        return;
      }

      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMaps.apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        const win = window as unknown as WindowWithGoogle;
        this.googleMaps = win.google?.maps;
        this.loaderSubject.next(true);
      };

      script.onerror = () => {
        this.loaderSubject.next(false);
      };

      document.head.appendChild(script);
    } catch {
      this.loaderSubject.next(false);
    }
  }

  /**
   * Wait for Google Maps to be loaded (with timeout)
   */
  private waitForMaps(): Observable<GoogleMapsNamespace> {
    return this.loaderSubject.pipe(
      filter(loaded => loaded === true),
      take(1),
      timeout(10000), // 10 second timeout
      map(() => {
        if (!this.googleMaps) {
          throw new Error('Google Maps not loaded');
        }
        return this.googleMaps;
      }),
      catchError(() => {
        return throwError(() => new Error('Google Maps failed to load'));
      })
    );
  }

  /**
   * Geocode an address to coordinates
   */
  geocodeAddress(address: string): Observable<LatLng> {
    return this.waitForMaps().pipe(
      switchMap(maps => {
        const geocoder = new maps.Geocoder();
        return from(geocoder.geocode({ address }));
      }),
      map((result: GoogleGeocoderResponse) => {
        if (!result.results || result.results.length === 0) {
          throw new Error(`No results found for address: ${address}`);
        }
        const location = result.results[0].geometry.location;
        return {
          lat: location.lat(),
          lng: location.lng()
        };
      })
    );
  }

  /**
   * Reverse geocode coordinates to address
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    return this.waitForMaps().pipe(
      switchMap(maps => {
        const geocoder = new maps.Geocoder();
        return from(geocoder.geocode({ location: { lat, lng } }));
      }),
      timeout(10000), // 10 second timeout for geocoding
      map((result: GoogleGeocoderResponse) => {
        if (!result.results || result.results.length === 0) {
          throw new Error('No address found for coordinates');
        }
        return result.results[0].formatted_address;
      }),
      catchError(() => {
        // Return coordinates as fallback
        return of(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      })
    );
  }

  /**
   * Calculate distance and route between two addresses
   */
  calculateRoute(origin: string, destination: string): Observable<RouteResult> {
    return this.waitForMaps().pipe(
      switchMap(maps => {
        const service = new maps.DistanceMatrixService();
        return from(
          service.getDistanceMatrix({
            origins: [origin],
            destinations: [destination],
            travelMode: maps.TravelMode.DRIVING,
            unitSystem: maps.UnitSystem.IMPERIAL // Miles
          })
        );
      }),
      switchMap((result: GoogleDistanceMatrixResponse) => {
        if (!result.rows || !result.rows[0] || !result.rows[0].elements[0]) {
          throw new Error('Unable to calculate route');
        }

        const element = result.rows[0].elements[0];
        if (element.status !== 'OK') {
          throw new Error(`Route calculation failed: ${element.status}`);
        }

        // Get coordinates for both addresses
        return from(Promise.all([
          firstValueFrom(this.geocodeAddress(origin)),
          firstValueFrom(this.geocodeAddress(destination))
        ])).pipe(
          map(([originCoords, destCoords]) => {
            if (!originCoords || !destCoords) {
              throw new Error('Failed to geocode addresses');
            }

            return {
              distance: (element.distance?.value ?? 0) / 1609.34, // meters to miles
              duration: (element.duration?.value ?? 0) / 60, // seconds to minutes
              origin: originCoords,
              destination: destCoords,
              polyline: '' // Polyline not available from Distance Matrix API - use Directions API if needed
            };
          })
        );
      })
    );
  }

  /**
   * Calculate driving distance between two coordinate points
   * Used by Start/Stop tracking mode
   *
   * Returns actual driving distance from Google Distance Matrix API.
   * If API fails, returns 0 distance - user must fill in manually.
   *
   * If Distance Matrix API fails, check Google Cloud Console:
   * 1. Distance Matrix API must be ENABLED (separate from Maps JavaScript API)
   * 2. Billing must be enabled on the project
   * 3. API key must not have restrictions excluding Distance Matrix API
   */
  getRouteByCoords(origin: LatLng, destination: LatLng): Observable<{ distanceMiles: number; durationMinutes: number; apiSuccess: boolean }> {
    // Check if start and end are essentially the same location (within ~100 meters)
    const latDiff = Math.abs(origin.lat - destination.lat);
    const lngDiff = Math.abs(origin.lng - destination.lng);
    if (latDiff < 0.001 && lngDiff < 0.001) {
      return of({ distanceMiles: 0, durationMinutes: 0, apiSuccess: true });
    }

    return this.waitForMaps().pipe(
      switchMap(maps => {
        const service = new maps.DistanceMatrixService();
        return from(
          service.getDistanceMatrix({
            origins: [new maps.LatLng(origin.lat, origin.lng)],
            destinations: [new maps.LatLng(destination.lat, destination.lng)],
            travelMode: maps.TravelMode.DRIVING,
            unitSystem: maps.UnitSystem.IMPERIAL
          })
        );
      }),
      timeout(15000),
      map((result: GoogleDistanceMatrixResponse) => {
        if (!result.rows || !result.rows[0] || !result.rows[0].elements[0]) {
          return { distanceMiles: 0, durationMinutes: 0, apiSuccess: false };
        }

        const element = result.rows[0].elements[0];

        // Handle various API error statuses - return 0 so user fills in manually
        if (element.status === 'ZERO_RESULTS' || element.status === 'NOT_FOUND') {
          return { distanceMiles: 0, durationMinutes: 0, apiSuccess: false };
        }
        if (element.status === 'REQUEST_DENIED') {
          return { distanceMiles: 0, durationMinutes: 0, apiSuccess: false };
        }
        if (element.status === 'OVER_QUERY_LIMIT') {
          return { distanceMiles: 0, durationMinutes: 0, apiSuccess: false };
        }
        if (element.status !== 'OK') {
          return { distanceMiles: 0, durationMinutes: 0, apiSuccess: false };
        }

        const distanceMiles = Math.round(((element.distance?.value ?? 0) / 1609.34) * 100) / 100;
        const durationMinutes = Math.round((element.duration?.value ?? 0) / 60);

        return { distanceMiles, durationMinutes, apiSuccess: true };
      }),
      catchError(() => {
        // This catches network errors, timeouts, and API load failures
        return of({ distanceMiles: 0, durationMinutes: 0, apiSuccess: false });
      })
    );
  }

  /**
   * Calculate distance between two coordinates (straight line)
   */
  calculateDistance(from: LatLng, to: LatLng): number {
    if (!this.googleMaps) {
      throw new Error('Google Maps not loaded');
    }

    const fromLatLng = new this.googleMaps.LatLng(from.lat, from.lng);
    const toLatLng = new this.googleMaps.LatLng(to.lat, to.lng);

    // Returns distance in meters, convert to miles
    const distanceMeters = this.googleMaps.geometry.spherical.computeDistanceBetween(
      fromLatLng,
      toLatLng
    );

    return distanceMeters / 1609.34; // meters to miles
  }

  /**
   * Check if Google Maps is loaded
   */
  get isLoaded(): boolean {
    return this.loaderSubject.value;
  }
}
