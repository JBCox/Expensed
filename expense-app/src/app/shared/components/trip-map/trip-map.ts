import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsService } from '../../../core/services/google-maps.service';
import { TripCoordinate } from '../../../core/models/mileage.model';

export interface TripMapData {
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  coordinates?: TripCoordinate[]; // GPS tracking coordinates
}

/**
 * Trip Map Component
 * Displays Google Map with route visualization
 */
@Component({
  selector: 'app-trip-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      @if (loading()) {
        <div class="map-loading">Loading map...</div>
      }
      @if (mapError()) {
        <div class="map-error">
          <span class="error-icon">⚠️</span>
          <span>{{ mapError() }}</span>
        </div>
      }
      <div #mapElement class="map"></div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 400px;
    }

    .map {
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }

    .map-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: rgba(0, 0, 0, 0.6);
      font-size: 16px;
    }

    .map-error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #c62828;
      font-size: 14px;
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      z-index: 1;
    }

    .error-icon {
      display: block;
      font-size: 24px;
      margin-bottom: 8px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TripMap implements OnChanges {
  private googleMapsService = inject(GoogleMapsService);

  @Input() tripData?: TripMapData;
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  loading = signal(true);
  mapError = signal<string | null>(null);
  private map?: google.maps.Map;
  private directionsService?: google.maps.DirectionsService;
  private directionsRenderer?: google.maps.DirectionsRenderer;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tripData'] && this.tripData) {
      this.initMap();
    }
  }

  /**
   * Initialize Google Map
   */
  private async initMap(): Promise<void> {
    if (!this.tripData) return;

    this.mapError.set(null);

    try {
      // Wait for Google Maps to load with timeout
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        const checkInterval = setInterval(() => {
          attempts++;
          if (this.googleMapsService.isLoaded) {
            clearInterval(checkInterval);
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            reject(new Error('Google Maps failed to load'));
          }
        }, 100);
      });

      // Verify Google Maps is available on window
      const googleMaps = this.getGoogleMaps();
      if (!googleMaps) {
        throw new Error('Google Maps library not available');
      }

      const { origin, destination, coordinates } = this.tripData;

      // Create map centered between origin and destination
      const center = {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2
      };

      this.map = new googleMaps.Map(this.mapElement.nativeElement, {
        center,
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      });

      // If GPS coordinates exist, render actual tracked path
      if (coordinates && coordinates.length > 0) {
        this.renderGPSPath(coordinates);
      } else {
        // Use Directions API for estimated route
        this.renderEstimatedRoute();
      }

      this.loading.set(false);
    } catch (error) {
      this.loading.set(false);
      const message = error instanceof Error ? error.message : 'Failed to load map';
      this.mapError.set(message);
    }
  }

  /**
   * Safely get Google Maps from window object
   */
  private getGoogleMaps(): typeof google.maps | null {
    const win = window as Window & { google?: { maps?: typeof google.maps } };
    return win.google?.maps ?? null;
  }

  /**
   * Render actual GPS tracking path as polyline
   */
  private renderGPSPath(coordinates: TripCoordinate[]): void {
    if (!this.map || !this.tripData) return;

    const googleMaps = this.getGoogleMaps();
    if (!googleMaps) return;

    const { origin, destination } = this.tripData;

    // Convert coordinates to LatLng array
    const path = coordinates.map(coord => ({
      lat: coord.latitude,
      lng: coord.longitude
    }));

    // Create polyline for actual GPS path
    new googleMaps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#FF5900', // Expensed orange
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: this.map
    });

    // Add markers for origin and destination
    new googleMaps.Marker({
      position: { lat: origin.lat, lng: origin.lng },
      map: this.map,
      title: 'Start',
      label: { text: 'A', color: 'white' },
      icon: {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4CAF50',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });

    new googleMaps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map: this.map,
      title: 'End',
      label: { text: 'B', color: 'white' },
      icon: {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#F44336',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });

    // Fit bounds to show entire path
    const bounds = new googleMaps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    this.map.fitBounds(bounds);
  }

  /**
   * Render estimated route using Directions API
   */
  private renderEstimatedRoute(): void {
    if (!this.map || !this.tripData) return;

    const googleMaps = this.getGoogleMaps();
    if (!googleMaps) return;

    const { origin, destination } = this.tripData;

    // Initialize directions service and renderer
    this.directionsService = new googleMaps.DirectionsService();
    this.directionsRenderer = new googleMaps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: false
    });

    // Calculate and display route
    const request = {
      origin: new googleMaps.LatLng(origin.lat, origin.lng),
      destination: new googleMaps.LatLng(destination.lat, destination.lng),
      travelMode: googleMaps.TravelMode.DRIVING
    };

    if (!this.directionsService) return;

    this.directionsService.route(request, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
      if (status === googleMaps.DirectionsStatus.OK && result) {
        this.directionsRenderer?.setDirections(result);
      } else {
        // Fallback: Show markers without route
        this.showMarkers();
      }
    });
  }

  /**
   * Show origin and destination markers (fallback if directions fail)
   */
  private showMarkers(): void {
    if (!this.map || !this.tripData) return;

    const googleMaps = this.getGoogleMaps();
    if (!googleMaps) return;

    const { origin, destination } = this.tripData;

    new googleMaps.Marker({
      position: { lat: origin.lat, lng: origin.lng },
      map: this.map,
      title: 'Origin',
      label: 'A'
    });

    new googleMaps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map: this.map,
      title: 'Destination',
      label: 'B'
    });

    // Fit bounds to show both markers
    const bounds = new googleMaps.LatLngBounds();
    bounds.extend({ lat: origin.lat, lng: origin.lng });
    bounds.extend({ lat: destination.lat, lng: destination.lng });
    this.map.fitBounds(bounds);
  }
}
