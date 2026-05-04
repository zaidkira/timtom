/**
 * Utilities for interacting with the Median.co (formerly GoNative) JavaScript Bridge.
 */

export const isMedianApp = () => {
  return typeof (window as any).median !== 'undefined' || typeof (window as any).gonative !== 'undefined';
};

export const getMedian = () => {
  return (window as any).median || (window as any).gonative;
};

/**
 * Requests location permissions via the native bridge.
 * This is essential for mobile apps to trigger the native OS permission dialog.
 */
export const requestLocationPermission = () => {
  const median = getMedian();
  if (!median) return;

  console.log("Requesting location permission via Median bridge...");

  // 1. Generic permission request (newer API)
  if (median.permissions && typeof median.permissions.request === 'function') {
    median.permissions.request({ permissions: ['location'] });
  }

  // 2. Specific Geolocation request (triggers native prompt)
  if (median.geolocation && typeof median.geolocation.request === 'function') {
    median.geolocation.request();
  }

  // 3. Android-specific fallback
  if (median.android && median.android.geoLocation && typeof median.android.geoLocation.promptLocationServices === 'function') {
    median.android.geoLocation.promptLocationServices();
  } else if (median.android && median.android.geolocation && typeof median.android.geolocation.promptLocationServices === 'function') {
    // Some versions use lowercase 'l'
    median.android.geolocation.promptLocationServices();
  }
};

/**
 * Ensures location services are started and permissions are requested.
 */
export const initializeLocationServices = () => {
  if (isMedianApp()) {
    requestLocationPermission();
    
    const median = getMedian();
    // Start native geolocation if the bridge supports it
    if (median.geolocation && typeof median.geolocation.start === 'function') {
      median.geolocation.start();
    }
  }
};

/**
 * Opens the app settings in the OS, useful for prompting the user to grant denied permissions.
 */
export const openAppSettings = () => {
  const median = getMedian();
  if (median && median.open && typeof median.open.appSettings === 'function') {
    median.open.appSettings();
  }
};
